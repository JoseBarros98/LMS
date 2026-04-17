from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0005_rename_tickets_noti_recipie_2e0f04_idx_tickets_not_recipie_a596ee_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='trigger_key',
            field=models.CharField(
                blank=True,
                help_text='Clave opcional para evitar notificaciones automaticas duplicadas.',
                max_length=255,
                null=True,
                verbose_name='Clave de disparo unica',
            ),
        ),
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('ticket_created', 'Ticket creado'),
                    ('ticket_status_changed', 'Estado de ticket cambiado'),
                    ('manual', 'Notificacion manual'),
                    ('enrollment_expiry', 'Matricula por vencer'),
                    ('installment_due', 'Cuota proxima a vencer'),
                ],
                max_length=30,
                verbose_name='Tipo de notificacion',
            ),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['trigger_key'], name='tickets_not_trigger_120b7f_idx'),
        ),
        migrations.AddConstraint(
            model_name='notification',
            constraint=models.UniqueConstraint(
                condition=models.Q(trigger_key__isnull=False),
                fields=('recipient', 'trigger_key'),
                name='unique_notification_recipient_trigger_key',
            ),
        ),
    ]
