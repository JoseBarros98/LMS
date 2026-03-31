from django.contrib import admin
from .models import User, Role

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name']
    ordering = ['name']

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['name', 'paternal_surname', 'email', 'ci', 'role', 'status', 'created_at']
    list_filter = ['status', 'role', 'created_at']
    search_fields = ['name', 'paternal_surname', 'email', 'ci']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
