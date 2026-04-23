from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    UserViewSet,
    RoleViewSet,
    dashboard_admin_summary,
    dashboard_summary,
    db_backups_download,
    db_backups_export,
    db_backups_generate,
    db_backups_import,
    db_backups_list,
    me,
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)

urlpatterns = router.urls + [
    path('me/', me, name='me'),
    path('dashboard/summary/', dashboard_summary, name='dashboard-summary'),
    path('dashboard/admin-summary/', dashboard_admin_summary, name='dashboard-admin-summary'),
    path('db-backups/', db_backups_list, name='db-backups-list'),
    path('db-backups/generate/', db_backups_generate, name='db-backups-generate'),
    path('db-backups/export/', db_backups_export, name='db-backups-export'),
    path('db-backups/import/', db_backups_import, name='db-backups-import'),
    path('db-backups/<str:filename>/download/', db_backups_download, name='db-backups-download'),
]