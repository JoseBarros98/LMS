from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('simuladores', '0002_simuladordisponibilidadusuario'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='simulador',
            name='fecha_apertura',
        ),
        migrations.RemoveField(
            model_name='simulador',
            name='fecha_cierre',
        ),
    ]
