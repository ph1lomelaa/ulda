from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.services.job_runner import source_sync_job_runner


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.on_event("startup")
def create_storage_dirs() -> None:
    settings.upload_storage_path.mkdir(parents=True, exist_ok=True)
    source_sync_job_runner.start()


@app.on_event("shutdown")
def stop_background_workers() -> None:
    source_sync_job_runner.stop()


@app.get("/")
def healthcheck():
    return {"status": "ok", "service": settings.app_name}
