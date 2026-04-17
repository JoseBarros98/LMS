import token

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from .models import User, Role
from .permission_catalog import PERMISSION_CATALOG, get_valid_permission_actions

class RoleSerializer(serializers.ModelSerializer):
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'permissions', 'description', 'created_at', 'updated_at', 'users_count']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_users_count(self, obj):
        return obj.users.count()

    def validate_permissions(self, value):
        if value in (None, ''):
            return {}

        if not isinstance(value, dict):
            raise serializers.ValidationError('El campo permissions debe ser un objeto JSON.')

        unknown_resources = [resource for resource in value.keys() if resource not in PERMISSION_CATALOG]
        if unknown_resources:
            raise serializers.ValidationError(
                f'Recursos no permitidos: {", ".join(sorted(unknown_resources))}.'
            )

        for resource, actions in value.items():
            if not isinstance(actions, list):
                raise serializers.ValidationError(
                    f'Las acciones de "{resource}" deben enviarse como lista.'
                )

            normalized_actions = []
            seen = set()
            valid_actions = get_valid_permission_actions(resource)

            for action in actions:
                if not isinstance(action, str):
                    raise serializers.ValidationError(
                        f'Cada accion en "{resource}" debe ser texto.'
                    )

                if action not in valid_actions:
                    raise serializers.ValidationError(
                        f'Accion no valida para "{resource}": "{action}".'
                    )

                if action not in seen:
                    seen.add(action)
                    normalized_actions.append(action)

            value[resource] = normalized_actions

        return value

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = RoleSerializer(read_only=True)
    role_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'id', 
            'name', 
            'paternal_surname', 
            'maternal_surname', 
            'ci', 
            'email', 
            'phone_number', 
            'university', 
            'country', 
            'profile_picture', 
            'status', 
            'role',
            'role_id',
            'created_at', 
            'updated_at',
            'password'
        ]
        read_only_fields = ['created_at', 'updated_at']
        
    def create(self, validated_data):
        password = validated_data.pop('password')
        role_id = validated_data.pop('role_id', None)
        
        user = User(**validated_data)
        user.set_password(password)
        
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
                user.role = role
            except Role.DoesNotExist:
                pass
                
        user.save()
        return user
        
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        role_id = validated_data.pop('role_id', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
            
        if role_id is not None:
            try:
                role = Role.objects.get(id=role_id)
                instance.role = role
            except Role.DoesNotExist:
                instance.role = None
                
        instance.save()
        return instance
        
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['name'] = user.name
        token['paternal_surname'] = user.paternal_surname
        token['maternal_surname'] = user.maternal_surname
        token['profile_picture'] = user.profile_picture.url if user.profile_picture else None
        token['email'] = user.email
        
        # Añadir información del rol y permisos
        if user.role:
            token['role'] = {
                'id': user.role.id,
                'name': user.role.name,
                'permissions': user.role.permissions
            }
        else:
            token['role'] = None
        
        return token
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        user = authenticate(request=self.context.get('request'), email=email, password=password)
        
        if user is None:
            raise serializers.ValidationError('Correo o contraseña incorrectos')
        
        if not user.is_active:
            raise serializers.ValidationError('Usuario inactivo')
        
        self.user = user
        refresh = self.get_token(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }