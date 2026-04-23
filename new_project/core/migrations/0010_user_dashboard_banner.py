from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_dashboard_student_granularity'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='dashboard_banner',
            field=models.ImageField(blank=True, null=True, upload_to='dashboard_banners/'),
        ),
    ]
