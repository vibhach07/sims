import json
import hashlib
from django.utils.cache import patch_cache_control
from rest_framework import permissions, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from users.permissions import IsAdminUser
from .models import SiteSettings, Centre
from .serializers import (
    SiteSettingsSerializer,
    SiteSettingsAdminSerializer,
    CentrePublicSerializer,
    CentreAdminSerializer,
    PublicSiteConfigSerializer
)

class PublicSiteConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        settings = SiteSettings.get_solo()
        centres = Centre.objects.filter(is_active=True).order_by('-is_primary', 'order', 'id')
        
        serializer = PublicSiteConfigSerializer({
            'settings': settings,
            'centres': centres
        })
        
        # Compute ETag from deterministic serialized JSON content hash
        serialized_json = json.dumps(serializer.data, sort_keys=True, separators=(',', ':'))
        etag = f'W/"{hashlib.md5(serialized_json.encode("utf-8")).hexdigest()}"'

        if_none_match = request.headers.get('If-None-Match')
        if if_none_match and if_none_match == etag:
            response = Response(status=status.HTTP_304_NOT_MODIFIED)
        else:
            response = Response(serializer.data)

        # Cache for 5 minutes (300 seconds)
        patch_cache_control(response, public=True, max_age=300)
        response['ETag'] = etag
        return response


class AdminSiteSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        settings = SiteSettings.get_solo()
        return Response(SiteSettingsAdminSerializer(settings).data)

    def put(self, request):
        settings = SiteSettings.get_solo()
        serializer = SiteSettingsAdminSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminCentreListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    queryset = Centre.objects.all().order_by('-is_primary', 'order', 'id')
    serializer_class = CentreAdminSerializer


class AdminCentreDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = Centre.objects.all()
    serializer_class = CentreAdminSerializer
