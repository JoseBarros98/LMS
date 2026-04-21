import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0016_cuotapagomatricula_comprobante_pago'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ComprobantePago',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('monto_abonado', models.DecimalField(decimal_places=2, max_digits=12)),
                ('forma_pago', models.CharField(blank=True, max_length=100)),
                ('fecha_emision', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('cuota', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='comprobantes',
                    to='cursos.cuotapagomatricula',
                )),
                ('registrado_por', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='comprobantes_registrados',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Comprobante de pago',
                'verbose_name_plural': 'Comprobantes de pago',
                'ordering': ['-id'],
            },
        ),
    ]
