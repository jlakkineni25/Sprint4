const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawnSync } = require('child_process');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fileType = require('file-type');

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

// Soft PII — names, orgs, locations, dates — handled by spaCy via a Python subprocess.
// Falls back silently (returns []) if Python/spaCy isn't available, so the app
// still works end-to-end with regex-only detection on a machine without Python set up.
function detectSoftPII(text) {
  const scriptPath = path.join(__dirname, '..', 'spacy_detect.py');
  // Try python3 first (Mac/Linux convention), then python (common on Windows).
  const candidates = ['python3', 'python'];

  for (const command of candidates) {
    try {
      const result = spawnSync(command, [scriptPath], {
        input: text,
        encoding: 'utf-8',
        timeout: 15000,
      });

      if (result.error) {
        if (result.error.code === 'ENOENT') continue; // this command doesn't exist, try next
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
  const detected = await fileType.fromBuffer(buffer);
  const mime = detected?.mime || '';

  if (name.endsWith('.pdf') || mime === 'application/pdf') {
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

function detectPII(text, fileIndex = 0) {
  spanIdCounter = 1;
  const structured = detectStructuredPII(text);
  const soft = detectSoftPII(text);

  const all = [...structured, ...soft].map((s) => ({ ...s, id: `f${fileIndex}-${s.id}` }));

  // Mark the single lowest-confidence span as a near-miss, matching prior mock data shape
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
        });
      }
    } else {
      const { sampleDocument } = require('../mock/mockPII');
      filesToProcess = [{ filename: 'sample.txt', text: sampleDocument }];
    }

    const results = filesToProcess.map((file, idx) => ({
      filename: file.filename,
      document: file.text,
      spans: detectPII(file.text, idx),
    }));

    // Backward-compatible shape for single-file callers: top-level document/spans
    // mirror the first file, plus a "files" array for the new multi-file UI.
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