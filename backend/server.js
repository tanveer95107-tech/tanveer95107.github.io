const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Database ke liye
require('dotenv').config(); // Link read karne ke liye

const app = express();
const port = process.env.PORT || 3000;

// SECURITY: Sirf aapki website ko data lene ki ijazat hai
app.use(cors({
  origin: ['https://tanveer95107-tech.github.io', 'http://localhost:3000']
}));
app.use(express.json());

// 1. Database Se Connect Karna
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch(err => console.log('❌ MongoDB Connection Error: ', err));

// 2. Product Ka Model (Database mein data kaisa dikhega)
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  brand: String,
  category: String, // 'men', 'women', 'kids'
  price: Number,
  oldPrice: Number,
  stock: { type: Number, default: 10 },
  images: [String] // Images ke links
}));

// 3. Routes (API)
app.get('/', (req, res) => {
  res.json({ message: 'Tanu Store Backend Chal Raha Hai!' });
});

// Saare products nikalne ka route (Frontend isay use karega)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Naya product add karne ka route (Testing ke liye)
app.post('/api/products', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ message: 'Product Added!', product: newProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server start
app.listen(port, () => {
  console.log(`Server chal raha hai: http://localhost:${port}`);
});
