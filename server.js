require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { testConnection, syncDatabase } = require('./config/db');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS setup for production and development
const corsOptions = {
  // In development, allow all origins
  origin: function(origin, callback) {
    // For development, allow all origins
    callback(null, true);
    return;
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'Accept',
    'x-auth-token',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
    'Origin'
  ],
  exposedHeaders: ['set-cookie', 'Authorization', 'Content-Disposition'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

// Trust first proxy (needed for secure cookies in production)
app.set('trust proxy', 1);

// Apply CORS with the specified options - ensure this is before any routes
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

// Add comprehensive CORS debug middleware
app.use((req, res, next) => {
  // Only log in development environment to avoid cluttering production logs
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔄 CORS Debug - Request:', {
      method: req.method,
      url: req.originalUrl,
      origin: req.headers.origin || 'not set',
      referer: req.headers.referer || 'not set',
      host: req.headers.host || 'not set',
      authorization: req.headers.authorization ? 'present' : 'not set',
      contentType: req.headers['content-type'] || 'not set'
    });
  }
  
  // Ensure CORS headers are set for all responses
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests manually if needed
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.status(204).end();
  }
  
  // Continue to next middleware
  next();
});

// Add response interceptor to debug CORS issues
app.use((req, res, next) => {
  // Store the original end function
  const originalEnd = res.end;
  
  // Override the end function to log response headers
  res.end = function(chunk, encoding) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 CORS Debug - Response Headers:', {
        'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin') || 'not set',
        'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials') || 'not set',
        'access-control-expose-headers': res.getHeader('Access-Control-Expose-Headers') || 'not set'
      });
    }
    
    // Call the original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

// Parse cookies and JSON bodies
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Import models and sequelize instance
const { User, Expense, sequelize } = require('./models');

// Set up model associations
const setupAssociations = () => {
  // Associations are already set up in models/index.js
  console.log('✅ Model associations set up');
};

// Create test user if not exists
async function createTestUser() {
  try {
    const testUser = await User.findOne({ where: { email: 'test@example.com' } });
    
    if (!testUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        is_active: true
      });
      console.log('✅ Test user created');
    } else {
      console.log('ℹ️ Test user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Auth routes
const authRoutes = require('./routes/auth_updated');
app.use('/api/auth', authRoutes);

// Expenses routes
const expensesRoutes = require('./routes/expenses');
app.use('/api/expenses', expensesRoutes);

// Budgets routes
const budgetsRoutes = require('./routes/budgets');
app.use('/api/budgets', budgetsRoutes);

// Documents routes
const documentsRoutes = require('./routes/documents');
app.use('/api/documents', documentsRoutes);

// Reports routes
const reportsRoutes = require('./routes/reports');
app.use('/api/reports', reportsRoutes);

// Team routes have been removed

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await testConnection();
    
    // Set up associations
    setupAssociations();
    
    // Sync database (create tables if they don't exist)
    await syncDatabase();
    
    // Create test user
    await createTestUser();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log('📊 API Endpoints:');
      console.log(`   - Health check: GET http://localhost:${PORT}/api/health`);
      console.log(`   - Register: POST http://localhost:${PORT}/api/auth/register`);
      console.log(`   - Login: POST http://localhost:${PORT}/api/auth/login`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
};

// Start the server
startServer();
