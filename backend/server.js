const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
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
