import sys
from pathlib import Path

import fitz


def extract_text(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    pages = [page.get_text("text") for page in doc]
    doc.close()
    return "\n\n".join(page for page in pages if page)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: pdf_text_extract.py <input-pdf>")
    pdf_path = Path(sys.argv[1])
    print(extract_text(str(pdf_path)))
