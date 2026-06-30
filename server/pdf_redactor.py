import json
import sys
from pathlib import Path

import fitz


def parse_spans(raw: str):
    return json.loads(raw)


def normalize_text(value: str) -> str:
    return " ".join((value or "").lower().split())


def find_phrase_rects(page, phrase: str):
    tokens = [token for token in phrase.split() if token]
    if not tokens:
        return []

    words = page.get_text("words")
    normalized_words = [normalize_text(word[4]) for word in words]
    rects = []

    for start in range(len(normalized_words)):
        if normalize_text(normalized_words[start]) != normalize_text(tokens[0]):
            continue
        match = True
        for offset, token in enumerate(tokens[1:]):
            idx = start + offset + 1
            if idx >= len(normalized_words) or normalize_text(normalized_words[idx]) != normalize_text(token):
                match = False
                break
        if not match:
            continue

        matched_words = words[start:start + len(tokens)]
        if not matched_words:
            continue

        rect = fitz.Rect(matched_words[0][0], matched_words[0][1], matched_words[0][2], matched_words[0][3])
        for word in matched_words[1:]:
            rect.include_rect(fitz.Rect(word[0], word[1], word[2], word[3]))
        rects.append(rect)

    return rects


def redact_pdf(input_path: str, output_path: str, spans: list[dict]) -> None:
    doc = fitz.open(input_path)
    for page in doc:
        for span in spans:
            text = (span.get("text") or "").strip()
            action = (span.get("action") or "redact").lower()
            if action != "redact" or not text:
                continue
            rects = find_phrase_rects(page, text)
            if not rects:
                continue
            for rect in rects:
                page.add_redact_annot(rect, fill=(0, 0, 0))
        page.apply_redactions()
    doc.save(output_path)
    doc.close()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        raise SystemExit("Usage: pdf_redactor.py <input> <output> <spans-json-file>")
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    spans_path = Path(sys.argv[3])
    spans = parse_spans(spans_path.read_text(encoding="utf-8"))
    redact_pdf(input_path, output_path, spans)
