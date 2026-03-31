from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Ticket, TicketCategory, TicketResponse
from .serializers import (
    TicketCategorySerializer, TicketSerializer, TicketCreateSerializer, TicketUpdateSerializer,
    TicketResponseSerializer, TicketResponseCreateSerializer, NotificationSerializer
)
from .services import notify_ticket_created, notify_ticket_status_changed


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def category_list(request):
    """
    Vista simple para listar categorías
    """
    try:
        queryset = TicketCategory.objects.order_by('order', 'name')
        include_inactive = str(request.query_params.get('include_inactive', '')).lower() in {'1', 'true', 'yes'}
        is_admin = request.user.role.name.lower() == 'administrador' if request.user and request.user.role else False

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
        
        if user.role.name.lower() == 'administrador':
            tickets = Ticket.objects.select_related('user', 'assigned_to', 'category').all()
        else:
            tickets = Ticket.objects.filter(user=user).select_related('user', 'assigned_to', 'category')
        
        serializer = TicketSerializer(tickets, many=True)
        return Response(serializer.data)
    except Exception as e:
        print(f"Error in ticket_list: {e}")
        return Response({'error': str(e)}, status=500)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Permiso personalizado: Solo admins pueden escribir, otros solo leer"""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if not request.user or not request.user.role:
            return False
            
        return request.user.role.name.lower() == 'administrador'


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permiso personalizado: Solo dueño del ticket o admin puede acceder"""
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.role:
            return False
            
        # Admin puede acceder a todos
        if request.user.role.name.lower() == 'administrador':
            return True
            
        # Usuario solo puede acceder a sus propios tickets
        return obj.user == request.user


class TicketCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar categorías de tickets (solo administradores)
    """
    queryset = TicketCategory.objects.all()
    serializer_class = TicketCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        # Solo administradores pueden gestionar categorías
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            if not self.request.user or not self.request.user.role:
                return [IsAuthenticated()]
            
            if self.request.user.role.name.lower() != 'administrador':
                self.permission_denied_message = "No tienes permisos para gestionar categorías"
                raise permissions.PermissionDenied()
        
        return [permission() for permission in self.permission_classes]
    
    def get_queryset(self):
        queryset = TicketCategory.objects.order_by('order', 'name')

        # Para acciones de escritura sobre un objeto concreto, no filtrar por estado
        # (una categoría inactiva debe poder ser editada/reactivada)
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return queryset

        include_inactive = str(self.request.query_params.get('include_inactive', '')).lower() in {'1', 'true', 'yes'}
        is_admin = self.request.user.role.name.lower() == 'administrador' if self.request.user and self.request.user.role else False

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


class IsAdminOrReadOnly(permissions.BasePermission):
    """Permiso personalizado: Solo admins pueden escribir, otros solo leer"""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if not request.user or not request.user.role:
            return False
            
        return request.user.role.name.lower() == 'administrador'


class IsOwnerOrAdmin(permissions.BasePermission):
    """Permiso personalizado: Solo dueño del ticket o admin puede acceder"""
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.role:
            return False
            
        # Admin puede acceder a todos
        if request.user.role.name.lower() == 'administrador':
            return True
            
        # Usuario solo puede acceder a sus propios tickets
        return obj.user == request.user


class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar tickets de soporte
    - Usuarios: pueden crear y ver sus tickets
    - Admins: pueden ver y gestionar todos los tickets
    """
    
    def get_queryset(self):
        user = self.request.user
        if not user or not user.role:
            return Ticket.objects.none()
            
        # Admins ven todos los tickets
        if user.role.name.lower() == 'administrador':
            return Ticket.objects.select_related('user', 'assigned_to', 'category').all()
        
        # Usuarios ven solo sus tickets
        return Ticket.objects.filter(
            user=user
        ).select_related('user', 'assigned_to', 'category')
    
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
    
    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

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
            request.user.role.name.lower() != 'administrador'):
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
            
            # Si es respuesta de admin y el ticket estaba abierto, cambiar estado
            if (response.is_admin_response and ticket.status == 'open'):
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
            request.user.role.name.lower() != 'administrador'):
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
        if request.user.role.name.lower() != 'administrador':
            return Response(
                {'error': 'No tienes permisos para asignar tickets'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        ticket = self.get_object()
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
        if request.user.role.name.lower() != 'administrador':
            return Response(
                {'error': 'No tienes permisos para cerrar tickets'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        ticket = self.get_object()
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
