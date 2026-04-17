from django.db import models
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class TicketCategory(models.Model):
    """Modelo para categorías de tickets administrables"""
    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Activa'),
        (STATUS_INACTIVE, 'Inactiva'),
    ]

    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre")
    description = models.TextField(blank=True, null=True, verbose_name="Descripción")
    icon = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Nombre del icono de Lucide React (ej: 'HelpCircle', 'AlertCircle')",
        verbose_name="Icono"
    )
    color = models.CharField(
        max_length=7, 
        default='#6B7280',
        help_text="Color hexadecimal (ej: '#6B7280')",
        verbose_name="Color"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        verbose_name="Estado"
    )
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado en")
    order = models.PositiveIntegerField(default=0, verbose_name="Orden")

    class Meta:
        verbose_name = "Categoría de Ticket"
        verbose_name_plural = "Categorías de Tickets"
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        original_values = None

        if self.pk:
            original_values = self.__class__.objects.filter(pk=self.pk).values('status', 'is_active').first()

        if original_values is None:
            self.is_active = self.status == self.STATUS_ACTIVE
        else:
            status_changed = self.status != original_values['status']
            is_active_changed = self.is_active != original_values['is_active']

            if status_changed and not is_active_changed:
                self.is_active = self.status == self.STATUS_ACTIVE
            elif is_active_changed and not status_changed:
                self.status = self.STATUS_ACTIVE if self.is_active else self.STATUS_INACTIVE
            else:
                self.is_active = self.status == self.STATUS_ACTIVE

        super().save(*args, **kwargs)


class Ticket(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Baja'),
        ('medium', 'Media'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Abierto'),
        ('in_progress', 'En Progreso'),
        ('resolved', 'Resuelto'),
        ('closed', 'Cerrado'),
    ]

    title = models.CharField(max_length=200, verbose_name="Título")
    description = models.TextField(verbose_name="Descripción")
    category = models.ForeignKey(
        TicketCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='tickets',
        verbose_name="Categoría"
    )
    priority = models.CharField(
        max_length=10, 
        choices=PRIORITY_CHOICES, 
        default='medium',
        verbose_name="Prioridad"
    )
    status = models.CharField(
        max_length=15, 
        choices=STATUS_CHOICES, 
        default='open',
        verbose_name="Estado"
    )
    
    # Relaciones
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='tickets',
        verbose_name="Usuario"
    )
    assigned_to = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_tickets',
        verbose_name="Asignado a"
    )
    
    # Fechas
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado en")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Resuelto en")
    
    # Archivos adjuntos
    attachment = models.FileField(
        upload_to='tickets/attachments/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Archivo adjunto"
    )

    class Meta:
        verbose_name = "Ticket"
        verbose_name_plural = "Tickets"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"#{self.id} - {self.title}"

    def save(self, *args, **kwargs):
        # Si el estado cambia a resuelto, guardar la fecha de resolución
        if self.status == 'resolved' and not self.resolved_at:
            self.resolved_at = timezone.now()
        elif self.status != 'resolved':
            self.resolved_at = None
        
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Verificar si el ticket está vencido (más de 48 horas sin respuesta en estado abierto)"""
        if self.status in ['open', 'in_progress']:
            time_diff = timezone.now() - self.updated_at
            return time_diff.total_seconds() > 48 * 60 * 60
        return False


class TicketResponse(models.Model):
    """Respuestas a los tickets"""
    ticket = models.ForeignKey(
        Ticket, 
        on_delete=models.CASCADE, 
        related_name='responses',
        verbose_name="Ticket"
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        verbose_name="Usuario"
    )
    message = models.TextField(verbose_name="Mensaje")
    is_admin_response = models.BooleanField(
        default=False, 
        verbose_name="Respuesta de administrador"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado en")
    
    class Meta:
        verbose_name = "Respuesta de Ticket"
        verbose_name_plural = "Respuestas de Tickets"
        ordering = ['created_at']

    def __str__(self):
        return f"Respuesta al ticket #{self.ticket.id} - {self.user.name}"


class Notification(models.Model):
    TYPE_TICKET_CREATED = 'ticket_created'
    TYPE_TICKET_STATUS_CHANGED = 'ticket_status_changed'
    TYPE_MANUAL = 'manual'
    TYPE_ENROLLMENT_EXPIRY = 'enrollment_expiry'
    TYPE_INSTALLMENT_DUE = 'installment_due'

    TYPE_CHOICES = [
        (TYPE_TICKET_CREATED, 'Ticket creado'),
        (TYPE_TICKET_STATUS_CHANGED, 'Estado de ticket cambiado'),
        (TYPE_MANUAL, 'Notificacion manual'),
        (TYPE_ENROLLMENT_EXPIRY, 'Matricula por vencer'),
        (TYPE_INSTALLMENT_DUE, 'Cuota proxima a vencer'),
    ]

    STATUS_SYSTEM = 'system'
    STATUS_ALERT = 'alert'
    STATUS_INFO = 'info'

    STATUS_CHOICES = [
        (STATUS_SYSTEM, 'Sistema'),
        (STATUS_ALERT, 'Alerta'),
        (STATUS_INFO, 'Informativa'),
    ]

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Destinatario'
    )
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
        verbose_name='Ticket'
    )
    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        verbose_name='Tipo de notificacion'
    )
    title = models.CharField(max_length=200, verbose_name='Titulo')
    message = models.TextField(verbose_name='Mensaje')
    status_tag = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_SYSTEM,
        verbose_name='Estado visual',
    )
    trigger_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Clave de disparo unica',
        help_text='Clave opcional para evitar notificaciones automaticas duplicadas.',
    )
    is_read = models.BooleanField(default=False, verbose_name='Leida')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creada en')

    class Meta:
        verbose_name = 'Notificacion'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['created_at']),
            models.Index(fields=['trigger_key'], name='tickets_not_trigger_120b7f_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['recipient', 'trigger_key'],
                condition=Q(trigger_key__isnull=False),
                name='unique_notification_recipient_trigger_key',
            ),
        ]

    def __str__(self):
        return f"{self.title} -> {self.recipient.email}"
