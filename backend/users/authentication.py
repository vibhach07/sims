from rest_framework.authentication import TokenAuthentication

class CookieOrHeaderTokenAuthentication(TokenAuthentication):
    """
    Dual-mode Authentication:
    1. Authenticates from standard Authorization header (Token <key> or Bearer <key>)
    2. Authenticates from secure HttpOnly 'auth_token' cookie
    """
    def authenticate(self, request):
        # 1. Header priority
        auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        if auth_header:
            return super().authenticate(request)

        # 2. HttpOnly Cookie fallback
        cookie_token = request.COOKIES.get('auth_token')
        if cookie_token:
            return self.authenticate_credentials(cookie_token)

        return None

