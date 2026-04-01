from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CursoViewSet, MatriculaCursoViewSet, MatriculaRutaViewSet, RutaViewSet

router = DefaultRouter()
router.register(r'rutas', RutaViewSet, basename='ruta')
router.register(r'cursos', CursoViewSet, basename='curso')
router.register(r'matriculas-ruta', MatriculaRutaViewSet, basename='matricula-ruta')
router.register(r'matriculas-curso', MatriculaCursoViewSet, basename='matricula-curso')

app_name = 'cursos'

urlpatterns = [
    path('', include(router.urls)),
]
