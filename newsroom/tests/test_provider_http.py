from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime

from newsroom.providers.http import _NoRedirectHandler, _retry_after_seconds


class ProviderHTTPTests(unittest.TestCase):
    def test_redirects_are_rejected_before_credentials_can_cross_origin(self) -> None:
        handler = _NoRedirectHandler()
        request = handler.redirect_request(
            object(), None, 302, "Found", {}, "https://example.invalid/collect"
        )
        self.assertIsNone(request)

    def test_retry_after_is_bounded_and_supports_seconds_or_http_dates(self) -> None:
        self.assertEqual(5.0, _retry_after_seconds("5"))
        self.assertEqual(120.0, _retry_after_seconds("9999"))
        future = format_datetime(datetime.now(timezone.utc) + timedelta(seconds=30))
        value = _retry_after_seconds(future)
        self.assertIsNotNone(value)
        self.assertGreaterEqual(float(value), 20.0)
        self.assertLessEqual(float(value), 120.0)
        self.assertIsNone(_retry_after_seconds("not-a-date"))


if __name__ == "__main__":
    unittest.main()
