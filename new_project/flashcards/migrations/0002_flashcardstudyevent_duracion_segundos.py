from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flashcards', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='flashcardstudyevent',
            name='duracion_segundos',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
