"""Server-side SEO for the React SPA.

Django serves the built `frontend/dist/index.html`. For item detail pages we
replace the `<!--SEO_START-->...<!--SEO_END-->` block in that shell with
item-specific meta (title, description, Open Graph, Twitter, canonical, JSON-LD)
so search engines and social link-preview bots see real content even though the
page is otherwise client-rendered.
"""

import html
import json
import re

from django.conf import settings
from django.http import HttpResponse
from django.utils.text import Truncator
from django.views.decorators.http import require_GET

from apps.items.models import Item

DIST_INDEX = settings.BASE_DIR.parent / 'frontend' / 'dist' / 'index.html'
SEO_BLOCK_RE = re.compile(r'<!--SEO_START-->.*?<!--SEO_END-->', re.DOTALL)
SITE_URL = getattr(settings, 'SITE_URL', 'https://topilmalar.polito.uz').rstrip('/')
DEFAULT_IMAGE = f'{SITE_URL}/img/logo.png'

DEFAULT_TITLE = "Topilmalar — yo'qotilgan va topilgan narsalar platformasi"
DEFAULT_DESCRIPTION = (
    "O'zbekistonda yo'qolgan va topib olingan narsalar uchun platforma. "
    "E'lon joylang, xaritadan qidiring va egasini toping."
)


def _read_index():
    try:
        return DIST_INDEX.read_text(encoding='utf-8')
    except FileNotFoundError:
        return None


def _esc(value):
    return html.escape(str(value or ''), quote=True)


def _build_meta(*, title, description, url, image, og_type='website', jsonld=None):
    title_e, desc_e, url_e, image_e = _esc(title), _esc(description), _esc(url), _esc(image)
    tags = [
        '<!--SEO_START-->',
        f'<title>{title_e}</title>',
        f'<meta name="description" content="{desc_e}" />',
        f'<link rel="canonical" href="{url_e}" />',
        '<meta name="robots" content="index, follow" />',
        '<meta property="og:site_name" content="Topilmalar" />',
        f'<meta property="og:type" content="{_esc(og_type)}" />',
        f'<meta property="og:title" content="{title_e}" />',
        f'<meta property="og:description" content="{desc_e}" />',
        f'<meta property="og:url" content="{url_e}" />',
        f'<meta property="og:image" content="{image_e}" />',
        '<meta property="og:locale" content="uz_UZ" />',
        '<meta property="og:locale:alternate" content="ru_RU" />',
        '<meta property="og:locale:alternate" content="en_US" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{title_e}" />',
        f'<meta name="twitter:description" content="{desc_e}" />',
        f'<meta name="twitter:image" content="{image_e}" />',
        '<meta name="theme-color" content="#1E85FF" />',
    ]
    if jsonld:
        tags.append(
            '<script type="application/ld+json">'
            + json.dumps(jsonld, ensure_ascii=False)
            + '</script>'
        )
    tags.append('<!--SEO_END-->')
    return '\n    '.join(tags)


def _render(meta_html):
    index = _read_index()
    if index is None:
        return HttpResponse(
            '<!doctype html><title>Topilmalar</title><h1>Topilmalar</h1>'
            '<p>Frontend not built yet.</p>',
            content_type='text/html',
        )
    # Use a replacement function so backslashes/groups in the meta aren't interpreted.
    rendered = SEO_BLOCK_RE.sub(lambda _m: meta_html, index, count=1)
    return HttpResponse(rendered, content_type='text/html')


def _render_default():
    return _render(_build_meta(
        title=DEFAULT_TITLE,
        description=DEFAULT_DESCRIPTION,
        url=f'{SITE_URL}/',
        image=DEFAULT_IMAGE,
        og_type='website',
    ))


@require_GET
def item_spa(request, pk):
    item = (
        Item.objects
        .filter(pk=pk)
        .select_related('user')
        .prefetch_related('images')
        .first()
    )
    if not item:
        # Unknown item: serve the shell with defaults; the SPA shows its own 404.
        return _render_default()

    image = DEFAULT_IMAGE
    first_image = item.images.first()
    if first_image and getattr(first_image.image, 'url', None):
        image = f'{SITE_URL}{first_image.image.url}'

    raw_desc = (item.description or '').strip().replace('\n', ' ')
    if not raw_desc:
        status_word = 'Topib olingan' if item.status == 'FOUND' else "Yo'qolgan"
        raw_desc = f'{status_word}: {item.title}. Manzil: {item.location_address}.'
    description = Truncator(raw_desc).chars(160)

    url = f'{SITE_URL}/items/{item.id}'
    title = f'{item.title} — Topilmalar'

    jsonld = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': item.title,
        'description': description,
        'url': url,
        'image': image,
    }
    if item.created_at:
        jsonld['datePublished'] = item.created_at.isoformat()

    meta = _build_meta(
        title=title, description=description, url=url, image=image,
        og_type='article', jsonld=jsonld,
    )
    return _render(meta)


@require_GET
def robots_txt(request):
    lines = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api',
        f'Sitemap: {SITE_URL}/sitemap.xml',
    ]
    return HttpResponse('\n'.join(lines) + '\n', content_type='text/plain')


@require_GET
def sitemap_xml(request):
    items = (
        Item.objects.filter(is_resolved=False)
        .order_by('-created_at')
        .values('id', 'updated_at')
    )

    rows = [
        (f'{SITE_URL}/', None, 'daily', '1.0'),
        (f'{SITE_URL}/items', None, 'daily', '0.8'),
    ]
    for it in items:
        lastmod = it['updated_at'].date().isoformat() if it['updated_at'] else None
        rows.append((f"{SITE_URL}/items/{it['id']}", lastmod, 'weekly', '0.6'))

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, freq, prio in rows:
        parts.append('  <url>')
        parts.append(f'    <loc>{_esc(loc)}</loc>')
        if lastmod:
            parts.append(f'    <lastmod>{lastmod}</lastmod>')
        parts.append(f'    <changefreq>{freq}</changefreq>')
        parts.append(f'    <priority>{prio}</priority>')
        parts.append('  </url>')
    parts.append('</urlset>')
    return HttpResponse('\n'.join(parts), content_type='application/xml')
