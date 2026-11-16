const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
const port = process.env.PORT || 3000;

// ============ SECURITY HEADERS ============
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// ============ CORS ============
app.use(cors({
  origin: [
    'https://tanveer95107-tech.github.io',
    'https://tanveer95107.github.io'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============ RATE LIMITING ============
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try after 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});
app.use('/api/', apiLimiter);

// ============ CLOUDINARY ============
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ============ MULTER (Image upload only) ============
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images are allowed'));
    }
    cb(null, true);
  }
});

// ============ MODELS ============
const Product = mongoose.model('Product', new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  brand: { type: String, default: 'Tanu Store', trim: true },
  category: { type: String, required: true, enum: ['men', 'women', 'kids'] },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0 },
  salePrice: { type: Number, default: 0 },
  onSale: { type: Boolean, default: false },
  saleEnds: { type: Date, default: null },
  stock: { type: Number, default: 10, min: 0 },
  images: [String],
  sizes: [String],
  colors: [String],
  status: { type: String, enum: ['published', 'draft'], default: 'published' }
}, { timestamps: true }));

const Order = mongoose.model('Order', new mongoose.Schema({
  customerName: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    price: Number,
    quantity: { type: Number, default: 1, min: 1 },
    size: String
  }],
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
}));

// ============ AUTH MIDDLEWARE ============
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ============ ROUTES ============
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Tanu Store API' });
});

// LOGIN
app.post('/api/admin/login',
  loginLimiter,
  body('password').isString().isLength({ min: 1, max: 200 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });

    try {
      const { password } = req.body;
      const hash = process.env.ADMIN_PASSWORD_HASH;
      if (!hash) return res.status(500).json({ error: 'Server misconfigured' });

      const match = await bcrypt.compare(password, hash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
      res.json({ success: true, token });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// GET PRODUCTS (with auto-expiry check)
app.get('/api/products', async (req, res) => {
  try {
    await Product.updateMany(
      { onSale: true, saleEnds: { $lt: new Date() } },
      { onSale: false, salePrice: 0, saleEnds: null }
    );

    const authHeader = req.headers.authorization;
    let isAdmin = false;
    if (authHeader) {
      try {
        jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        isAdmin = true;
      } catch (e) { /* ignore */ }
    }
    const query = isAdmin ? {} : { status: 'published' };
    const products = await Product.find(query).sort({ _id: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// ADD PRODUCT
app.post('/api/products', verifyToken,
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('category').isIn(['men', 'women', 'kids']),
  body('price').isFloat({ min: 0 }),
  body('images').isArray({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid product data' });

    try {
      const newProduct = new Product(req.body);
      await newProduct.save();
      res.status(201).json({ message: 'Product added', product: newProduct });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add product' });
    }
  }
);

// UPDATE PRODUCT
app.put('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product updated', product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE PRODUCT
app.delete('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ============ BULK SALE ROUTES ============

// Bulk Sale Apply (Admin Only)
app.post('/api/products/sale', verifyToken, async (req, res) => {
  try {
    const { category, discountPercent, durationDays } = req.body;
    
    if (!discountPercent || discountPercent < 1 || discountPercent > 99) {
      return res.status(400).json({ error: 'Discount 1 se 99 ke darmiyan hona chahiye' });
    }

    const saleEnds = new Date();
    saleEnds.setDate(saleEnds.getDate() + (durationDays || 7));

    const query = category && category !== 'all' ? { category } : {};
    const products = await Product.find(query);

    for (let p of products) {
      const salePrice = Math.round(p.price - (p.price * discountPercent / 100));
      p.salePrice = salePrice;
      p.onSale = true;
      p.saleEnds = saleEnds;
      await p.save();
    }

    res.json({ message: `Sale applied on ${products.length} products!`, saleEnds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Sale Remove (Admin Only)
app.post('/api/products/sale/remove', verifyToken, async (req, res) => {
  try {
    const { category } = req.body;
    const query = category && category !== 'all' ? { category } : {};
    await Product.updateMany(query, { onSale: false, salePrice: 0, saleEnds: null });
    res.json({ message: 'Sale removed successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ END SALE ROUTES ============

// UPLOAD IMAGE
app.post('/api/upload', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'tanu_store_products',
      transformation: [{ width: 1000, crop: 'limit', quality: 'auto' }]
    });
    res.json({ success: true, imageUrl: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// PLACE ORDER (Server-side price verification)
app.post('/api/orders',
  body('customerName').isString().trim().isLength({ min: 1, max: 100 }),
  body('phone').isString().trim().isLength({ min: 10, max: 20 }),
  body('address').isString().trim().isLength({ min: 5, max: 500 }),
  body('items').isArray({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid order data' });

    try {
      const { customerName, phone, address, items } = req.body;

      let computedTotal = 0;
      const verifiedItems = [];

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) return res.status(400).json({ error: `Product not found: ${item.name}` });
        if (product.status !== 'published') return res.status(400).json({ error: `Product unavailable: ${product.name}` });

        const qty = Math.max(1, Math.min(10, item.quantity || 1));
        const effectivePrice = product.onSale && product.salePrice > 0 ? product.salePrice : product.price;
        computedTotal += effectivePrice * qty;

        verifiedItems.push({
          productId: product._id,
          name: product.name,
          price: effectivePrice,
          quantity: qty,
          size: item.size || null
        });
      }

      const newOrder = new Order({
        customerName,
        phone,
        address,
        items: verifiedItems,
        totalAmount: computedTotal
      });
      await newOrder.save();
      res.status(201).json({ message: 'Order placed', orderId: newOrder._id, total: computedTotal });
    } catch (err) {
      res.status(500).json({ error: 'Order failed' });
    }
  }
);

// GET ORDERS (admin only)
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// ============ NAYA: ORDER STATUS UPDATE ROUTE ============
app.put('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });

    res.json({ message: 'Order status updated', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// ============ NAYA: ORDER DELETE ROUTE ============
app.delete('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});
// ============ END ORDER ROUTES ============

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

// ============ DATABASE ============
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(port, '0.0.0.0', () => console.log(`🚀 Server on port ${port}`));
  })
  .catch(err => console.log('❌ MongoDB Error:', err));
