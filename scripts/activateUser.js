const { sequelize } = require('../config/db');
const User = require('../models/User');

async function activateUser(email) {
  try {
    // Find the user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.error('User not found with email:', email);
      return;
    }
    
    // Activate the user
    user.is_active = true;
    await user.save();
    
    console.log(`User ${email} has been activated successfully.`);
  } catch (error) {
    console.error('Error activating user:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Get email from command line arguments
const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address as an argument');
  process.exit(1);
}

// Run the function
activateUser(email);
