from django.contrib import admin
from .models import Simulador, Pregunta, Opcion, ExplicacionPregunta, IntentoSimulador, RespuestaIntento


class OpcionInline(admin.TabularInline):
    model = Opcion
    extra = 2


class ExplicacionInline(admin.StackedInline):
    model = ExplicacionPregunta
    extra = 0


@admin.register(Pregunta)
class PreguntaAdmin(admin.ModelAdmin):
    list_display = ['simulador', 'orden', 'tipo', 'texto', 'puntaje']
    inlines = [OpcionInline, ExplicacionInline]


@admin.register(Simulador)
class SimuladorAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'publicado', 'fecha_apertura', 'fecha_cierre', 'max_intentos']
    list_filter = ['publicado']


@admin.register(IntentoSimulador)
class IntentoAdmin(admin.ModelAdmin):
    list_display = ['simulador', 'user', 'iniciado_en', 'completado', 'puntaje_obtenido']
    list_filter = ['completado']
