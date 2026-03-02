from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0003_alter_book_slug"),
    ]

    operations = [
        migrations.AlterField(
            model_name="characterversion",
            name="generated_image",
            field=models.ImageField(blank=True, null=True, upload_to="characters/"),
        ),
        migrations.AlterField(
            model_name="coverversion",
            name="generated_image",
            field=models.ImageField(blank=True, null=True, upload_to="covers/"),
        ),
    ]
