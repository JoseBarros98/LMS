from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    permissions = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['name']
    
    def __str__(self):
        return self.name

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    name = models.CharField(max_length = 100)
    paternal_surname = models.CharField(max_length = 100, blank=True)
    maternal_surname = models.CharField(max_length = 100, blank=True)
    ci = models.CharField(max_length = 20, unique = True)
    email = models.EmailField(unique = True)
    phone_number = models.CharField(max_length = 20, unique = True)
    university = models.CharField(max_length = 100)
    country = models.CharField(max_length = 100)
    profile_picture = models.ImageField(upload_to = 'profile_pictures/', null = True, blank = True)
    dashboard_banner = models.ImageField(upload_to = 'dashboard_banners/', null = True, blank = True)
    password = models.CharField(max_length = 128)
    status = models.BooleanField(default = True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)
    
    is_staff = models.BooleanField(default = False)
    is_active = models.BooleanField(default = True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'paternal_surname', 'ci', 'phone_number', 'university', 'country']
    
    def __str__(self):
        return f"{self.name} {self.paternal_surname} {self.maternal_surname}"


class PlatformSetting(models.Model):
    dashboard_banner = models.ImageField(upload_to='dashboard_banners/', null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuracion de plataforma'
        verbose_name_plural = 'Configuraciones de plataforma'

    def __str__(self):
        return 'Configuracion global'


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Creacion'),
        ('update', 'Actualizacion'),
        ('delete', 'Eliminacion'),
        ('other', 'Otro cambio'),
    ]

    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    actor_name = models.CharField(max_length=200)
    actor_role_name = models.CharField(max_length=120, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='other')
    resource = models.CharField(max_length=120, blank=True)
    entity_id = models.CharField(max_length=80, blank=True)
    http_method = models.CharField(max_length=10)
    path = models.CharField(max_length=255)
    change_summary = models.TextField()
    status_code = models.PositiveSmallIntegerField(default=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Registro de auditoria'
        verbose_name_plural = 'Registros de auditoria'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.actor_name} - {self.change_summary} ({self.created_at.isoformat()})'
    
