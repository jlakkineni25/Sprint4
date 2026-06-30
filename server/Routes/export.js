const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const multer = require('multer');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });
const uploadSingle = upload.single('file');

const getAction = (span) => {
  if (span.action) return span.action;
  return span.status === 'dismissed' ? 'keep-visible' : 'redact';
};

const getReplacement = (span, action) => {
  if (action === 'keep-visible') return span.text;
  if (action === 'anonymous') {
    const type = (span.type || '').toUpperCase();
    if (type.includes('EMAIL')) return '[REDACTED EMAIL]';
    if (type.includes('PHONE')) return '[REDACTED PHONE]';
    if (type.includes('NAME')) return '[REDACTED NAME]';
    if (type.includes('LOCATION')) return '[REDACTED LOCATION]';
    if (type.includes('DATE')) return '[REDACTED DATE]';
    if (type.includes('CARD') || type.includes('CREDIT')) return '[REDACTED CARD]';
    return '[REDACTED]';
  }
  return '█'.repeat(span.text.length);
};

const resolvePython = () => {
  const candidates = [process.env.PYTHON, 'python3', 'python'];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const result = spawnSync(candidate, ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf-8' });
    if (result.status === 0) return candidate;
  }
  throw new Error('Python interpreter not found');
};

const ensureExportDir = () => {
  const exportDir = path.join(__dirname, '..', 'exports');
  fs.mkdirSync(exportDir, { recursive: true });
  return exportDir;
};

const createTextRedaction = (document, spans) => {
  const selectedSpans = spans
    .map((span) => ({ ...span, action: getAction(span) }))
    .filter((span) => span.action !== 'keep-visible')
    .sort((a, b) => document.indexOf(a.text) - document.indexOf(b.text));

  let output = '';
  let cursor = 0;

  for (const span of selectedSpans) {
    const start = document.indexOf(span.text, cursor);
    if (start === -1) continue;

    output += document.slice(cursor, start);
    output += getReplacement(span, span.action);
    cursor = start + span.text.length;
  }

  output += document.slice(cursor);
  return output;
};

router.post('/', uploadSingle, (req, res) => {
  try {
    const document = req.body.document || '';
    const spans = typeof req.body.spans === 'string' ? JSON.parse(req.body.spans) : (req.body.spans || []);
    const file = req.file;

    const isPdf = Boolean(file && (file.originalname?.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf'));

    if (isPdf) {
      const exportDir = ensureExportDir();
      const inputPath = path.join(exportDir, `${Date.now()}-source.pdf`);
      const outputPath = path.join(exportDir, `${Date.now()}-redacted.pdf`);
      fs.writeFileSync(inputPath, file.buffer);

      const pythonCommand = resolvePython();
      const scriptPath = path.join(__dirname, '..', 'pdf_redactor.py');
      const spansPath = path.join(exportDir, `${Date.now()}-spans.json`);
      fs.writeFileSync(spansPath, JSON.stringify(spans.map((span) => ({ ...span, action: getAction(span) }))));
      const result = spawnSync(pythonCommand, [scriptPath, inputPath, outputPath, spansPath], {
        encoding: 'utf-8',
        timeout: 60000,
      });

      if (result.status !== 0) {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(spansPath);
        throw new Error(result.stderr || result.stdout || 'PDF redaction failed');
      }

      const pdfBuffer = fs.readFileSync(outputPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(outputPath)}"`);
      res.send(pdfBuffer);

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
      fs.unlinkSync(spansPath);
      return;
    }

    const redacted = createTextRedaction(document, spans);
    res.json({ redacted });
  } catch (err) {
    console.error('Export failed:', err);
    res.status(500).json({ error: 'Failed to export document', details: err.message });
  }
});

module.exports = router;