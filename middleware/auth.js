const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  console.log('\n=== Auth Middleware ===');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  try {
    // Log all headers for debugging
    console.log('Request headers:', {
      authorization: req.headers.authorization ? '***present***' : 'missing',
      'content-type': req.headers['content-type'] || 'not set'
    });
    
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.error('❌ No Authorization header found');
      return res.status(401).json({ 
        success: false,
        error: 'No authentication token provided',
        details: 'Missing Authorization header'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('❌ Invalid Authorization header format');
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token format',
        details: 'Expected: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.error('❌ No token found in Authorization header');
      return res.status(401).json({ 
        success: false, 
        error: 'No authentication token provided' 
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      console.log('Decoded token:', decoded);
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          expiredAt: jwtError.expiredAt
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        details: jwtError.message
      });
    }

    // Find user by id from token
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      console.error('❌ User not found for token user ID:', decoded.id);
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check if user is active
    if (!user.is_active) {
      console.error('❌ User account is inactive:', user.id);
      return res.status(401).json({
        success: false,
        error: 'Account is inactive. Please contact support.'
      });
    }

    // Add user to request object
    req.user = user;
    console.log('✅ User authenticated:', user.id);
    
    // Update last login time
    user.last_login = new Date();
    await user.save();
    
    // Add user info to response headers for debugging
    res.set('X-Authenticated-User', user.id);
    
    next();
  } catch (error) {
    console.error('🔥 Auth middleware error:', {
      message: error.message,
      stack: error.stack,
      ...(error.response && { response: error.response.data })
    });
    
    // Handle database errors
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({
        success: false,
        error: 'Database error during authentication'
      });
    }
    
    // Handle other unexpected errors
    res.status(500).json({ 
      success: false, 
      error: 'Server error during authentication',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = auth;
