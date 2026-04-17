from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import UserViewSet, RoleViewSet, dashboard_admin_summary, dashboard_summary, me

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)

urlpatterns = router.urls + [
    path('me/', me, name='me'),
    path('dashboard/summary/', dashboard_summary, name='dashboard-summary'),
    path('dashboard/admin-summary/', dashboard_admin_summary, name='dashboard-admin-summary'),
]