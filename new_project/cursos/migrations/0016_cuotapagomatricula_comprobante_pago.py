from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0015_matricula_comprobante_pago'),
    ]

    operations = [
        migrations.AddField(
            model_name='cuotapagomatricula',
            name='comprobante_pago',
            field=models.FileField(blank=True, null=True, upload_to='comprobantes_cuota/'),
        ),
    ]
