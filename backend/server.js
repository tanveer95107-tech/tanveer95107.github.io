const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet'); // Naya Security Package
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 1. SECURITY HEADERS (Helmet)
app.use(helmet());

// 2. STRICT CORS
app.use(cors({
  origin: ['https://tanveer95107-tech.github.io', 'https://tanveer95107.github.io', 'http://localhost:3000', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// --- DATABASE MODELS ---

// Product Model
const Product = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, default: "Tanu Store" },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: Number,
  stock: { type: Number, default: 10 },
  images: [String],
  sizes: [String], 
  colors: [String] 
}));

// Order Model (Checkout ke liye)
const Order = mongoose.model('Order', new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  products: { type: Array, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
}));

// --- ROUTES ---

app.get('/', (req, res) => {
  res.json({ message: 'Tanu Store Backend Chal Raha Hai! 🚀' });
});

// GET: Saare products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 }); // Naye products pehle
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Naya product add karna (Admin Only)
app.post('/api/products', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Access Denied: You are not the Admin!' });
    }

    if (Array.isArray(req.body)) {
      const savedProducts = await Product.insertMany(req.body);
      return res.status(201).json({ message: 'All Products Added!', count: savedProducts.length });
    }
    
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ message: 'Product Added!', product: newProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Product delete karna (Admin Only)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Access Denied' });
    }
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ error: 'Product nahi mila!' });
    
    res.json({ message: 'Product Deleted Successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Naya Order place karna (Checkout)
app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ message: 'Order Placed Successfully!', order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Saare orders dekhna (Admin Only)
app.get('/api/orders', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Access Denied' });
    }
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server live on port ${port}`);
    });
  })
  .catch(err => {
    console.log('❌ MongoDB Connection Error: ', err);
  });
