"""
Import Job Tracker
Maintains background job progress state for multi-step processing and polling.
"""
import time
from typing import Dict, Any, Optional

# In-memory job state store (can be cached or persisted)
_JOB_STORE: Dict[str, Dict[str, Any]] = {}


def create_job(job_id: str, filename: str) -> Dict[str, Any]:
    job = {
        'id': job_id,
        'filename': filename,
        'status': 'queued',
        'progress': 0,
        'stage': 'queued',
        'message': 'Queued for processing...',
        'created_at': time.time(),
        'result': None,
        'error': None
    }
    _JOB_STORE[job_id] = job
    return job


def update_job_progress(job_id: str, stage: str, progress: int, message: str) -> None:
    if job_id in _JOB_STORE:
        _JOB_STORE[job_id]['stage'] = stage
        _JOB_STORE[job_id]['progress'] = progress
        _JOB_STORE[job_id]['message'] = message
        _JOB_STORE[job_id]['status'] = 'processing' if progress < 100 else 'completed'


def set_job_result(job_id: str, result: Dict[str, Any]) -> None:
    if job_id in _JOB_STORE:
        _JOB_STORE[job_id]['result'] = result
        _JOB_STORE[job_id]['status'] = 'completed'
        _JOB_STORE[job_id]['progress'] = 100
        _JOB_STORE[job_id]['message'] = 'Processing finished.'


def set_job_error(job_id: str, error_message: str) -> None:
    if job_id in _JOB_STORE:
        _JOB_STORE[job_id]['error'] = error_message
        _JOB_STORE[job_id]['status'] = 'failed'
        _JOB_STORE[job_id]['message'] = error_message


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    return _JOB_STORE.get(job_id)

