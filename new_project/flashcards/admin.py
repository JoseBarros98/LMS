from django.contrib import admin

from .models import Flashcard, FlashcardGroup, FlashcardStudyEvent


@admin.register(FlashcardGroup)
class FlashcardGroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'visibilidad', 'owner', 'created_at')
    list_filter = ('visibilidad', 'created_at')
    search_fields = ('nombre', 'descripcion', 'owner__email', 'owner__name')


@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ('id', 'grupo', 'orden', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('pregunta', 'respuesta', 'grupo__nombre')


@admin.register(FlashcardStudyEvent)
class FlashcardStudyEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'grupo', 'user', 'card', 'fue_correcta', 'created_at')
    list_filter = ('fue_correcta', 'created_at')
    search_fields = ('grupo__nombre', 'user__email')
