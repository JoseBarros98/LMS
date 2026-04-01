from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cursos', '0004_mediatecaitem_parent_and_folder_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='mediatecaitem',
            name='archivo',
            field=models.FileField(blank=True, null=True, upload_to='mediateca/', verbose_name='Archivo'),
        ),
    ]
