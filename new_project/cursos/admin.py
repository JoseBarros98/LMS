from django.contrib import admin

from .models import ComentarioCurso, CuotaPagoMatricula, Curso, Leccion, MatriculaCurso, MatriculaRuta, MediatecaItem, ProgresoLeccion, Ruta, Seccion


class LeccionInline(admin.TabularInline):
    model = Leccion
    extra = 0
    fields = ('titulo', 'video_url', 'duracion_min', 'orden', 'publicado')


class SeccionInline(admin.StackedInline):
    model = Seccion
    extra = 0
    fields = ('titulo', 'descripcion', 'orden')


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
    inlines = [SeccionInline]


@admin.register(Seccion)
class SeccionAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'curso', 'orden', 'created_at')
    list_filter = ('curso',)
    search_fields = ('titulo', 'curso__titulo')
    ordering = ('curso__titulo', 'orden', 'titulo')
    inlines = [LeccionInline]


@admin.register(Leccion)
class LeccionAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'seccion', 'duracion_min', 'orden', 'publicado')
    list_filter = ('publicado', 'seccion__curso')
    search_fields = ('titulo', 'seccion__titulo', 'seccion__curso__titulo')
    ordering = ('seccion__curso__titulo', 'seccion__orden', 'orden', 'titulo')


@admin.register(MatriculaRuta)
class MatriculaRutaAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_by', 'ruta', 'plan_pago', 'numero_cuotas', 'monto_total', 'activa', 'fecha_inicio', 'fecha_fin', 'created_at')
    list_filter = ('activa',)
    search_fields = ('user__email', 'user__name', 'ruta__titulo', 'codigo_acceso')
    ordering = ('-created_at',)


@admin.register(MatriculaCurso)
class MatriculaCursoAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_by', 'curso', 'plan_pago', 'numero_cuotas', 'monto_total', 'activa', 'fecha_inicio', 'fecha_fin', 'created_at')
    list_filter = ('activa',)
    search_fields = ('user__email', 'user__name', 'curso__titulo', 'codigo_acceso')
    ordering = ('-created_at',)


@admin.register(CuotaPagoMatricula)
class CuotaPagoMatriculaAdmin(admin.ModelAdmin):
    list_display = ('numero', 'monto', 'fecha_pago', 'estado', 'matricula_ruta', 'matricula_curso')
    list_filter = ('estado',)
    search_fields = ('matricula_ruta__user__email', 'matricula_curso__user__email')
    ordering = ('fecha_pago', 'numero')


@admin.register(ProgresoLeccion)
class ProgresoLeccionAdmin(admin.ModelAdmin):
    list_display = ('user', 'leccion', 'porcentaje', 'completada', 'ultimo_acceso')
    list_filter = ('completada', 'leccion__seccion__curso')
    search_fields = ('user__email', 'user__name', 'leccion__titulo', 'leccion__seccion__curso__titulo')
    ordering = ('-ultimo_acceso',)


@admin.register(ComentarioCurso)
class ComentarioCursoAdmin(admin.ModelAdmin):
    list_display = ('user', 'curso', 'created_at')
    list_filter = ('curso',)
    search_fields = ('user__email', 'user__name', 'curso__titulo', 'contenido')
    ordering = ('-created_at',)


@admin.register(MediatecaItem)
class MediatecaItemAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'curso', 'tipo', 'publicado', 'orden')
    list_filter = ('tipo', 'publicado', 'curso')
    search_fields = ('titulo', 'curso__titulo', 'descripcion', 'url')
    ordering = ('curso__titulo', 'orden', 'titulo')
