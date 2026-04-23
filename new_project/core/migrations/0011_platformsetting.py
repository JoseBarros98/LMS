from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_user_dashboard_banner'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dashboard_banner', models.ImageField(blank=True, null=True, upload_to='dashboard_banners/')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Configuracion de plataforma',
                'verbose_name_plural': 'Configuraciones de plataforma',
            },
        ),
    ]
