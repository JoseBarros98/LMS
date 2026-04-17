from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='FlashcardGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=140)),
                ('descripcion', models.TextField(blank=True)),
                ('visibilidad', models.CharField(choices=[('public', 'Publico'), ('private', 'Privado')], default='private', max_length=12)),
                ('color_tema', models.CharField(blank=True, default='', max_length=32)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='flashcard_groups', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Grupo de flashcards',
                'verbose_name_plural': 'Grupos de flashcards',
                'ordering': ['-updated_at', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Flashcard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pregunta', models.TextField()),
                ('respuesta', models.TextField()),
                ('orden', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('grupo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cards', to='flashcards.flashcardgroup')),
            ],
            options={
                'verbose_name': 'Flashcard',
                'verbose_name_plural': 'Flashcards',
                'ordering': ['orden', 'id'],
            },
        ),
        migrations.CreateModel(
            name='FlashcardStudyEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fue_correcta', models.BooleanField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('card', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='study_events', to='flashcards.flashcard')),
                ('grupo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='study_events', to='flashcards.flashcardgroup')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='flashcard_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Evento de estudio',
                'verbose_name_plural': 'Eventos de estudio',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='flashcardstudyevent',
            index=models.Index(fields=['grupo', 'created_at'], name='flashcards_f_grupo_i_625c17_idx'),
        ),
        migrations.AddIndex(
            model_name='flashcardstudyevent',
            index=models.Index(fields=['user', 'created_at'], name='flashcards_f_user_id_5f7069_idx'),
        ),
        migrations.AddIndex(
            model_name='flashcardstudyevent',
            index=models.Index(fields=['grupo', 'user'], name='flashcards_f_grupo_i_ece76f_idx'),
        ),
    ]
