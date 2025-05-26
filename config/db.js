const { Sequelize } = require('sequelize');

// Database configuration
const dbConfig = {
  HOST: 'localhost',
  USER: 'root',          // MySQL username
  PASSWORD: '1234',      // MySQL password
  DB: 'student_expense_tracker',
  dialect: 'mysql',
  logging: false,        // Disable logging for now
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
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
    await sequelize.sync({ alter: true, logging: console.log });
    console.log('✅ Database synchronized');
    return true;
  } catch (error) {
    console.error('❌ Unable to sync database:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
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
