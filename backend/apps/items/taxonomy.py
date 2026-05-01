import json
import re
from pathlib import Path

from .models import Category


TAXONOMY_PATH = Path(__file__).resolve().parent / 'category_taxonomy_template.json'


def normalize_text(value: str) -> str:
    if not value:
        return ''
    value = value.strip().lower()
    value = value.replace('’', "'").replace('`', "'")
    value = re.sub(r'\s+', ' ', value)
    return value


def load_taxonomy_template():
    with TAXONOMY_PATH.open('r', encoding='utf-8') as file:
        return json.load(file)


def upsert_category(main_or_sub, parent=None):
    name_en = main_or_sub.get('name_en')
    name_uz = main_or_sub.get('name_uz')
    name_ru = main_or_sub.get('name_ru')
    name = main_or_sub.get('name') or name_uz or name_en or name_ru

    if parent:
        category = Category.objects.filter(parent=parent, name_en=name_en).first()
    else:
        category = Category.objects.filter(parent__isnull=True, name_en=name_en).first()

    if category:
        changed = False
        if category.name != name:
            category.name = name
            changed = True
        if category.name_uz != name_uz:
            category.name_uz = name_uz
            changed = True
        if category.name_en != name_en:
            category.name_en = name_en
            changed = True
        if category.name_ru != name_ru:
            category.name_ru = name_ru
            changed = True
        if category.parent_id != (parent.id if parent else None):
            category.parent = parent
            changed = True
        if changed:
            category.save()
        return category

    return Category.objects.create(
        parent=parent,
        name=name,
        name_uz=name_uz,
        name_en=name_en,
        name_ru=name_ru,
    )


def seed_category_taxonomy():
    data = load_taxonomy_template()
    created = 0
    updated_or_existing = 0

    for main in data.get('main_categories', []):
        existing_main = Category.objects.filter(parent__isnull=True, name_en=main.get('name_en')).first()
        main_category = upsert_category(main)
        if existing_main:
            updated_or_existing += 1
        else:
            created += 1

        for sub in main.get('subcategories', []):
            existing_sub = Category.objects.filter(parent=main_category, name_en=sub.get('name_en')).first()
            upsert_category(sub, parent=main_category)
            if existing_sub:
                updated_or_existing += 1
            else:
                created += 1

    return {'created': created, 'updated_or_existing': updated_or_existing}


def parse_suggestions(raw_suggestions):
    if not raw_suggestions:
        return []

    if isinstance(raw_suggestions, list):
        values = raw_suggestions
    else:
        values = [chunk.strip() for chunk in str(raw_suggestions).split(',')]

    cleaned = [value for value in values if value]
    seen = set()
    result = []
    for value in cleaned:
        normalized = normalize_text(value)
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(value)
    return result


def category_aliases(category):
    aliases = [category.name, category.name_uz, category.name_en, category.name_ru]
    return [normalize_text(alias) for alias in aliases if alias]


def match_category_by_text(text, categories):
    text_norm = normalize_text(text)
    if not text_norm:
        return None

    best = None
    best_score = 0

    for category in categories:
        aliases = category_aliases(category)
        if not aliases:
            continue

        score = 0
        for alias in aliases:
            if text_norm == alias:
                score = max(score, 100)
            elif text_norm in alias or alias in text_norm:
                score = max(score, 80)
            else:
                text_tokens = set(text_norm.split())
                alias_tokens = set(alias.split())
                overlap = text_tokens.intersection(alias_tokens)
                if overlap:
                    score = max(score, 50)

        if score > best_score:
            best = category
            best_score = score

    if best_score < 50:
        return None
    return best


def ensure_fallback_category():
    fallback = Category.objects.filter(parent__isnull=True, name_en='Other').first()
    if fallback:
        return fallback

    return Category.objects.create(
        name='Boshqa',
        name_uz='Boshqa',
        name_en='Other',
        name_ru='Другое',
        parent=None,
    )


def resolve_categories_from_suggestions(raw_suggestions):
    suggestions = parse_suggestions(raw_suggestions)
    all_categories = list(Category.objects.select_related('parent').all())

    matched = []
    for suggestion in suggestions:
        found = match_category_by_text(suggestion, all_categories)
        if found and found not in matched:
            matched.append(found)

    if not matched:
        fallback = ensure_fallback_category()
        return [fallback], fallback

    expanded = []
    for category in matched:
        if category not in expanded:
            expanded.append(category)
        if category.parent and category.parent not in expanded:
            expanded.append(category.parent)

    main_for_primary = next((cat for cat in expanded if cat.parent is None), None)
    if not main_for_primary:
        main_for_primary = ensure_fallback_category()

    return expanded, main_for_primary
