#!/usr/bin/env python3
"""
spaCy-based entity detector for soft PII categories: names, orgs, locations, dates.
Reads document text from stdin, writes JSON array of spans to stdout.
Structured PII (email, phone, case ID, DOB) is intentionally NOT handled here —
that stays in the Node regex detectors, which are more reliable for fixed-shape data.
"""
import sys
import json
import spacy


def sanitize_text(text):
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)

    text = text.replace("\x00", " ")
    text = text.encode("utf-8", "surrogatepass").decode("utf-8", "ignore")
    return text


# Map spaCy's entity labels to this app's PII types
LABEL_MAP = {
    "PERSON": "NAME",
    "ORG": "ORG",
    "GPE": "ADDRESS",   # cities/countries/states
    "LOC": "ADDRESS",   # non-GPE locations
    "FAC": "ADDRESS",   # buildings, landmarks
    "DATE": "DATE",
}

# Confidence isn't natively exposed by spaCy's small model, so we approximate:
# longer / multi-token entities tend to be more reliable detections.
def estimate_confidence(ent):
    token_count = len(ent.text.split())
    if token_count >= 2:
        return 0.8
    return 0.6

def main():
    text = sanitize_text(sys.stdin.read())

    if not text.strip():
        print(json.dumps([]))
        return

    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        print(json.dumps([]))
        return

    try:
        doc = nlp(text)
    except Exception:
        print(json.dumps([]))
        return

    spans = []
    seen = set()
    span_id = 1

    for ent in doc.ents:
        mapped_type = LABEL_MAP.get(ent.label_)
        if not mapped_type:
            continue  # skip labels we don't care about (CARDINAL, MONEY, etc.)

        value = ent.text.strip()
        key = f"{mapped_type}:{value}"
        if not value or key in seen:
            continue
        seen.add(key)

        spans.append({
            "id": f"sp{span_id}",
            "text": value,
            "type": mapped_type,
            "confidence": estimate_confidence(ent),
            "reason": f"Detected as {ent.label_} by spaCy NER model",
            "status": "unreviewed",
        })
        span_id += 1

    print(json.dumps(spans))

if __name__ == "__main__":
    main()