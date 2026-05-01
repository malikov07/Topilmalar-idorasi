from django.core.management.base import BaseCommand

from apps.items.taxonomy import seed_category_taxonomy


class Command(BaseCommand):
    help = 'Seed/update multilingual category taxonomy (main + sub categories).'

    def handle(self, *args, **options):
        result = seed_category_taxonomy()
        self.stdout.write(self.style.SUCCESS(
            f"Category taxonomy synced. Created: {result['created']}, Updated/Existing: {result['updated_or_existing']}"
        ))
