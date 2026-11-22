from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

from .models import StudyResource, UserResourceEntitlement
from .serializers import StudyResourceSerializer
from users.models import log_action, Notification


class IsAdminOrEducator(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        return hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin', 'educator']


class IsResourceOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin']):
            return True
        return obj.created_by == request.user


class StudyResourceListView(generics.ListCreateAPIView):
    serializer_class = StudyResourceSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrEducator()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        user = self.request.user
        my_resources = self.request.query_params.get('my_resources') == 'true'

        if my_resources and user.is_authenticated:
            if user.is_staff or (hasattr(user, 'profile') and user.profile.role in ['admin', 'superadmin']):
                qs = StudyResource.objects.all()
            else:
                qs = StudyResource.objects.filter(created_by=user)
        elif user.is_authenticated and (user.is_staff or (hasattr(user, 'profile') and user.profile.role in ['admin', 'superadmin'])):
            qs = StudyResource.objects.all()
        else:
            qs = StudyResource.objects.filter(is_published=True)

        exam = self.request.query_params.get('exam')
        category = self.request.query_params.get('category')
        if exam and exam.lower() != 'all':
            qs = qs.filter(exam__icontains=exam)
        if category:
            qs = qs.filter(category=category)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        is_admin = user.is_staff or user.is_superuser or (hasattr(user, 'profile') and user.profile.role in ['admin', 'superadmin'])
        # If educator creates, defaults to draft
        resource = serializer.save(
            created_by=user,
            review_status='approved' if is_admin else 'draft',
            is_published=True if is_admin else False
        )
        log_action(
            actor=user,
            action='create',
            object_type='study_resource',
            object_id=resource.id,
            object_title=resource.title,
            owner=resource.created_by,
            changes={'title': ['', resource.title]}
        )


class StudyResourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudyResourceSerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsResourceOwnerOrAdmin()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or (hasattr(user, 'profile') and user.profile.role in ['admin', 'superadmin'])):
            return StudyResource.objects.all()
        if user.is_authenticated:
            return StudyResource.objects.filter(models.Q(is_published=True) | models.Q(created_by=user))
        return StudyResource.objects.filter(is_published=True)

    def perform_update(self, serializer):
        old_title = serializer.instance.title
        resource = serializer.save()
        log_action(
            actor=self.request.user,
            action='update',
            object_type='study_resource',
            object_id=resource.id,
            object_title=resource.title,
            owner=resource.created_by,
            changes={'title': [old_title, resource.title]}
        )

    def perform_destroy(self, instance):
        log_action(
            actor=self.request.user,
            action='delete',
            object_type='study_resource',
            object_id=instance.id,
            object_title=instance.title,
            owner=instance.created_by,
            changes={'deleted': [instance.title, None]}
        )
        instance.delete()


class StudyResourceSubmitReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        resource = get_object_or_404(StudyResource, slug=slug)
        is_admin = request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'superadmin'])
        if not is_admin and resource.created_by != request.user:
            return Response({'error': 'You do not own this resource.'}, status=status.HTTP_403_FORBIDDEN)

        if resource.review_status not in ['draft', 'rejected']:
            return Response({'error': f'Cannot submit review from status {resource.review_status}.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = resource.review_status
        resource.review_status = 'pending'
        resource.save()

        log_action(
            actor=request.user,
            action='submit_review',
            object_type='study_resource',
            object_id=resource.id,
            object_title=resource.title,
            owner=resource.created_by,
            changes={'review_status': [old_status, 'pending']}
        )

        return Response({'message': 'Resource submitted for review.', 'review_status': resource.review_status})


class StudyResourceReviewDecisionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, slug):
        resource = get_object_or_404(StudyResource, slug=slug)
        decision = request.data.get('decision')
        note = request.data.get('note', '').strip()

        if decision not in ['approve', 'reject']:
            return Response({'error': 'decision must be approve or reject.'}, status=status.HTTP_400_BAD_REQUEST)

        if decision == 'reject' and not note:
            return Response({'error': 'A note is required when rejecting content.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = resource.review_status
        old_published = resource.is_published

        if decision == 'approve':
            resource.review_status = 'approved'
            resource.is_published = True
            resource.reviewed_by = request.user
            resource.reviewed_at = timezone.now()
            resource.review_note = note
            resource.save()

            if resource.created_by:
                Notification.objects.create(
                    user=resource.created_by,
                    title='Study Resource Approved',
                    body=f'Your resource "{resource.title}" has been approved and is now live!',
                    link=f'/educator/resources'
                )
        else:
            resource.review_status = 'rejected'
            resource.reviewed_by = request.user
            resource.reviewed_at = timezone.now()
            resource.review_note = note
            resource.save()

            if resource.created_by:
                Notification.objects.create(
                    user=resource.created_by,
                    title='Study Resource Rejected',
                    body=f'Your resource "{resource.title}" review was rejected: {note}',
                    link=f'/educator/resources'
                )

        log_action(
            actor=request.user,
            action=decision,
            object_type='study_resource',
            object_id=resource.id,
            object_title=resource.title,
            owner=resource.created_by,
            changes={
                'review_status': [old_status, resource.review_status],
                'is_published': [old_published, resource.is_published],
                'note': ['', note]
            }
        )

        return Response({
            'message': f'Resource review completed: {decision}.',
            'review_status': resource.review_status,
            'is_published': resource.is_published
        })


class StudyResourceOwnershipTransferView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, slug=None):
        to_user_id = request.data.get('to_user')
        if not to_user_id:
            return Response({'error': 'to_user is required.'}, status=status.HTTP_400_BAD_REQUEST)

        to_user = get_object_or_404(User, id=to_user_id)

        resource_slugs = request.data.get('slugs') or request.data.get('ids')
        if slug:
            resource_slugs = [slug]
        elif not resource_slugs:
            return Response({'error': 'Specify resource slug or slugs/ids list.'}, status=status.HTTP_400_BAD_REQUEST)

        resources = StudyResource.objects.filter(models.Q(slug__in=resource_slugs) | models.Q(id__in=[s for s in resource_slugs if str(s).isdigit()]))
        transferred_count = 0

        for resource in resources:
            old_owner = resource.created_by
            resource.created_by = to_user
            resource.save()
            transferred_count += 1

            log_action(
                actor=request.user,
                action='transfer_ownership',
                object_type='study_resource',
                object_id=resource.id,
                object_title=resource.title,
                owner=to_user,
                changes={'owner': [old_owner.email if old_owner else None, to_user.email]}
            )

            if old_owner and old_owner != to_user:
                Notification.objects.create(
                    user=old_owner,
                    title='Resource Ownership Transferred',
                    body=f'Ownership of "{resource.title}" was transferred to {to_user.email} by administrator.',
                    link='/educator/resources'
                )
            Notification.objects.create(
                user=to_user,
                title='Resource Ownership Assigned',
                body=f'You have been assigned ownership of resource "{resource.title}".',
                link='/educator/resources'
            )

        return Response({'message': f'Successfully transferred {transferred_count} resource(s) to {to_user.email}.'})


class DownloadResourceView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        resource = get_object_or_404(StudyResource, slug=slug)
        if resource.is_paid:
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
            has_entitlement = UserResourceEntitlement.objects.filter(user=request.user, resource=resource).exists()
            if not has_entitlement:
                return Response({'error': 'Purchase required for this study resource.'}, status=status.HTTP_403_FORBIDDEN)
        
        resource.downloads_count += 1
        resource.save(update_fields=['downloads_count'])
        return Response({'download_url': resource.file_url, 'downloads_count': resource.downloads_count})
