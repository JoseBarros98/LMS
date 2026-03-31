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
    
