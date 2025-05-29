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
  origin: function (origin, callback) {
    // Allow all origins in development and testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('Allowing all origins in development mode');
      return callback(null, true);
    }

    // In production, allow specific origins
    const allowedOrigins = [
      'https://student-expense-tracker-frontend.vercel.app',
      'https://student-expense-tracker.onrender.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Normalize the origin by removing trailing slashes and protocol
    const normalizeOrigin = (url) => {
      if (!url) return '';
      return url.toString().replace(/\/+$/, '').toLowerCase();
    };

    const normalizedOrigin = normalizeOrigin(origin);
    const isAllowed = allowedOrigins.some(allowed => 
      normalizedOrigin === normalizeOrigin(allowed)
    );

    if (isAllowed) {
      console.log(`✅ Allowed origin: ${origin}`);
      return callback(null, true);
    } else {
      console.warn(`🚫 Blocked origin: ${origin}`);
      return callback(new Error(`Not allowed by CORS. Origin: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'Accept',
    'x-auth-token',
    'Origin',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version',
    'X-Response-Time'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Content-Disposition',
    'X-File-Name',
    'Authorization',
    'Set-Cookie'
  ],
  optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  maxAge: 600, // 10 minutes (reduces the number of preflight requests)
  preflightContinue: false
};

// Trust first proxy (needed for secure cookies in production)
app.set('trust proxy', 1);

// Apply CORS with the specified options
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

// Add CORS headers to all responses
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Accept, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Authorization, set-cookie');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
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
// Root route - Return API information
app.get(['/', '/api'], (req, res) => {
  try {
    const requestDetails = {
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
      ip: req.ip,
      protocol: req.protocol,
      secure: req.secure,
      timestamp: new Date().toISOString()
    };
    
    console.log('📡 Incoming request:', JSON.stringify(requestDetails, null, 2));
    
    const apiInfo = {
      status: 'success',
      message: 'Student Expense Tracker API',
      version: '1.0.0',
      documentation: 'https://github.com/sunnynand1/student-expense-tracker',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      endpoints: {
        health: {
          method: 'GET',
          path: '/api/health',
          description: 'Health check endpoint'
        },
        auth: {
          register: {
            method: 'POST',
            path: '/api/auth/register',
            description: 'Register a new user'
          },
          login: {
            method: 'POST',
            path: '/api/auth/login',
            description: 'Login user'
          },
          me: {
            method: 'GET',
            path: '/api/auth/me',
            description: 'Get current user info',
            requiresAuth: true
          }
        },
        expenses: {
          method: 'GET',
          path: '/api/expenses',
          description: 'Get all expenses',
          requiresAuth: true
        },
        budgets: {
          method: 'GET',
          path: '/api/budgets',
          description: 'Get all budgets',
          requiresAuth: true
        }
      }
    };
    
    res.json(apiInfo);
  } catch (error) {
    console.error('Error in root route handler:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint with detailed server information
app.get('/api/health', (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      request: {
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        host: req.get('host'),
        ip: req.ip,
        protocol: req.protocol,
        secure: req.secure
      }
    };
    
    res.json(healthCheck);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Import route files
const authRoutes = require('./routes/auth');
const expensesRoutes = require('./routes/expenses');
const budgetsRoutes = require('./routes/budgets');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/budgets', budgetsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const startServer = async () => {
  try {
    // Log environment info
    console.log('🚀 Starting server with environment:', process.env.NODE_ENV || 'development');
    console.log('🔌 Using PORT from environment:', process.env.PORT || '5000 (default)');
    console.log('🌐 NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('🔗 Database Host:', process.env.DB_HOST ? 'Set' : 'Not set');
    console.log('🔒 JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    await testConnection();
    
    // Set up model associations
    console.log('🔗 Setting up database associations...');
    setupAssociations();
    
    // Sync database
    console.log('🔄 Syncing database...');
    await syncDatabase();
    
    // Create test user in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('👤 Creating test user for development...');
      await createTestUser();
    }
    
    // Start listening
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✅ Server is running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📅 Server time: ${new Date().toISOString()}`);
      console.log(`🚀 API Base URL: http://localhost:${PORT}/api`);
      console.log('\n📚 Available API Endpoints:');
      console.log(`   GET    /api/health          - Health check endpoint`);
      console.log(`   POST   /api/auth/register   - Register a new user`);
      console.log(`   POST   /api/auth/login      - Login user`);
      console.log(`   GET    /api/expenses       - Get all expenses`);
      console.log(`   POST   /api/expenses       - Create a new expense`);
      console.log(`   GET    /api/budgets        - Get all budgets`);
      console.log(`   POST   /api/budgets        - Create a new budget\n`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Error details:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
};

// Start the server
startServer();
