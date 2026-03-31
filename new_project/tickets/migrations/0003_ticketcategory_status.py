from django.db import migrations, models


def sync_category_status(apps, schema_editor):
    TicketCategory = apps.get_model('tickets', 'TicketCategory')

    for category in TicketCategory.objects.all():
        category.status = 'active' if category.is_active else 'inactive'
        category.save(update_fields=['status'])


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0002_default_categories'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticketcategory',
            name='status',
            field=models.CharField(
                choices=[('active', 'Activa'), ('inactive', 'Inactiva')],
                default='active',
                max_length=10,
                verbose_name='Estado',
            ),
        ),
        migrations.RunPython(sync_category_status, migrations.RunPython.noop),
    ]