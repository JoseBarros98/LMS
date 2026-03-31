from django.contrib.auth import get_user_model

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
    return User.objects.filter(role__name__iexact='administrador')


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
        title='Actualizacion de estado de ticket',
        message=(
            f'El ticket #{ticket.id} "{ticket.title}" cambio de '
            f'{get_status_label(old_status)} a {get_status_label(new_status)}.'
        ),
    )
