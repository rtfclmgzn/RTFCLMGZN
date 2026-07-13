from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

from ..security.vault import CredentialVault


class MetaConnectorError(RuntimeError):
    pass


@dataclass(frozen=True)
class MetaPublishResult:
    channel: str
    remote_id: str
    raw: dict[str, Any]


class MetaConnector:
    """Optional Facebook Page and Instagram publishing connector.

    This connector is inert unless the corresponding config flags are enabled and
    credentials have been stored in the local DPAPI vault. It never runs during
    platform installation.
    """

    def __init__(self, config: dict[str, Any], vault: CredentialVault | None = None):
        self.config = config
        self.vault = vault or CredentialVault()
        distribution = config["distribution"]
        self.base = str(distribution.get("meta_graph_base") or "https://graph.facebook.com").rstrip("/")
        self.version = str(distribution.get("meta_graph_version") or "v25.0").strip("/")

    def _post(self, path: str, data: dict[str, str], timeout: int = 60) -> dict[str, Any]:
        token = self.vault.get("meta_access_token")
        if not token:
            raise MetaConnectorError("Meta access token is not configured")
        payload = urllib.parse.urlencode({**data, "access_token": token}).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base}/{self.version}/{path.lstrip('/')}",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "User-Agent": "RTFCLMGZN-Newsroom/0.3",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                value = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:1000]
            raise MetaConnectorError(f"Meta API HTTP {exc.code}: {body}") from exc
        except Exception as exc:
            raise MetaConnectorError(f"Meta API request failed: {exc}") from exc
        if not isinstance(value, dict):
            raise MetaConnectorError("Meta API returned an invalid response")
        if value.get("error"):
            raise MetaConnectorError(f"Meta API error: {value['error']}")
        return value

    def publish_facebook(self, *, message: str, link: str) -> MetaPublishResult:
        if not self.config["distribution"].get("auto_post_meta"):
            raise MetaConnectorError("Automatic Facebook posting is disabled")
        page_id = self.vault.get("meta_page_id")
        if not page_id:
            raise MetaConnectorError("Meta Page ID is not configured")
        value = self._post(f"{page_id}/feed", {"message": message, "link": link})
        remote_id = str(value.get("id") or "")
        if not remote_id:
            raise MetaConnectorError("Meta did not return a Facebook post ID")
        return MetaPublishResult("facebook", remote_id, value)

    def publish_instagram_image(
        self, *, caption: str, image_url: str, wait_seconds: int = 3
    ) -> MetaPublishResult:
        if not self.config["distribution"].get("auto_post_instagram"):
            raise MetaConnectorError("Automatic Instagram posting is disabled")
        ig_user_id = self.vault.get("instagram_user_id")
        if not ig_user_id:
            raise MetaConnectorError("Instagram user ID is not configured")
        container = self._post(
            f"{ig_user_id}/media", {"image_url": image_url, "caption": caption}
        )
        creation_id = str(container.get("id") or "")
        if not creation_id:
            raise MetaConnectorError("Meta did not return an Instagram container ID")
        if wait_seconds:
            time.sleep(min(30, max(0, wait_seconds)))
        published = self._post(
            f"{ig_user_id}/media_publish", {"creation_id": creation_id}
        )
        remote_id = str(published.get("id") or "")
        if not remote_id:
            raise MetaConnectorError("Meta did not return an Instagram media ID")
        return MetaPublishResult("instagram", remote_id, published)
