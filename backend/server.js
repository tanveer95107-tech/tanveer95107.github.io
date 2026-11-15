const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
require('dotenv').config();
const jwt = require('jsonwebtoken'); // JWT Token security ke liye

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

// Order Model
const Order = mongoose.model('Order', new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  products: { type: Array, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
}));

// --- MIDDLEWARE: Verify Token (Security Guard) ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'Access Denied: No Token' });
  
  const token = authHeader.split(' ')[1]; // "Bearer <token>" se token nikalna
  try {
    jwt.verify(token, process.env.ADMIN_KEY);
    next(); // Agar token sahi hai to aage jane dein
  } catch (err) {
    return res.status(403).json({ error: 'Invalid ya Expired Token' });
  }
};

// --- ROUTES ---

app.get('/', (req, res) => {
  res.json({ message: 'Tanu Store Backend Chal Raha Hai! 🚀' });
});

// 1. LOGIN ROUTE (Naya)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === process.env.ADMIN_KEY) {
    // Token banayein (1 din ke liye valid)
    const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_KEY, { expiresIn: '1d' });
    return res.json({ success: true, token: token });
  } else {
    return res.status(401).json({ success: false, error: 'Ghalat Password!' });
  }
});

// 2. GET: Saare products (Public)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST: Naya product add karna (Secure - Token Required)
app.post('/api/products', verifyToken, async (req, res) => {
  try {
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

// 4. DELETE: Product delete karna (Secure - Token Required)
app.delete('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ error: 'Product nahi mila!' });
    
    res.json({ message: 'Product Deleted Successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST: Naya Order place karna (Public)
app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ message: 'Order Placed Successfully!', order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET: Saare orders dekhna (Secure - Token Required)
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
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
