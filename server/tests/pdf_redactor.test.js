const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function resolvePython() {
  const candidates = [process.env.PYTHON, 'python3', 'python'];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const result = spawnSync(candidate, ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf-8' });
    if (result.status === 0) return candidate;
  }
  throw new Error('Python interpreter not found');
}

test('pdf redactor writes a redacted PDF file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conseal-pdf-'));
  const input = path.join(tempDir, 'sample.pdf');
  const output = path.join(tempDir, 'sample-redacted.pdf');
  const python = resolvePython();
  const scriptPath = path.join(__dirname, '..', 'pdf_redactor.py');

  const createPdf = spawnSync(
    python,
    [
      '-c',
      "import fitz, sys; doc = fitz.open(); page = doc.new_page(); page.insert_text((72, 72), 'John Doe works at Example Corp'); doc.save(sys.argv[1])",
      input,
    ],
    { encoding: 'utf-8' }
  );

  assert.equal(createPdf.status, 0, createPdf.stderr || createPdf.stdout);
  assert.equal(fs.existsSync(input), true);

  const redact = spawnSync(
    python,
    [scriptPath, input, output, JSON.stringify([{ text: 'John Doe', action: 'redact' }])],
    { encoding: 'utf-8' }
  );

  assert.equal(redact.status, 0, redact.stderr || redact.stdout);
  assert.equal(fs.existsSync(output), true);
  assert.ok(fs.statSync(output).size > 0);
});
