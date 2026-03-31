from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0003_ticketcategory_status'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('ticket_created', 'Ticket creado'), ('ticket_status_changed', 'Estado de ticket cambiado')], max_length=30, verbose_name='Tipo de notificacion')),
                ('title', models.CharField(max_length=200, verbose_name='Titulo')),
                ('message', models.TextField(verbose_name='Mensaje')),
                ('is_read', models.BooleanField(default=False, verbose_name='Leida')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Creada en')),
                ('recipient', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL, verbose_name='Destinatario')),
                ('ticket', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.CASCADE, related_name='notifications', to='tickets.ticket', verbose_name='Ticket')),
            ],
            options={
                'verbose_name': 'Notificacion',
                'verbose_name_plural': 'Notificaciones',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'is_read'], name='tickets_noti_recipie_2e0f04_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['created_at'], name='tickets_noti_created_88e841_idx'),
        ),
    ]
