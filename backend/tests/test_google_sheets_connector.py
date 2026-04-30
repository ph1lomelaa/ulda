from app.services.google_sheets_connector import build_export_url, extract_sheet_text


def test_build_export_url_uses_spreadsheet_id_and_gid() -> None:
    url = build_export_url("sheet123", "42")
    assert url == "https://docs.google.com/spreadsheets/d/sheet123/export?format=csv&gid=42"


def test_extract_sheet_text_formats_columns_and_rows(monkeypatch) -> None:
    def fake_fetch_csv_text(_: dict[str, str]) -> str:
        return "Name,Role\nAltynai,Frontend\nMuslima,Backend\n"

    monkeypatch.setattr("app.services.google_sheets_connector.fetch_csv_text", fake_fetch_csv_text)

    text = extract_sheet_text(
        {
            "spreadsheet_id": "sheet123",
            "sheet_gid": "0",
            "sheet_name": "Team",
        }
    )

    assert "Google Sheet Snapshot: Team" in text
    assert "Columns: Name, Role" in text
    assert "Row 1: Name=Altynai; Role=Frontend" in text
    assert "Row 2: Name=Muslima; Role=Backend" in text
