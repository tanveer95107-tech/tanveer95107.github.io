const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// SECURITY: Sirf aapki website ko data lene ki ijazat hai
app.use(cors({
  origin: ['https://tanveer95107-tech.github.io', 'http://localhost:3000']
}));
app.use(express.json());

// Product Model
const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  brand: String,
  category: String,
  price: Number,
  oldPrice: Number,
  stock: { type: Number, default: 10 },
  images: [String]
}));

// 1. Routes
app.get('/', (req, res) => {
  res.json({ message: 'Tanu Store Backend Chal Raha Hai!' });
});

// Saare products nikalne ka route
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Naya product ya multiple products add karne ka route (UPDATED)
app.post('/api/products', async (req, res) => {
  try {
    // Agar ek sath multiple products bheje gaye hain (Array)
    if (Array.isArray(req.body)) {
      const savedProducts = await Product.insertMany(req.body);
      return res.status(201).json({ message: 'All Products Added!', count: savedProducts.length });
    }
    
    // Agar sirf ek product hai
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ message: 'Product Added!', product: newProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Database Se Connect Karke Server Start Karna
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    // Database judne ke baad hi server start hoga
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server chal raha hai: http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.log('❌ MongoDB Connection Error: ', err);
  });
