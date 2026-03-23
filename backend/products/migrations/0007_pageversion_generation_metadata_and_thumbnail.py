from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0006_characterreferencephoto"),
    ]

    operations = [
        migrations.AddField(
            model_name="pageversion",
            name="error_message",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pageversion",
            name="generation_job_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False),
        ),
        migrations.AddField(
            model_name="pageversion",
            name="generation_time_ms",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pageversion",
            name="seed",
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pageversion",
            name="thumbnail",
            field=models.ImageField(blank=True, null=True, upload_to="pages/"),
        ),
    ]
