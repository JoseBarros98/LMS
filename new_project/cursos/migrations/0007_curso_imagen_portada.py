from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0006_comentariocurso_parent'),
    ]

    operations = [
        migrations.AddField(
            model_name='curso',
            name='imagen_portada',
            field=models.ImageField(blank=True, null=True, upload_to='cursos/portadas/', verbose_name='Imagen portada'),
        ),
    ]
