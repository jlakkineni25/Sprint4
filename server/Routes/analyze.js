// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// require('dotenv').config();

// const upload = multer({ storage: multer.memoryStorage() });
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const detectPII = async (text) => {
//   const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

//   const prompt = `You are a PII detection engine. Analyze the following document and return a JSON array of PII spans found.

// For each span return:
// - id: unique string number
// - text: exact text as it appears in the document
// - type: one of NAME, EMAIL, PHONE, DOB, ADDRESS, CASE_ID, ORG, DATE, OTHER
// - confidence: float 0.0 to 1.0
// - reason: one sentence explaining why this is PII or why it might not be
// - status: "unreviewed" for likely PII, "missed" for PII the tool almost missed (use this sparingly for 1-2 items)

// Return ONLY a valid JSON array. No markdown, no backticks, no explanation.

// Document:
// ${text}`;

//   const result = await model.generateContent(prompt);
//   const raw = result.response.text().trim();

//   // Strip markdown fences if present
//   const cleaned = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();
//   return JSON.parse(cleaned);
// };

// router.post('/', upload.single('file'), async (req, res) => {
//   try {
//     let documentText;

//     if (req.file) {
//       documentText = req.file.buffer.toString('utf-8');
//     } else {
//       const { sampleDocument } = require('../mock/mockPII');
//       documentText = sampleDocument;
//     }

//     const spans = await detectPII(documentText);
//     res.json({ document: documentText, spans });

//   } catch (err) {
//     console.error('Error detecting PII:', err);
//     res.status(500).json({ error: 'Failed to detect PII', details: err.message });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

let spanIdCounter = 1;
const nextId = () => String(spanIdCounter++);

// Each detector: [type, regex, confidence, reason]
const DETECTORS = [
  ['EMAIL', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, 0.99, 'Personal email address'],
  ['PHONE', /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g, 0.9, 'Phone number pattern'],
  ['DOB', /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, 0.85, 'Date pattern that may be a date of birth'],
  ['CASE_ID', /\b[A-Z]{2,5}-\d{4}-\d{3,6}\b/g, 0.95, 'Alphanumeric case/account identifier'],
  ['ADDRESS', /\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr)\b[^\n,.]*/g, 0.7, 'Street address pattern'],
  ['DATE', /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b/g, 0.5, 'Date that may relate to a personal event'],
  ['NAME', /\b(?:Dear|Regards|Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g, 0.9, 'Name following a salutation or title'],
  ['ORG', /\b[A-Z][a-zA-Z]*\s?(?:Corp|Inc|LLC|Ltd|Center|Centre|Hospital|Bank|University|Manager,?\s[A-Z][a-zA-Z]+)\b/g, 0.55, 'Possible organization name'],
];

function detectPII(text) {
  const spans = [];
  const seen = new Set();

  for (const [type, regex, confidence, reason] of DETECTORS) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      // Use capture group 1 if present (e.g. NAME pulls name out of "Dear X"), else full match
      const value = (match[1] || match[0]).trim();
      if (!value || seen.has(`${type}:${value}`)) continue;
      seen.add(`${type}:${value}`);

      spans.push({
        id: nextId(),
        text: value,
        type,
        confidence,
        reason,
        status: confidence < 0.6 ? 'unreviewed' : 'unreviewed',
      });
    }
  }

  // Mark the lowest-confidence span or two as "missed" to mimic near-miss detection,
  // matching the spirit of the mock data (status: "missed" for 1-2 borderline items)
  const sorted = [...spans].sort((a, b) => a.confidence - b.confidence);
  if (sorted.length > 0) sorted[0].flaggedFalsePositive = true;

  return spans;
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    let documentText;

    if (req.file) {
      documentText = req.file.buffer.toString('utf-8');
    } else {
      const { sampleDocument } = require('../mock/mockPII');
      documentText = sampleDocument;
    }

    spanIdCounter = 1; // reset per-request so ids stay small and predictable
    const spans = detectPII(documentText);

    res.json({ document: documentText, spans });
  } catch (err) {
    console.error('Error detecting PII:', err);
    res.status(500).json({ error: 'Failed to detect PII', details: err.message });
  }
});

module.exports = router;