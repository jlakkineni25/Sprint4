const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { document, spans } = req.body;

  const confirmedSpans = spans
    .filter(s => s.status === 'confirmed')
    .sort((a, b) => document.indexOf(a.text) - document.indexOf(b.text));

  let redacted = document;
  for (const span of confirmedSpans) {
    redacted = redacted.replaceAll(span.text, '█'.repeat(span.text.length));
  }

  res.json({ redacted });
});

module.exports = router;