from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0014_merge_matriculacurso_incluido_and_duration'),
    ]

    operations = [
        migrations.AddField(
            model_name='matriculacurso',
            name='comprobante_pago',
            field=models.FileField(blank=True, null=True, upload_to='comprobantes_pago/'),
        ),
        migrations.AddField(
            model_name='matricularuta',
            name='comprobante_pago',
            field=models.FileField(blank=True, null=True, upload_to='comprobantes_pago/'),
        ),
    ]
