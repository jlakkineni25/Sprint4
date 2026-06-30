const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

test('spacy helper handles surrogate characters without crashing', () => {
  const scriptPath = path.join(__dirname, '..', 'spacy_detect.py');
  const result = spawnSync(process.env.PYTHON || 'python', [scriptPath], {
    input: '\uD800John Doe john@example.com',
    encoding: 'utf-8',
    timeout: 60000,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
