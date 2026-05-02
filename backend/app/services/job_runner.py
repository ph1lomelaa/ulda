import threading
import time
from datetime import UTC, datetime

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.source_sync_run import SourceSyncRun
from app.services.source_ingestion import process_uploaded_document


class SourceSyncJobRunner:
    def __init__(self, poll_interval_seconds: float = 2.0) -> None:
        self._poll_interval_seconds = poll_interval_seconds
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._active_job_ids: set[str] = set()
        self._lock = threading.Lock()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._recover_processing_jobs()
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="ulda-source-sync-runner")
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def _recover_processing_jobs(self) -> None:
        db = SessionLocal()
        try:
            processing_runs = db.scalars(
                select(SourceSyncRun).where(SourceSyncRun.status == "processing")
            ).all()
            for run in processing_runs:
                run.status = "queued"
                run.stage = "queued"
                run.progress_percent = 0
                run.started_at = None
            db.commit()
        finally:
            db.close()

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            self._schedule_next_job()
            time.sleep(self._poll_interval_seconds)

    def _schedule_next_job(self) -> None:
        db = SessionLocal()
        try:
            next_job = db.scalar(
                select(SourceSyncRun)
                .where(SourceSyncRun.status == "queued")
                .order_by(SourceSyncRun.created_at.asc())
            )
            if next_job is None:
                return

            with self._lock:
                if next_job.id in self._active_job_ids:
                    return
                self._active_job_ids.add(next_job.id)

            worker = threading.Thread(
                target=self._execute_job,
                args=(next_job.id, next_job.source_id, next_job.document_id),
                daemon=True,
                name=f"ulda-sync-{next_job.id}",
            )
            worker.start()
        finally:
            db.close()

    def _execute_job(self, sync_run_id: str, source_id: str, document_id: str) -> None:
        try:
            process_uploaded_document(source_id=source_id, document_id=document_id, sync_run_id=sync_run_id)
        finally:
            with self._lock:
                self._active_job_ids.discard(sync_run_id)


source_sync_job_runner = SourceSyncJobRunner()
