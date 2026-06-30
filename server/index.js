const express = require('express');
const cors = require('cors');
const analyzeRoute = require('./routes/analyze');
const exportRoute = require('./routes/export');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/analyze', analyzeRoute);
app.use('/api/export', exportRoute);

app.listen(3001, () => console.log('Server running on port 3001'));