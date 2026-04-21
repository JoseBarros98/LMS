from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from core.access import has_any_role_permission, has_role_permission, is_admin_user
from core.api_permissions import RoleActionPermission
from .models import Ticket, TicketCategory, TicketResponse
from .serializers import (
    TicketCategorySerializer, TicketSerializer, TicketCreateSerializer, TicketUpdateSerializer,
    TicketResponseSerializer, TicketResponseCreateSerializer, NotificationSerializer,
    NotificationSendSerializer,
)
from .services import (
    notify_enrollment_expiry,
    notify_installment_due,
    notify_manual,
    notify_ticket_created,
    notify_ticket_responded,
    notify_ticket_status_changed,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def category_list(request):
    """
    Vista simple para listar categorías
    """
    try:
        if not has_role_permission(request.user, 'categories', 'read'):
            return Response({'detail': 'No tienes permisos para ver categorias.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = TicketCategory.objects.order_by('order', 'name')
        include_inactive = str(request.query_params.get('include_inactive', '')).lower() in {'1', 'true', 'yes'}
        is_admin = is_admin_user(request.user)

        if not (is_admin and include_inactive):
            queryset = queryset.filter(status=TicketCategory.STATUS_ACTIVE)

        categories = queryset
        serializer = TicketCategorySerializer(categories, many=True)
        return Response(serializer.data)
    except Exception as e:
        print(f"Error in category_list: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ticket_list(request):
    """
    Vista simple para listar tickets
    """
    try:
        user = request.user
        if not user or not user.role:
            return Response([])

        if not has_any_role_permission(user, 'tickets', ['read', 'read_own']):
            return Response({'detail': 'No tienes permisos para ver tickets.'}, status=status.HTTP_403_FORBIDDEN)
        
        if has_role_permission(user, 'tickets', 'read'):
            tickets = Ticket.objects.select_related('user', 'assigned_to', 'category').all()
        else:
            tickets = Ticket.objects.filter(user=user).select_related('user', 'assigned_to', 'category')
        
        serializer = TicketSerializer(tickets, many=True)
        return Response(serializer.data)
    except Exception as e:
        print(f"Error in ticket_list: {e}")
        return Response({'error': str(e)}, status=500)


class TicketCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar categorías de tickets (solo administradores)
    """
    queryset = TicketCategory.objects.all()
    serializer_class = TicketCategorySerializer
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'categories'
    
    def get_queryset(self):
        queryset = TicketCategory.objects.order_by('order', 'name')

        # Para acciones de escritura sobre un objeto concreto, no filtrar por estado
        # (una categoría inactiva debe poder ser editada/reactivada)
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return queryset

        include_inactive = str(self.request.query_params.get('include_inactive', '')).lower() in {'1', 'true', 'yes'}
        is_admin = is_admin_user(self.request.user)

        if is_admin and include_inactive:
            return queryset

        return queryset.filter(status=TicketCategory.STATUS_ACTIVE)
    
    def list(self, request):
        """
        Listar categorías - sobreescribe el método list por defecto
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()

        if category.status != TicketCategory.STATUS_INACTIVE:
            category.status = TicketCategory.STATUS_INACTIVE
            category.save()

        serializer = self.get_serializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar tickets de soporte
    - Usuarios: pueden crear y ver sus tickets
    - Admins: pueden ver y gestionar todos los tickets
    """
    permission_classes = [IsAuthenticated, RoleActionPermission]
    permission_resource = 'tickets'
    permission_action_map = {
        'list': ['read', 'read_own'],
        'retrieve': ['read', 'read_own'],
        'create': 'create',
        'update': ['update', 'update_own', 'change_status'],
        'partial_update': ['update', 'update_own', 'change_status'],
        'destroy': ['delete', 'delete_own'],
        'respond': 'respond',
        'responses': ['read', 'read_own'],
        'assign': ['change_status', 'update'],
        'close': ['change_status', 'update'],
    }
    
    def get_queryset(self):
        user = self.request.user
        if not user or not user.role:
            return Ticket.objects.none()

        action = getattr(self, 'action', None)

        if action in ['update', 'partial_update']:
            if has_any_role_permission(user, 'tickets', ['update', 'change_status']):
                return Ticket.objects.select_related('user', 'assigned_to', 'category').all()
            
            if has_role_permission(user, 'tickets', 'update_own'):
                return Ticket.objects.filter(user=user).select_related('user', 'assigned_to', 'category')
            
            return Ticket.objects.none()

        if action == 'destroy':
            if has_role_permission(user, 'tickets', 'delete'):
                return Ticket.objects.select_related('user', 'assigned_to', 'category').all()

            if has_role_permission(user, 'tickets', 'delete_own'):
                return Ticket.objects.filter(user=user).select_related('user', 'assigned_to', 'category')
            
            return Ticket.objects.none()
            
        # Admins ven todos los tickets
        if has_role_permission(user, 'tickets', 'read'):
            return Ticket.objects.select_related('user', 'assigned_to', 'category').all()
        
        # Usuarios ven solo sus tickets
        if has_role_permission(user, 'tickets', 'read_own'):
            return Ticket.objects.filter(
                user=user
            ).select_related('user', 'assigned_to', 'category')
        
        return Ticket.objects.none()
    
    def list(self, request):
        """
        Listar tickets - sobreescribe el método list por defecto
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TicketCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TicketUpdateSerializer
        return TicketSerializer
    
    def perform_create(self, serializer):
        ticket = serializer.save()
        notify_ticket_created(ticket, self.request.user)

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        ticket = serializer.save()
        notify_ticket_status_changed(ticket, previous_status, ticket.status, self.request.user)
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Añadir respuesta a un ticket"""
        ticket = self.get_object()
        
        # Verificar permisos: usuario dueño o admin
        if (ticket.user != request.user and 
            not has_role_permission(request.user, 'tickets', 'read')):
            return Response(
                {'error': 'No tienes permisos para responder este ticket'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TicketResponseCreateSerializer(
            data=request.data,
            context={'request': request, 'ticket_id': ticket.id}
        )
        
        if serializer.is_valid():
            response = serializer.save()
            notify_ticket_responded(ticket, response, request.user)
            
            # Si es respuesta de admin y el ticket estaba abierto, cambiar estado
            if response.is_admin_response and ticket.status == 'open' and has_role_permission(request.user, 'tickets', 'update'):
                previous_status = ticket.status
                ticket.status = 'in_progress'
                ticket.save()
                notify_ticket_status_changed(ticket, previous_status, ticket.status, request.user)
            
            # Serializar y devolver respuesta
            response_serializer = TicketResponseSerializer(response)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def responses(self, request, pk=None):
        """Obtener todas las respuestas de un ticket"""
        ticket = self.get_object()
        
        # Verificar permisos
        if (ticket.user != request.user and 
            not has_role_permission(request.user, 'tickets', 'read')):
            return Response(
                {'error': 'No tienes permisos para ver este ticket'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        responses = ticket.responses.select_related('user').all()
        serializer = TicketResponseSerializer(responses, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def assign(self, request, pk=None):
        """Asignar ticket a un administrador (solo admins)"""
        if not has_role_permission(request.user, 'tickets', 'update'):
            return Response(
                {'error': 'No tienes permisos para asignar tickets'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        ticket = self.get_object()
        if ticket.status in {'resolved', 'closed'}:
            return Response(
                {'error': 'Este ticket no se puede editar porque ya fue marcado como resuelto o cerrado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        assigned_to_id = request.data.get('assigned_to')
        
        if assigned_to_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                assigned_user = User.objects.get(
                    id=assigned_to_id, 
                    role__name__iexact='administrador'
                )
                ticket.assigned_to = assigned_user
                previous_status = ticket.status
                ticket.status = 'in_progress'
                ticket.save()
                notify_ticket_status_changed(ticket, previous_status, ticket.status, request.user)
                
                serializer = self.get_serializer(ticket)
                return Response(serializer.data)
            except User.DoesNotExist:
                return Response(
                    {'error': 'El usuario asignado debe ser un administrador'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(
            {'error': 'Debe especificar un usuario para asignar'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['patch'])
    def close(self, request, pk=None):
        """Cerrar un ticket (solo admins)"""
        if not has_role_permission(request.user, 'tickets', 'update'):
            return Response(
                {'error': 'No tienes permisos para cerrar tickets'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        ticket = self.get_object()
        if ticket.status in {'resolved', 'closed'}:
            return Response(
                {'error': 'Este ticket no se puede editar porque ya fue marcado como resuelto o cerrado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        previous_status = ticket.status
        ticket.status = 'closed'
        ticket.resolved_at = timezone.now()
        ticket.save()
        notify_ticket_status_changed(ticket, previous_status, ticket.status, request.user)
        
        serializer = self.get_serializer(ticket)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            self.request.user.notifications
            .select_related('ticket', 'recipient')
            .all()
        )

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])

        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'detail': 'ok'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def send(self, request):
        if not has_role_permission(request.user, 'notifications', 'create') and not is_admin_user(request.user):
            return Response({'detail': 'No tienes permisos para enviar notificaciones.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = NotificationSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        target_mode = validated['target_mode']
        recipients = []

        if target_mode == NotificationSendSerializer.TARGET_USER:
            recipients = [validated['target_user']]

        elif target_mode == NotificationSendSerializer.TARGET_ROLES:
            role_ids = list(validated['target_roles'].values_list('id', flat=True))
            from core.models import User
            recipients = list(
                User.objects.filter(
                    role_id__in=role_ids,
                    is_active=True,
                )
                .exclude(id=request.user.id)
                .distinct()
            )

        elif target_mode == NotificationSendSerializer.TARGET_ALL_STUDENTS:
            from core.models import User
            recipients = list(
                User.objects.filter(
                    role__name__iexact='estudiante',
                    is_active=True,
                )
                .exclude(id=request.user.id)
            )

        sent_count = notify_manual(
            recipients=recipients,
            title=validated['title'],
            message=validated['message'],
            status_tag=validated.get('status_tag'),
        )

        return Response(
            {
                'detail': 'Notificaciones enviadas.',
                'sent_count': sent_count,
                'target_mode': target_mode,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'])
    def process_automatic(self, request):
        if not has_role_permission(request.user, 'notifications', 'create') and not is_admin_user(request.user):
            return Response({'detail': 'No tienes permisos para ejecutar este proceso.'}, status=status.HTTP_403_FORBIDDEN)

        enrollment_days_before = int(request.data.get('enrollment_days_before', 7))
        installment_days_before = int(request.data.get('installment_days_before', 3))

        enrollment_created = notify_enrollment_expiry(days_before=enrollment_days_before)
        installment_created = notify_installment_due(days_before=installment_days_before)

        return Response(
            {
                'detail': 'Proceso de notificaciones automaticas ejecutado.',
                'enrollment_notifications_created': enrollment_created,
                'installment_notifications_created': installment_created,
            },
            status=status.HTTP_200_OK,
        )
