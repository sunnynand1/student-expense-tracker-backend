const { Sequelize } = require('sequelize');

// Database configuration
const dbConfig = {
  HOST: process.env.DB_HOST || 'localhost',
  USER: process.env.DB_USER || 'root',          // MySQL username
  PASSWORD: process.env.DB_PASSWORD || '',      // MySQL password
  DB: process.env.DB_NAME || 'student_expense_tracker',
  PORT: process.env.DB_PORT || 3306,    // Database port
  dialect: 'mysql',
  logging: false,        // Disable logging for now
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Check if we're using a Railway connection string
let sequelize;
const railwayConnectionString = process.env.DATABASE_URL;

if (railwayConnectionString) {
  console.log('Using Railway connection string');
  // If we have a connection string, use it directly
  sequelize = new Sequelize(railwayConnectionString, {
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      // Add this for proper timezone handling
      useUTC: false,
      dateStrings: true,
      typeCast: true,
      timezone: '+05:30'  // IST timezone
    },
    timezone: '+05:30' // Set your timezone here
  });
} else {
  // Create Sequelize instance with individual parameters
  sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: {
      timestamps: true,
      underscored: true
    },
    dialectOptions: {
      // Add this for proper timezone handling
      useUTC: false,
      dateStrings: true,
      typeCast: true,
      timezone: '+05:30'  // IST timezone
    },
    timezone: '+05:30' // Set your timezone here
  });
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
};

// Sync all models
const syncDatabase = async () => {
  try {
    console.log('🔍 Starting database sync...');
    
    // Use a safer sync mode first to check connection
    await sequelize.authenticate();
    console.log('✅ Authentication successful, attempting to sync models');
    
    // Try to sync without altering tables first
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Basic database sync successful');
    
    // Now try to make any needed alterations
    // Wrap in try/catch to continue even if alters fail
    try {
      console.log('🔄 Applying schema changes...');
      await sequelize.sync({ alter: true });
      console.log('✅ Schema updates applied successfully');
    } catch (alterError) {
      console.warn('⚠️ Could not apply all schema changes:', alterError.message);
      console.warn('The application will continue with existing schema');
      // Don't return false here, as we want to continue even if alters fail
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unable to sync database:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.parent) {
      console.error('Parent error:', error.parent.message);
      console.error('SQL error code:', error.parent.code);
    }
    if (error.errors) {
      console.error('Validation errors:', error.errors.map(e => ({
        message: e.message,
        type: e.type,
        path: e.path,
        value: e.value
      })));
    }
    return false;
  }
};

// Export the configured sequelize instance and config
module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  ...dbConfig
};

// Test the connection when this module is required (without syncing)
(async () => {
  try {
    await testConnection();
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
  }
})();
