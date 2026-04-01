from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0005_mediatecaitem_archivo'),
    ]

    operations = [
        migrations.AddField(
            model_name='comentariocurso',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.deletion.CASCADE, related_name='respuestas', to='cursos.comentariocurso'),
        ),
    ]
