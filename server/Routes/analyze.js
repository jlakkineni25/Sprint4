const express = require('express');
const router = express.Router();
const { sampleDocument, mockSpans } = require('../mock/mockPII');

router.post('/', (req, res) => {
  res.json({ document: sampleDocument, spans: mockSpans });
});

module.exports = router;