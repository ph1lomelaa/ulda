"""Tests for Google Sheets URL parsing functionality."""

import pytest

from app.services.google_sheets_connector import parse_google_sheets_url


class TestParseGoogleSheetsUrl:
    """Test cases for parse_google_sheets_url function."""

    def test_parse_url_with_gid(self):
        """Test parsing URL with gid parameter."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit#gid=0"
        spreadsheet_id, sheet_gid = parse_google_sheets_url(url)
        assert spreadsheet_id == "1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU"
        assert sheet_gid == "0"

    def test_parse_url_with_gid_nonzero(self):
        """Test parsing URL with non-zero gid."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit#gid=1234567890"
        spreadsheet_id, sheet_gid = parse_google_sheets_url(url)
        assert spreadsheet_id == "1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU"
        assert sheet_gid == "1234567890"

    def test_parse_url_with_gid_in_query_params(self):
        """Test parsing URL with gid in query parameters."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit?usp=sharing&gid=123"
        spreadsheet_id, sheet_gid = parse_google_sheets_url(url)
        assert spreadsheet_id == "1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU"
        assert sheet_gid == "123"

    def test_parse_url_without_gid_defaults_to_zero(self):
        """Test parsing URL without gid defaults to 0."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit"
        spreadsheet_id, sheet_gid = parse_google_sheets_url(url)
        assert spreadsheet_id == "1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU"
        assert sheet_gid == "0"

    def test_parse_url_with_hyphen_and_underscore_in_id(self):
        """Test parsing URL with hyphen and underscore in ID."""
        url = "https://docs.google.com/spreadsheets/d/1Bx_iMVs-0XRA5nFMoon-9PsWRinZ_TwostLsSXwMoHgHbgU/edit#gid=0"
        spreadsheet_id, sheet_gid = parse_google_sheets_url(url)
        assert spreadsheet_id == "1Bx_iMVs-0XRA5nFMoon-9PsWRinZ_TwostLsSXwMoHgHbgU"
        assert sheet_gid == "0"

    def test_parse_url_with_spaces(self):
        """Test parsing URL with leading/trailing spaces."""
        url = "  https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit#gid=42  "
        spreadsheet_id, sheet_gid = parse_google_sheets_url(url)
        assert spreadsheet_id == "1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU"
        assert sheet_gid == "42"

    def test_parse_invalid_url_raises_error(self):
        """Test parsing invalid URL raises ValueError."""
        url = "https://example.com/invalid"
        with pytest.raises(ValueError, match="Invalid Google Sheets URL"):
            parse_google_sheets_url(url)

    def test_parse_empty_url_raises_error(self):
        """Test parsing empty URL raises ValueError."""
        url = ""
        with pytest.raises(ValueError, match="Invalid Google Sheets URL"):
            parse_google_sheets_url(url)

    def test_parse_spreadsheet_id_only(self):
        """Test parsing with only spreadsheet ID."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU"
        spreadsheet_id, sheet_gid = parse_google_sheets_url(url)
        assert spreadsheet_id == "1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU"
        assert sheet_gid == "0"

    def test_parse_url_with_ampersand_gid(self):
        """Test parsing URL with ampersand before gid."""
        url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU/edit?usp=sharing&gid=999"
        spreadsheet_id, sheet_gid = parse_google_sheets_url(url)
        assert spreadsheet_id == "1BxiMVs0XRA5nFMoon9PsWRinZTwostLsSXwMoHgHbgU"
        assert sheet_gid == "999"
