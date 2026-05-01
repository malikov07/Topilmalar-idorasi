from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('items', '0009_category_name_en_category_name_ru_category_name_uz_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='item',
            name='ai_labels',
        ),
        migrations.RemoveField(
            model_name='item',
            name='colors',
        ),
        migrations.DeleteModel(
            name='Color',
        ),
    ]
