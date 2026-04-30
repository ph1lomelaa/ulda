import csv
import io
import json
from pathlib import Path

from pypdf import PdfReader

from app.services.text_sanitizer import sanitize_text


SUPPORTED_FILE_TYPES = {
    ".csv": "csv",
    ".json": "json",
    ".md": "text",
    ".pdf": "pdf",
    ".txt": "text",
}


def detect_source_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_FILE_TYPES:
        raise ValueError(f"Unsupported file type: {suffix or 'unknown'}")
    return suffix.lstrip(".")


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".txt", ".md"}:
        return sanitize_text(path.read_text(encoding="utf-8", errors="replace"))
    if suffix == ".json":
        payload = json.loads(path.read_text(encoding="utf-8", errors="replace"))
        return sanitize_text(json.dumps(payload, indent=2, ensure_ascii=True))
    if suffix == ".csv":
        return _read_csv(path)
    if suffix == ".pdf":
        return _read_pdf(path)
    raise ValueError(f"Unsupported file type: {suffix or 'unknown'}")


def _read_csv(path: Path) -> str:
    buffer = io.StringIO()
    with path.open("r", encoding="utf-8", errors="replace", newline="") as csv_file:
        reader = csv.reader(csv_file)
        for row in reader:
            buffer.write(" | ".join(cell.strip() for cell in row))
            buffer.write("\n")
    return sanitize_text(buffer.getvalue())


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = [sanitize_text((page.extract_text() or "").strip()) for page in reader.pages]
    return "\n\n".join(page for page in pages if page)
