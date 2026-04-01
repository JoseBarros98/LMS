from django.contrib import admin

from .models import Curso, MatriculaCurso, MatriculaRuta, Ruta


@admin.register(Ruta)
class RutaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'slug', 'publicado', 'orden', 'created_at')
    list_filter = ('publicado',)
    search_fields = ('titulo', 'slug')
    ordering = ('orden', 'titulo')


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'ruta', 'nivel', 'estado', 'publicado', 'orden', 'created_at')
    list_filter = ('nivel', 'estado', 'publicado', 'tiene_mediateca')
    search_fields = ('titulo', 'slug', 'descripcion')
    ordering = ('ruta__orden', 'orden', 'titulo')


@admin.register(MatriculaRuta)
class MatriculaRutaAdmin(admin.ModelAdmin):
    list_display = ('user', 'ruta', 'activa', 'fecha_inicio', 'fecha_fin', 'created_at')
    list_filter = ('activa',)
    search_fields = ('user__email', 'user__name', 'ruta__titulo', 'codigo_acceso')
    ordering = ('-created_at',)


@admin.register(MatriculaCurso)
class MatriculaCursoAdmin(admin.ModelAdmin):
    list_display = ('user', 'curso', 'activa', 'fecha_inicio', 'fecha_fin', 'created_at')
    list_filter = ('activa',)
    search_fields = ('user__email', 'user__name', 'curso__titulo', 'codigo_acceso')
    ordering = ('-created_at',)
