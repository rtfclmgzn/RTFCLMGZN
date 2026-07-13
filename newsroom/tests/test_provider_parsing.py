from __future__ import annotations

import unittest

from newsroom.providers.gemini_interactions import GeminiInteractionsProvider
from newsroom.providers.openai_responses import OpenAIResponsesProvider
from newsroom.providers.structured import StructuredOutputError, parse_json_text


class ProviderParsingTests(unittest.TestCase):
    def test_openai_responses_text_and_citations(self) -> None:
        text, citations = OpenAIResponsesProvider._extract_output(
            {
                "output": [
                    {"type": "web_search_call"},
                    {
                        "type": "message",
                        "content": [
                            {
                                "type": "output_text",
                                "text": '{"ok":true}',
                                "annotations": [
                                    {
                                        "type": "url_citation",
                                        "url": "https://example.com/source",
                                        "title": "Source",
                                    }
                                ],
                            }
                        ],
                    },
                ]
            }
        )
        self.assertEqual('{"ok":true}', text)
        self.assertEqual("https://example.com/source", citations[0]["url"])

    def test_gemini_steps_contract_and_citation_deduplication(self) -> None:
        text, citations, search_calls = GeminiInteractionsProvider._extract_output(
            {
                "id": "interaction-1",
                "steps": [
                    {"type": "google_search_call"},
                    {
                        "type": "google_search_result",
                        "result": {
                            "url": "https://example.com/report",
                            "title": "Report",
                            "sources": [
                                {"url": "https://example.com/report", "title": "Duplicate"},
                                {"url": "https://other.example/news", "title": "News"},
                            ],
                        },
                    },
                    {
                        "type": "text",
                        "text": '{"candidates":[]}',
                        "annotations": [
                            {"url": "https://example.com/report", "title": "Report"}
                        ],
                    },
                ],
            }
        )
        self.assertEqual('{"candidates":[]}', text)
        self.assertEqual(1, search_calls)
        self.assertEqual(
            ["https://example.com/report", "https://other.example/news"],
            [item["url"] for item in citations],
        )

    def test_provider_refusals_and_incomplete_outputs_fail_closed(self) -> None:
        with self.assertRaisesRegex(StructuredOutputError, "refused"):
            OpenAIResponsesProvider._extract_output(
                {
                    "status": "completed",
                    "output": [
                        {
                            "type": "message",
                            "content": [
                                {"type": "refusal", "refusal": "cannot comply"}
                            ],
                        }
                    ],
                }
            )
        with self.assertRaisesRegex(StructuredOutputError, "incomplete"):
            OpenAIResponsesProvider._extract_output(
                {"status": "incomplete", "incomplete_details": {"reason": "max_output_tokens"}}
            )
        with self.assertRaisesRegex(StructuredOutputError, "did not complete"):
            GeminiInteractionsProvider._extract_output(
                {"status": "failed", "error": {"message": "provider failure"}}
            )
        with self.assertRaisesRegex(StructuredOutputError, "refused or blocked"):
            GeminiInteractionsProvider._extract_output(
                {"status": "completed", "steps": [{"type": "blocked", "text": "blocked"}]}
            )

    def test_structured_json_parser_handles_fences_and_rejects_arrays(self) -> None:
        self.assertEqual({"ok": True}, parse_json_text('```json\n{"ok": true}\n```'))
        with self.assertRaisesRegex(StructuredOutputError, "JSON object"):
            parse_json_text("[]")
        with self.assertRaisesRegex(StructuredOutputError, "not valid JSON"):
            parse_json_text("not-json")


if __name__ == "__main__":
    unittest.main()
