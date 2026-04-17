from django.core.management.base import BaseCommand

from tickets.services import notify_enrollment_expiry, notify_installment_due


class Command(BaseCommand):
    help = 'Genera notificaciones automaticas por matriculas y cuotas proximas a vencer.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--enrollment-days-before',
            type=int,
            default=7,
            help='Dias de anticipacion para alertas de vencimiento de matriculas.',
        )
        parser.add_argument(
            '--installment-days-before',
            type=int,
            default=3,
            help='Dias de anticipacion para alertas de vencimiento de cuotas.',
        )

    def handle(self, *args, **options):
        enrollment_days = options['enrollment_days_before']
        installment_days = options['installment_days_before']

        enrollment_count = notify_enrollment_expiry(days_before=enrollment_days)
        installment_count = notify_installment_due(days_before=installment_days)

        self.stdout.write(
            self.style.SUCCESS(
                f'Proceso completado. Matriculas notificadas: {enrollment_count}. '
                f'Cuotas notificadas: {installment_count}.'
            )
        )
