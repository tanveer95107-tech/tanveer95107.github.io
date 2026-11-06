const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// SECURITY: Sirf aapki website ko data lene ki ijazat hai
app.use(cors({
  origin: ['https://tanveer95107-tech.github.io', 'https://tanveer95107.github.io', 'http://localhost:3000']
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
  images: [String],
  // NAYA: Sizes aur Colors database mein save karne ke liye
  sizes: [String], 
  colors: [String] 
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
      // Security Check: Sirf Admin hi product add kar sakta hai
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Access Denied: You are not the Admin!' });
  }
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
// Product delete karne ka route (Admin only)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Access Denied: You are not the Admin!' });
    }

    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product nahi mila!' });
    }

    res.json({ message: 'Product Deleted Successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Product update karne ka route (Admin only)
app.put('/api/products/:id', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Access Denied' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product Updated Successfully!', product: updatedProduct });
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
