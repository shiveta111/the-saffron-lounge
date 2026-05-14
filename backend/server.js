// Import Express
const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.send('Hello, Express.js Backend is Running 🚀');
});

// Example API route
app.post('/data', (req, res) => {
  const userData = req.body;
  res.json({ message: 'Data received', data: userData });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
