from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_alter_order_delivery_address"),
    ]

    operations = [
        migrations.AlterField(
            model_name="retrypackorder",
            name="pack_price_gel",
            field=models.DecimalField(decimal_places=2, default=1, max_digits=10),
        ),
    ]
