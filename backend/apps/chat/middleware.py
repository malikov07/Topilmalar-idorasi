from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_user_from_token(token):
    """Resolve a simplejwt access token (passed as ?token=) to a User."""
    from rest_framework_simplejwt.tokens import AccessToken
    from apps.users.models import User
    try:
        access = AccessToken(token)
        return User.objects.get(id=access['user_id'])
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Authenticate a WebSocket connection from a JWT in the query string."""

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get('query_string', b'').decode())
        token = query.get('token', [None])[0]
        scope['user'] = await get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
