from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0008_rename_tickets_not_trigger_120b7f_idx_tickets_not_trigger_eba49a_idx'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticketresponse',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='tickets/responses/%Y/%m/', verbose_name='Archivo adjunto'),
        ),
    ]
