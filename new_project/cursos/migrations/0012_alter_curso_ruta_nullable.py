from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0011_cuotapagomatricula_control_pago'),
    ]

    operations = [
        migrations.AlterField(
            model_name='curso',
            name='ruta',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='cursos',
                to='cursos.ruta',
                verbose_name='Ruta',
            ),
        ),
    ]
