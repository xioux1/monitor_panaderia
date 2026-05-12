'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// TODO: add payment routes

app.listen(PORT, () => {
  console.log(`bakery-monitor running on http://localhost:${PORT}`);
});
