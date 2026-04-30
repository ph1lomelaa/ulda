import csv
import io
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


def build_export_url(spreadsheet_id: str, sheet_gid: str) -> str:
    clean_spreadsheet_id = spreadsheet_id.strip()
    clean_sheet_gid = sheet_gid.strip()
    if not clean_spreadsheet_id:
        raise ValueError("Spreadsheet ID is required")
    if not clean_sheet_gid:
        raise ValueError("Sheet GID is required")
    return (
        "https://docs.google.com/spreadsheets/d/"
        f"{clean_spreadsheet_id}/export?format=csv&gid={clean_sheet_gid}"
    )


def fetch_csv_text(config: dict[str, str]) -> str:
    export_url = build_export_url(config["spreadsheet_id"], config["sheet_gid"])
    try:
        with urlopen(export_url, timeout=15) as response:
            payload = response.read().decode("utf-8-sig", errors="replace")
    except HTTPError as exc:
        raise ValueError(f"Google Sheets request failed with status {exc.code}") from exc
    except URLError as exc:
        raise ValueError("Google Sheets is unreachable or the sheet is not public") from exc

    if not payload.strip():
        raise ValueError("Google Sheets returned an empty sheet")
    return payload


def validate_connection(config: dict[str, str]) -> None:
    fetch_csv_text(config)


def extract_sheet_text(config: dict[str, str]) -> str:
    csv_text = fetch_csv_text(config)
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    if not rows:
        raise ValueError("Google Sheets returned no rows")

    sheet_name = (config.get("sheet_name") or "Sheet").strip()
    lines = [
        f"Google Sheet Snapshot: {sheet_name}",
        f"Spreadsheet ID: {config['spreadsheet_id']}",
        f"Sheet GID: {config['sheet_gid']}",
        "",
    ]

    header = rows[0]
    if header:
        lines.append("Columns: " + ", ".join(cell.strip() or "(blank)" for cell in header))
        lines.append("")

    for index, row in enumerate(rows[1:], start=1):
        values = []
        for column_index, value in enumerate(row):
            column_name = header[column_index].strip() if column_index < len(header) and header[column_index].strip() else f"column_{column_index + 1}"
            values.append(f"{column_name}={value.strip()}")
        if values:
            lines.append(f"Row {index}: " + "; ".join(values))

    text = "\n".join(lines).strip()
    if not text:
        raise ValueError("Google Sheets snapshot is empty after parsing")
    return text
