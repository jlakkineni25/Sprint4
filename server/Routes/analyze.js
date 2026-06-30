const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawnSync } = require('child_process');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const FileType = require('file-type');
const fs = require('fs');

const upload = multer({ storage: multer.memoryStorage() });
const uploadMultiple = upload.array('files', 20); // field name "files", max 20 at once

let spanIdCounter = 1;
const nextId = () => `rx${spanIdCounter++}`;

// Structured PII — fixed shape, regex is reliable and fast for these.
const REGEX_DETECTORS = [
  ['EMAIL', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, 0.99, 'Personal email address'],
  ['PHONE', /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g, 0.9, 'Phone number pattern'],
  ['DOB', /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, 0.85, 'Date pattern that may be a date of birth'],
  ['CASE_ID', /\b[A-Z]{2,5}-\d{4}-\d{3,6}\b/g, 0.95, 'Alphanumeric case/account identifier'],
];

function detectStructuredPII(text) {
  const spans = [];
  const seen = new Set();

  for (const [type, regex, confidence, reason] of REGEX_DETECTORS) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const value = match[0].trim();
      const key = `${type}:${value}`;
      if (!value || seen.has(key)) continue;
      seen.add(key);
      spans.push({ id: nextId(), text: value, type, confidence, reason, status: 'unreviewed' });
    }
  }
  return spans;
}

function detectSoftPII(text) {
  const scriptPath = path.join(__dirname, '..', 'spacy_detect.py');
  const candidates = ['python3', 'python'];

  for (const command of candidates) {
    try {
      const result = spawnSync(command, [scriptPath], {
        input: text,
        encoding: 'utf-8',
        timeout: 15000,
      });

      if (result.error) {
        if (result.error.code === 'ENOENT') continue;
        console.warn(`spaCy detection error via "${command}":`, result.error.message);
        return [];
      }

      if (result.status !== 0) {
        console.warn(`spaCy detection failed via "${command}":`, result.stderr);
        return [];
      }

      return JSON.parse(result.stdout);
    } catch (err) {
      console.warn(`spaCy detection threw via "${command}":`, err.message);
      return [];
    }
  }

  console.warn('spaCy detection unavailable: neither "python3" nor "python" found on this machine. Falling back to regex-only.');
  return [];
}

async function extractTextFromBuffer(buffer, originalname) {
  const name = (originalname || '').toLowerCase();
  const detected = await FileType.fileTypeFromBuffer(buffer);
  const mime = detected?.mime || '';

  if (name.endsWith('.pdf') || mime === 'application/pdf') {
    const tempPdfPath = path.join(__dirname, '..', 'exports', `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`);
    fs.mkdirSync(path.dirname(tempPdfPath), { recursive: true });
    fs.writeFileSync(tempPdfPath, buffer);

    const pythonCommand = ['python3', 'python'].find((candidate) => {
      try {
        return spawnSync(candidate, ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf-8' }).status === 0;
      } catch {
        return false;
      }
    });

    if (pythonCommand) {
      const scriptPath = path.join(__dirname, '..', 'pdf_text_extract.py');
      const result = spawnSync(pythonCommand, [scriptPath, tempPdfPath], { encoding: 'utf-8', timeout: 60000 });
      if (result.status === 0) {
        fs.unlinkSync(tempPdfPath);
        return result.stdout || '';
      }
    }

    fs.unlinkSync(tempPdfPath);
    const data = await pdf(buffer);
    return data.text || '';
  }

  if (name.endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (name.endsWith('.txt') || mime === 'text/plain' || mime.startsWith('text/')) {
    return buffer.toString('utf-8');
  }

  return buffer.toString('utf-8');
}

function getFileKind(fileName = '', mimeType = '') {
  const name = (fileName || '').toLowerCase();
  if (name.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (name.endsWith('.txt') || mimeType === 'text/plain' || mimeType.startsWith('text/')) return 'text';
  return 'text';
}

function detectPII(text, fileIndex = 0) {
  spanIdCounter = 1;
  const structured = detectStructuredPII(text);
  const soft = detectSoftPII(text);

  const all = [...structured, ...soft].map((s) => ({ ...s, id: `f${fileIndex}-${s.id}` }));

  if (all.length > 0) {
    const lowest = all.reduce((min, s) => (s.confidence < min.confidence ? s : min), all[0]);
    lowest.flaggedFalsePositive = true;
  }

  return all;
}

router.post('/', uploadMultiple, async (req, res) => {
  try {
    let filesToProcess;

    if (req.files && req.files.length > 0) {
      filesToProcess = [];
      for (const file of req.files) {
        const text = await extractTextFromBuffer(file.buffer, file.originalname);
        filesToProcess.push({
          filename: file.originalname,
          text,
          mimeType: file.mimetype,
          kind: getFileKind(file.originalname, file.mimetype),
        });
      }
    } else {
      const { sampleDocument } = require('../mock/mockPII');
      filesToProcess = [{ filename: 'sample.txt', text: sampleDocument, mimeType: 'text/plain', kind: 'text' }];
    }

    const results = filesToProcess.map((file, idx) => ({
      filename: file.filename,
      document: file.text,
      spans: detectPII(file.text, idx),
      mimeType: file.mimeType,
      kind: file.kind,
    }));

    res.json({
      files: results,
      document: results[0].document,
      spans: results[0].spans,
    });
  } catch (err) {
    console.error('Error detecting PII:', err);
    res.status(500).json({ error: 'Failed to detect PII', details: err.message });
  }
});

module.exports = router;