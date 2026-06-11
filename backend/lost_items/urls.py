
from django.contrib import admin
from django.urls import path, include, re_path
from lost_items import settings
from lost_items import seo_views
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.conf.urls.static import static
from django.views.generic import TemplateView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('apps.users.urls')),
    #add swagger urls
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/', include('apps.items.urls')),
    path('api/', include('apps.chat.urls')),
    # SEO endpoints (must be matched before the SPA catch-all below)
    path('robots.txt', seo_views.robots_txt, name='robots'),
    path('sitemap.xml', seo_views.sitemap_xml, name='sitemap'),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [
    # Item detail pages get server-injected, item-specific SEO meta.
    re_path(r'^items/(?P<pk>\d+)/?$', seo_views.item_spa, name='item-spa'),
    # Everything else falls through to the client-rendered SPA shell.
    re_path(r'^(?!admin|auth|api|media|static|robots\.txt|sitemap\.xml).*$', TemplateView.as_view(template_name='index.html'), name='spa'),
]