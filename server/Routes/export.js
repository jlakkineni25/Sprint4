const express = require('express');
const router = express.Router();

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

router.post('/', (req, res) => {
  const { document, spans = [] } = req.body;

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

  res.json({ redacted: output });
});

module.exports = router;