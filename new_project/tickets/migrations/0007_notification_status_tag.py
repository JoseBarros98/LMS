from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0006_notification_automation_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='status_tag',
            field=models.CharField(
                choices=[
                    ('system', 'Sistema'),
                    ('alert', 'Alerta'),
                    ('info', 'Informativa'),
                ],
                default='system',
                max_length=20,
                verbose_name='Estado visual',
            ),
        ),
    ]
