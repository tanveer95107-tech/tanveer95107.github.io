// backend/server.js
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// SECURITY: Sirf aapki website ko data lene ki ijazat hai
const allowedOrigins = ['https://tanveer95107-tech.github.io']; 

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Tanu Store Backend Chal Raha Hai!' });
});

app.listen(port, () => {
  console.log(`Server chal raha hai: http://localhost:${port}`);
});
