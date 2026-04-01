from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CursoViewSet,
    MatriculaCursoViewSet,
    MatriculaRutaViewSet,
    ProgresoLeccionViewSet,
    RutaViewSet,
    SeccionViewSet,
    LeccionViewSet,
    ComentarioCursoViewSet,
    MediatecaItemViewSet,
)

router = DefaultRouter()
router.register(r'rutas', RutaViewSet, basename='ruta')
router.register(r'cursos', CursoViewSet, basename='curso')
router.register(r'matriculas-ruta', MatriculaRutaViewSet, basename='matricula-ruta')
router.register(r'matriculas-curso', MatriculaCursoViewSet, basename='matricula-curso')
router.register(r'progreso-leccion', ProgresoLeccionViewSet, basename='progreso-leccion')
router.register(r'secciones', SeccionViewSet, basename='seccion')
router.register(r'lecciones', LeccionViewSet, basename='leccion')
router.register(r'comentarios-curso', ComentarioCursoViewSet, basename='comentario-curso')
router.register(r'mediateca-item', MediatecaItemViewSet, basename='mediateca-item')

app_name = 'cursos'

urlpatterns = [
    path('', include(router.urls)),
]
