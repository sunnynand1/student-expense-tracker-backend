require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { testConnection, syncDatabase } = require('./config/db');
const authRoutes = require('./routes/auth_updated');
const bcrypt = require('bcryptjs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS setup for production and development
const corsOptions = {
  origin: [
    'https://student-expense-tracker-frontend.vercel.app',
    'https://student-expense-tracker.vercel.app',
    'http://localhost:3000', 
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-CSRF-Token', 
    'Accept', 
    'x-auth-token'
  ],
  exposedHeaders: ['set-cookie', 'Authorization'],
  optionsSuccessStatus: 200
};

// Trust first proxy (needed for secure cookies in production)
app.set('trust proxy', 1);

// Apply CORS with the specified options - ensure this is before any routes
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

// Add debug middleware for CORS issues
app.use((req, res, next) => {
  // Log CORS-related headers
  console.log('CORS Debug - Request headers:', {
    origin: req.headers.origin || 'not set',
    referer: req.headers.referer || 'not set',
    host: req.headers.host || 'not set'
  });
  
  // Add CORS headers for all responses
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Continue to next middleware
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
    
    return true;
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    return false;
  }
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Expenses routes
const expensesRoutes = require('./routes/expenses');
app.use('/api/expenses', expensesRoutes);

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting server...');
    
    // Set up model associations
    setupAssociations();
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to the database');
    }
    
    // Sync database models
    console.log('🔄 Syncing database models...');
    const isSynced = await syncDatabase();
    if (!isSynced) {
      throw new Error('Failed to sync database models');
    }
    
    // Create test user
    console.log('👤 Creating test user if not exists...');
    await createTestUser();
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server is running on http://0.0.0.0:${PORT} (accessible via http://localhost:${PORT})`);
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

// Start the server
startServer();