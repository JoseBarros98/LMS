from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import UserViewSet, RoleViewSet, me

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)

urlpatterns = router.urls + [
    path('me/', me, name='me'),
]