# Privacy Review Workflow

## Overview

We built a privacy-review workflow that helps a user move from document upload to a reviewed, redacted output without needing to understand the underlying detection model. The experience starts with an upload-first interface, supports text, PDF, and DOCX files, and then presents detected personal information as reviewable spans. Users can inspect each span, decide whether to keep it visible, redact it, or mark it as anonymous, and then export the resulting document in a cleaned form. The system also preserves the original document context for PDF-aware export, so the workflow feels more like a document review tool than a simple classifier. The overall goal was to make privacy review practical: fast enough for everyday use, but structured enough to make decisions explicit.

What we chose not to build was equally important. We did not try to create a full enterprise compliance platform with accounts, audit trails, role-based permissions, collaboration, or model training. We also did not attempt perfect OCR, exhaustive multilingual support, or highly customized redaction policies for every industry. Those features would add value in the long run, but they would also expand scope, increase maintenance cost, and dilute the core experience. The decision was to focus on the highest-leverage problem: giving someone a reliable, understandable way to review sensitive content and produce a safe export. In other words, the product was designed to be useful now, not merely impressive later.

## What the app does

- Uploads documents and analyzes them for likely PII.
- Shows detected spans in a review workflow so the user can confirm or change outcomes.
- Supports actions such as keep, redact, or anonymize for each detected span.
- Exports reviewed content as text or as a redacted PDF when the source file is a PDF.

## Tech stack

- Frontend: React, Vite, Tailwind CSS, Axios
- Backend: Express, Multer, CORS
- Document parsing: `pdf-parse`, `mammoth`
- Python-assisted soft PII detection: `spaCy`

## Project structure

- `client/` contains the React frontend.
- `server/` contains the Express backend and document-processing helpers.
- `server/Routes/` holds the analysis and export routes.
- `server/mock/` contains sample mock PII data.

## Getting started

### Prerequisites

- Node.js and npm
- Python 3 with `pip`

### 1. Install frontend dependencies

```bash
cd client
npm install
```

### 2. Install backend dependencies

```bash
cd ../server
npm install
```

### 3. Install Python dependencies for soft PII detection

If you want the spaCy-based suggestions to run, install the Python package and English model:

```bash
pip install spacy
python -m spacy download en_core_web_sm
```

### 4. Run the app

Start the backend:

```bash
cd server
node index.js
```

Start the frontend:

```bash
cd client
npm run dev
```

The frontend should be available from the Vite dev server, and the backend will run on port `3001`.

## Usage notes

- Upload a document to begin the review flow.
- Review the detected spans and choose the action that best fits the content.
- Export the final output once the review is complete.
- PDF export uses the original uploaded file so the redaction preserves document structure.
