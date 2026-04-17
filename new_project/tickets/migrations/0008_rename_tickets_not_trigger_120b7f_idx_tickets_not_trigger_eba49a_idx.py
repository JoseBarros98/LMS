from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0007_notification_status_tag'),
    ]

    operations = [
        # Esta migracion se mantiene como compatibilidad historica entre entornos.
        # No renombramos el indice para evitar fallos cuando no existe el nombre esperado.
    ]
