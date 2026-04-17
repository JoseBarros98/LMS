from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.access import is_admin_user
from core.models import Role
from .models import TicketCategory, Ticket, TicketResponse, Notification

User = get_user_model()


class TicketCategorySerializer(serializers.ModelSerializer):
    """Serializer para categorías de tickets"""

    status_label = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = TicketCategory
        fields = [
            'id', 'name', 'description', 'icon', 'color',
            'status', 'status_label', 'is_active', 'created_at', 'updated_at', 'order'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TicketResponseSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = TicketResponse
        fields = [
            'id', 'ticket', 'user', 'user_name', 'user_email', 
            'message', 'is_admin_response', 'created_at'
        ]
        read_only_fields = ['created_at']


class TicketSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    responses_count = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    category_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'description', 'category', 'category_info', 'priority', 'status',
            'user', 'user_name', 'user_email', 'assigned_to', 'assigned_to_name',
            'created_at', 'updated_at', 'resolved_at', 'attachment',
            'responses_count', 'is_overdue'
        ]
        read_only_fields = [
            'user', 'created_at', 'updated_at', 'resolved_at',
            'responses_count', 'is_overdue', 'category_info'
        ]

    def get_responses_count(self, obj):
        return obj.responses.count()

    def get_is_overdue(self, obj):
        return obj.is_overdue
    
    def get_category_info(self, obj):
        """Retornar información completa de la categoría"""
        if obj.category:
            return {
                'id': obj.category.id,
                'name': obj.category.name,
                'icon': obj.category.icon,
                'color': obj.category.color
            }
        return None


class TicketCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear nuevos tickets (solo usuarios autenticados)"""
    
    class Meta:
        model = Ticket
        fields = [
            'title', 'description', 'category', 'priority', 'attachment'
        ]
    
    def create(self, validated_data):
        # El usuario se asignará automáticamente en la vista
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)


class TicketUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar tickets (solo administradores)"""
    
    class Meta:
        model = Ticket
        fields = [
            'title', 'description', 'category', 'priority', 'attachment', 'status', 'assigned_to'
        ]

    def validate(self, attrs):
        request = self.context['request']
        is_admin = is_admin_user(request.user)

        if is_admin:
            return attrs

        readonly_fields = {'status', 'assigned_to'}
        attempted_readonly = readonly_fields.intersection(attrs.keys())

        if attempted_readonly:
            raise serializers.ValidationError(
                'No tienes permisos para actualizar el estado o la asignación del ticket.'
            )

        return attrs


class TicketResponseCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear respuestas a tickets"""
    
    class Meta:
        model = TicketResponse
        fields = ['message']
    
    def create(self, validated_data):
        ticket_id = self.context['ticket_id']
        user = self.context['request'].user
        ticket = Ticket.objects.get(id=ticket_id)
        
        # Determinar si es respuesta de admin
        is_admin = is_admin_user(user)
        
        validated_data.update({
            'ticket': ticket,
            'user': user,
            'is_admin_response': is_admin
        })
        
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source='recipient.name', read_only=True)
    notification_type_label = serializers.CharField(source='get_notification_type_display', read_only=True)
    status_tag_label = serializers.CharField(source='get_status_tag_display', read_only=True)
    ticket_id = serializers.IntegerField(source='ticket.id', read_only=True)
    ticket_priority = serializers.CharField(source='ticket.priority', read_only=True)
    ticket_priority_label = serializers.CharField(source='ticket.get_priority_display', read_only=True)
    ticket_status = serializers.CharField(source='ticket.status', read_only=True)
    ticket_status_label = serializers.CharField(source='ticket.get_status_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'recipient_name',
            'ticket',
            'ticket_id',
            'notification_type',
            'notification_type_label',
            'title',
            'message',
            'status_tag',
            'status_tag_label',
            'trigger_key',
            'ticket_priority',
            'ticket_priority_label',
            'ticket_status',
            'ticket_status_label',
            'is_read',
            'created_at',
        ]
        read_only_fields = fields


class NotificationSendSerializer(serializers.Serializer):
    TARGET_USER = 'user'
    TARGET_ROLES = 'roles'
    TARGET_ALL_STUDENTS = 'all_students'

    TARGET_CHOICES = [
        (TARGET_USER, 'Usuario especifico'),
        (TARGET_ROLES, 'Por roles'),
        (TARGET_ALL_STUDENTS, 'Todos los estudiantes'),
    ]

    target_mode = serializers.ChoiceField(choices=TARGET_CHOICES)
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    status_tag = serializers.ChoiceField(
        choices=Notification.STATUS_CHOICES,
        required=False,
        default=Notification.STATUS_SYSTEM,
    )
    user_id = serializers.IntegerField(required=False)
    role_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=False,
    )

    def validate(self, attrs):
        target_mode = attrs.get('target_mode')
        user_id = attrs.get('user_id')
        role_ids = attrs.get('role_ids') or []

        if target_mode == self.TARGET_USER:
            if not user_id:
                raise serializers.ValidationError({'user_id': 'Debes enviar user_id para target_mode="user".'})

            user = User.objects.filter(id=user_id, is_active=True).first()
            if not user:
                raise serializers.ValidationError({'user_id': 'El usuario no existe o esta inactivo.'})

            attrs['target_user'] = user

        if target_mode == self.TARGET_ROLES:
            if not role_ids:
                raise serializers.ValidationError({'role_ids': 'Debes enviar al menos un role_id para target_mode="roles".'})

            roles = Role.objects.filter(id__in=role_ids)
            found_ids = set(roles.values_list('id', flat=True))
            missing = sorted(set(role_ids) - found_ids)
            if missing:
                raise serializers.ValidationError({'role_ids': f'Roles no encontrados: {missing}.'})

            attrs['target_roles'] = roles

        return attrs
