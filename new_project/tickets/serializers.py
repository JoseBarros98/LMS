from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TicketCategory, Ticket, TicketResponse

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
        is_admin = request.user.role.name.lower() == 'administrador' if request.user.role else False

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
        is_admin = user.role.name.lower() == 'administrador' if user.role else False
        
        validated_data.update({
            'ticket': ticket,
            'user': user,
            'is_admin_response': is_admin
        })
        
        return super().create(validated_data)
