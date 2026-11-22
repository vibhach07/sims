#!/usr/bin/env bash
set -euo pipefail

BACKUP="db_backup_$(date +%Y%m%d_%H%M%S).sqlite3"
echo "── Step 1: Backing up SQLite database → $BACKUP"
cp db.sqlite3 "$BACKUP"
echo "    Backup created: $BACKUP"

echo "── Step 2: Dumping data from SQLite"
source venv/bin/activate
python manage.py dumpdata \
  --exclude auth.permission \
  --exclude contenttypes \
  --natural-foreign \
  --natural-primary \
  --indent 2 \
  -o /tmp/sims_data_dump.json
echo "    Dump written to /tmp/sims_data_dump.json"

# Load DB params from .env
POSTGRES_DB=$(grep '^POSTGRES_DB=' .env | cut -d= -f2-)
POSTGRES_USER=$(grep '^POSTGRES_USER=' .env | cut -d= -f2-)
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
POSTGRES_PORT=$(grep '^POSTGRES_PORT=' .env | cut -d= -f2-)
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

TARGET_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"

echo "── Step 3: Applying migrations to PostgreSQL"
DATABASE_URL="$TARGET_URL" python manage.py migrate --noinput
echo "    Migrations applied."

echo "── Step 4: Loading data into PostgreSQL"
DATABASE_URL="$TARGET_URL" python manage.py loaddata /tmp/sims_data_dump.json
echo "    Data loaded."

echo "── Step 5: Verifying record counts in PostgreSQL"
DATABASE_URL="$TARGET_URL" python manage.py shell -c "
from django.contrib.auth.models import User
from courses.models import Course, Module, Lecture
from assessments.models import TestSeries, TestQuestion
from resources.models import StudyResource
from orders.models import Order
print(f'  Users: {User.objects.count()}')
print(f'  Courses: {Course.objects.count()}')
print(f'  Modules: {Module.objects.count()}')
print(f'  Lectures: {Lecture.objects.count()}')
print(f'  TestSeries: {TestSeries.objects.count()}')
print(f'  TestQuestions: {TestQuestion.objects.count()}')
print(f'  StudyResources: {StudyResource.objects.count()}')
print(f'  Orders: {Order.objects.count()}')
"

echo ""
echo "Migration complete. SQLite backup is at: $BACKUP"
