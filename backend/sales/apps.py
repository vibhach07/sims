from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sales'
    verbose_name = 'Sales, Revenue & Compliance'

    def ready(self):
        try:
            import sales.signals  # noqa
        except ImportError:
            pass
