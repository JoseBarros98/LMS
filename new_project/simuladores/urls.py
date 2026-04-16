from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SimuladorViewSet

router = DefaultRouter()
router.register(r'simuladores', SimuladorViewSet, basename='simulador')

urlpatterns = [
    path('', include(router.urls)),
]
