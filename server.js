const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();

// Middleware to parse JSON payloads
app.use(bodyParser.json());

// Queue to hold requests
const requestQueue = [];
let isProcessing = false;

// Function to process the queue
const processQueue = () => {
  if (requestQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const { req, res } = requestQueue.shift();

  /**
   * { projectId: 'plan@github' | 'gant@github', state: 'RUNTIME' }
   */

  axios.post(`${process.env.SAFE_URL}/safe/get`, req.body)
    .then(response => {
      res.json(response.data);
    })
    .catch(error => {
      res.status(500).json({ error: 'Failed to proxy request' });
    })
    .finally(() => {
      setTimeout(processQueue, 10000);
    });
};

// Middleware to validate the request
const validateRequest = (req, res, next) => {
  if (req.method !== 'POST' || req.url !== '/safe') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId, state } = req.body;
  if (state !== 'RUNTIME') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  next();
};

// Route handler for /safe
app.post('/safe', validateRequest, (req, res) => {
  requestQueue.push({ req, res });

  if (!isProcessing) {
    processQueue();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});