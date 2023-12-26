const express = require('express');
const app = express();
const port = 3001; // Choose a port different from your React app

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
