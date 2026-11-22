from rest_framework import permissions


class IsAdminOrEducator(permissions.BasePermission):
    """Allows access to staff, superusers, and users with role in [admin, superadmin, educator]."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.role in ['admin', 'superadmin', 'educator'])


class IsCourseOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission:
    - Staff / superuser can manage everything.
    - Educators can manage only courses they created (course.created_by == request.user).
    - Unowned courses (created_by is None) are admin-only.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.role in ['admin', 'superadmin', 'educator'])

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Check course ownership directly or via relation
        course = None
        if hasattr(obj, 'created_by'):
            course = obj
        elif hasattr(obj, 'course'):
            course = obj.course
        elif hasattr(obj, 'module') and hasattr(obj.module, 'course'):
            course = obj.module.course

        if course is None or course.created_by is None:
            return False

        return course.created_by == request.user
