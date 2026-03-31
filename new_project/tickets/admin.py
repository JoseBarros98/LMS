from django.contrib import admin
from .models import TicketCategory, Ticket, TicketResponse


@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'color', 'status', 'order', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'description']
    list_editable = ['order', 'status']
    readonly_fields = ['created_at', 'updated_at', 'is_active']
    prepopulated_fields = {}
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'description', 'order')
        }),
        ('Apariencia', {
            'fields': ('icon', 'color'),
            'description': 'Configura cómo se mostrará esta categoría en el frontend'
        }),
        ('Estado', {
            'fields': ('status', 'is_active')
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).order_by('order', 'name')


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'title', 'user', 'category', 'priority', 
        'status', 'created_at', 'assigned_to'
    ]
    list_filter = ['status', 'priority', 'category', 'created_at']
    search_fields = ['title', 'description', 'user__email', 'user__name']
    readonly_fields = ['created_at', 'updated_at', 'resolved_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('title', 'description', 'category', 'priority', 'status')
        }),
        ('Asignación', {
            'fields': ('user', 'assigned_to')
        }),
        ('Adjuntos', {
            'fields': ('attachment',)
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at', 'resolved_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'assigned_to', 'category')


@admin.register(TicketResponse)
class TicketResponseAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'user', 'is_admin_response', 'created_at']
    list_filter = ['is_admin_response', 'created_at']
    search_fields = ['message', 'user__name', 'ticket__title']
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('ticket', 'user')
