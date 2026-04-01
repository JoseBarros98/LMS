from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0003_seccion_leccion_comentariocurso_mediatecaitem_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediatecaitem',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='cursos.mediatecaitem'),
        ),
        migrations.AlterField(
            model_name='mediatecaitem',
            name='tipo',
            field=models.CharField(choices=[('carpeta', 'Carpeta'), ('video', 'Video'), ('audio', 'Audio'), ('documento', 'Documento'), ('enlace', 'Enlace')], default='documento', max_length=20),
        ),
        migrations.AlterField(
            model_name='mediatecaitem',
            name='url',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
