from django.core.management import BaseCommand, call_command

from apps.items.models import Category


class Command(BaseCommand):
    help = 'Delete all categories, seed taxonomy from JSON, and optionally backfill all items.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would happen without deleting or backfilling.',
        )
        parser.add_argument(
            '--backfill',
            action='store_true',
            help='Backfill items after reseeding categories.',
        )
        parser.add_argument(
            '--include-processed',
            action='store_true',
            help='Include items already marked processed when backfilling.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Optional limit for number of items to backfill (0 = no limit).',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        backfill = options['backfill']
        include_processed = options['include_processed']
        limit = options['limit']

        current_count = Category.objects.count()
        self.stdout.write(f'Current category count: {current_count}')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN: no categories will be deleted.'))
            self.stdout.write(self.style.WARNING('DRY RUN: no taxonomy will be seeded.'))
            if backfill:
                self.stdout.write(self.style.WARNING('DRY RUN: backfill would run after reseeding taxonomy.'))
            return

        Category.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Deleted all categories.'))

        call_command('seed_categories')

        if backfill:
            backfill_args = []
            if include_processed:
                backfill_args.append('--include-processed')
            if limit and limit > 0:
                backfill_args.extend(['--limit', str(limit)])
            self.stdout.write(self.style.SUCCESS('Starting item backfill...'))
            call_command('backfill_item_categories', *backfill_args)
        else:
            self.stdout.write(self.style.SUCCESS('Category reset complete. Run `python manage.py backfill_item_categories --include-processed` to categorize items.'))
