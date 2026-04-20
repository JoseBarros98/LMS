from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from core.access import ADMIN_ROLE_NAME
from cursos.models import CuotaPagoMatricula, MatriculaCurso, MatriculaRuta

from .models import Notification

User = get_user_model()


STATUS_LABELS = {
    'open': 'Abierto',
    'in_progress': 'En progreso',
    'resolved': 'Resuelto',
    'closed': 'Cerrado',
}


def get_status_label(status):
    return STATUS_LABELS.get(status, status)


def _admin_users():
    return User.objects.filter(role__name__iexact=ADMIN_ROLE_NAME)


def notify_ticket_created(ticket, actor):
    recipients = _admin_users()

    notifications = []
    for recipient in recipients:
        if actor and recipient.id == actor.id:
            continue

        notifications.append(
            Notification(
                recipient=recipient,
                ticket=ticket,
                notification_type=Notification.TYPE_TICKET_CREATED,
                status_tag=Notification.STATUS_SYSTEM,
                title='Nuevo ticket creado',
                message=f'El ticket #{ticket.id} "{ticket.title}" fue creado por {ticket.user.name}.',
            )
        )

    if notifications:
        Notification.objects.bulk_create(notifications)


def notify_ticket_status_changed(ticket, old_status, new_status, actor):
    if old_status == new_status:
        return

    recipient = ticket.user
    if not recipient:
        return

    if actor and recipient.id == actor.id:
        return

    Notification.objects.create(
        recipient=recipient,
        ticket=ticket,
        notification_type=Notification.TYPE_TICKET_STATUS_CHANGED,
        status_tag=Notification.STATUS_SYSTEM,
        title='Actualizacion de estado de ticket',
        message=(
            f'El ticket #{ticket.id} "{ticket.title}" cambio de '
            f'{get_status_label(old_status)} a {get_status_label(new_status)}.'
        ),
    )


def notify_ticket_responded(ticket, response, actor):
    recipients = []
    recipient_ids = set()

    def add_recipient(user):
        if not user:
            return
        if actor and user.id == actor.id:
            return
        if user.id in recipient_ids:
            return
        recipient_ids.add(user.id)
        recipients.append(user)

    # Siempre notificar al creador del ticket (si no es quien responde)
    add_recipient(ticket.user)

    # Notificar al admin asignado, si existe
    add_recipient(ticket.assigned_to)

    # Si responde el creador del ticket, avisar tambien a administradores
    if actor and ticket.user and actor.id == ticket.user.id:
        for admin_user in _admin_users():
            add_recipient(admin_user)

    notifications = []
    actor_name = actor.name if actor else 'Un usuario'

    for recipient in recipients:
        notifications.append(
            Notification(
                recipient=recipient,
                ticket=ticket,
                notification_type=Notification.TYPE_TICKET_RESPONSE,
                status_tag=Notification.STATUS_INFO,
                title='Nueva respuesta en ticket',
                message=f'{actor_name} respondio el ticket #{ticket.id} "{ticket.title}".',
            )
        )

    if notifications:
        Notification.objects.bulk_create(notifications)


def notify_manual(recipients, title, message, status_tag=Notification.STATUS_SYSTEM):
    notifications = [
        Notification(
            recipient=recipient,
            notification_type=Notification.TYPE_MANUAL,
            status_tag=status_tag,
            title=title,
            message=message,
        )
        for recipient in recipients
    ]

    if notifications:
        Notification.objects.bulk_create(notifications)

    return len(notifications)


def notify_enrollment_expiry(days_before=7):
    today = timezone.localdate()
    limit_date = today + timedelta(days=days_before)

    created_count = 0

    matriculas_ruta = MatriculaRuta.objects.filter(
        activa=True,
        fecha_fin__isnull=False,
        fecha_fin__gte=today,
        fecha_fin__lte=limit_date,
        user__is_active=True,
    ).select_related('user', 'ruta')

    matriculas_curso = MatriculaCurso.objects.filter(
        activa=True,
        fecha_fin__isnull=False,
        fecha_fin__gte=today,
        fecha_fin__lte=limit_date,
        user__is_active=True,
    ).select_related('user', 'curso')

    for matricula in matriculas_ruta:
        remaining_days = (matricula.fecha_fin - today).days
        trigger_key = f'enrollment_expiry:ruta:{matricula.id}:{matricula.fecha_fin.isoformat()}'
        _, created = Notification.objects.get_or_create(
            recipient=matricula.user,
            trigger_key=trigger_key,
            defaults={
                'notification_type': Notification.TYPE_ENROLLMENT_EXPIRY,
                'status_tag': Notification.STATUS_ALERT,
                'title': 'Tu matricula de ruta esta por vencer',
                'message': (
                    f'Tu matricula en la ruta "{matricula.ruta.titulo}" vence el '
                    f'{matricula.fecha_fin.isoformat()} (faltan {remaining_days} dias).'
                ),
            },
        )
        created_count += int(created)

    for matricula in matriculas_curso:
        remaining_days = (matricula.fecha_fin - today).days
        trigger_key = f'enrollment_expiry:curso:{matricula.id}:{matricula.fecha_fin.isoformat()}'
        _, created = Notification.objects.get_or_create(
            recipient=matricula.user,
            trigger_key=trigger_key,
            defaults={
                'notification_type': Notification.TYPE_ENROLLMENT_EXPIRY,
                'status_tag': Notification.STATUS_ALERT,
                'title': 'Tu matricula de curso esta por vencer',
                'message': (
                    f'Tu matricula en el curso "{matricula.curso.titulo}" vence el '
                    f'{matricula.fecha_fin.isoformat()} (faltan {remaining_days} dias).'
                ),
            },
        )
        created_count += int(created)

    return created_count


def notify_installment_due(days_before=3):
    today = timezone.localdate()
    limit_date = today + timedelta(days=days_before)

    cuotas = CuotaPagoMatricula.objects.filter(
        fecha_pago__gte=today,
        fecha_pago__lte=limit_date,
        estado__in=[
            CuotaPagoMatricula.ESTADO_PENDIENTE,
            CuotaPagoMatricula.ESTADO_PARCIAL,
        ],
    ).select_related(
        'matricula_ruta__user',
        'matricula_ruta__ruta',
        'matricula_curso__user',
        'matricula_curso__curso',
    )

    created_count = 0

    for cuota in cuotas:
        if cuota.matricula_ruta_id:
            recipient = cuota.matricula_ruta.user
            enrollment_name = f'Ruta: {cuota.matricula_ruta.ruta.titulo}'
        else:
            recipient = cuota.matricula_curso.user
            enrollment_name = f'Curso: {cuota.matricula_curso.curso.titulo}'

        if not recipient or not recipient.is_active:
            continue

        remaining_days = (cuota.fecha_pago - today).days
        trigger_key = f'installment_due:{cuota.id}:{cuota.fecha_pago.isoformat()}'
        _, created = Notification.objects.get_or_create(
            recipient=recipient,
            trigger_key=trigger_key,
            defaults={
                'notification_type': Notification.TYPE_INSTALLMENT_DUE,
                'status_tag': Notification.STATUS_ALERT,
                'title': 'Tienes una cuota proxima a vencer',
                'message': (
                    f'La cuota #{cuota.numero} ({enrollment_name}) vence el '
                    f'{cuota.fecha_pago.isoformat()} (faltan {remaining_days} dias).'
                ),
            },
        )
        created_count += int(created)

    return created_count
