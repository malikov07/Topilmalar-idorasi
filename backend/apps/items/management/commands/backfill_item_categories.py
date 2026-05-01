from django.core.management.base import BaseCommand

from apps.items.models import Item
from apps.items.taxonomy import resolve_categories_from_suggestions


class Command(BaseCommand):
    help = 'Backfill missing categories for existing items using current AI + taxonomy flow.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Analyze items and print what would change without saving anything.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Optional limit for the number of items to process (0 = no limit).',
        )
        parser.add_argument(
            '--include-processed',
            action='store_true',
            help='Include items already marked as processed.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        include_processed = options['include_processed']

        items = (
            Item.objects.select_related('category', 'user')
            .prefetch_related('images')
            .filter(category__isnull=True)
            .order_by('id')
        )

        if not include_processed:
            items = items.filter(is_processed=False)

        if limit and limit > 0:
            items = items[:limit]

        total = 0
        updated = 0
        skipped = 0

        for item in items:
            total += 1

            image_obj = item.images.first()
            if not image_obj:
                skipped += 1
                self.stdout.write(self.style.WARNING(f'SKIP #{item.id}: no images'))
                continue

            try:
                from apps.items.utils import analyze_item_image

                result = analyze_item_image(image_obj.image.path)
                raw_suggestions = result.get('suggested_categories', [])
                analysis_source = 'image-analysis'
            except Exception as exc:
                skipped += 1
                self.stdout.write(self.style.WARNING(f'SKIP #{item.id}: analysis failed ({exc})'))
                continue

            resolved_categories, main_category = resolve_categories_from_suggestions(raw_suggestions)

            if not resolved_categories:
                skipped += 1
                self.stdout.write(self.style.WARNING(f'SKIP #{item.id}: no category match from {analysis_source}'))
                continue

            if dry_run:
                self.stdout.write(
                    f'DRY #{item.id}: {item.title} -> {main_category.name} | '
                    f'cats={[cat.name for cat in resolved_categories]}'
                )
                continue

            item.categories.add(*resolved_categories)
            item.category = main_category
            item.is_processed = True
            item.save(update_fields=['category', 'is_processed', 'updated_at'])
            updated += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'UPDATED #{item.id}: {item.title} -> {main_category.name}'
                )
            )

        summary = f'Total scanned: {total}, updated: {updated}, skipped: {skipped}'
        if dry_run:
            self.stdout.write(self.style.WARNING(f'DRY RUN COMPLETE. {summary}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'BACKFILL COMPLETE. {summary}'))
