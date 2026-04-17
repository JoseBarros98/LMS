from django.conf import settings
from django.db import models


class FlashcardGroup(models.Model):
    VISIBILITY_PUBLIC = 'public'
    VISIBILITY_PRIVATE = 'private'
    VISIBILITY_CHOICES = [
        (VISIBILITY_PUBLIC, 'Publico'),
        (VISIBILITY_PRIVATE, 'Privado'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='flashcard_groups',
    )
    nombre = models.CharField(max_length=140)
    descripcion = models.TextField(blank=True)
    visibilidad = models.CharField(max_length=12, choices=VISIBILITY_CHOICES, default=VISIBILITY_PRIVATE)
    color_tema = models.CharField(max_length=32, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Grupo de flashcards'
        verbose_name_plural = 'Grupos de flashcards'
        ordering = ['-updated_at', '-created_at']

    def __str__(self):
        return self.nombre


class Flashcard(models.Model):
    grupo = models.ForeignKey(
        FlashcardGroup,
        on_delete=models.CASCADE,
        related_name='cards',
    )
    pregunta = models.TextField()
    respuesta = models.TextField()
    orden = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Flashcard'
        verbose_name_plural = 'Flashcards'
        ordering = ['orden', 'id']

    def __str__(self):
        return f'Card {self.id} - {self.grupo.nombre}'


class FlashcardStudyEvent(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='flashcard_events',
    )
    grupo = models.ForeignKey(
        FlashcardGroup,
        on_delete=models.CASCADE,
        related_name='study_events',
    )
    card = models.ForeignKey(
        Flashcard,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='study_events',
    )
    fue_correcta = models.BooleanField()
    duracion_segundos = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Evento de estudio'
        verbose_name_plural = 'Eventos de estudio'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['grupo', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['grupo', 'user']),
        ]
