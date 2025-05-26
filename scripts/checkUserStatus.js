const { sequelize } = require('../config/db');
const User = require('../models/User');

async function checkUserStatus(email) {
  try {
    // Find the user by email
    const user = await User.findOne({ 
      where: { email },
      attributes: ['id', 'email', 'is_active', 'last_login', 'created_at', 'updated_at']
    });
    
    if (!user) {
      console.error('User not found with email:', email);
      return;
    }
    
    console.log('User status:', {
      id: user.id,
      email: user.email,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
    
  } catch (error) {
    console.error('Error checking user status:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Get email from command line arguments
const email = process.argv[2] || 'bumbapal09@gmail.com';

// Run the function
checkUserStatus(email);
