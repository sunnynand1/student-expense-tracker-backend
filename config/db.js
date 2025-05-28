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
    
    // Use force: false and alter: false first to avoid index issues
    console.log('🔄 Performing initial sync with no schema changes...');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Initial sync completed');
    
    // Instead of altering tables automatically, execute specific SQL to fix foreign keys
    try {
      console.log('🔄 Checking and fixing foreign key references...');
      
      // Get the queryInterface to run raw queries
      const queryInterface = sequelize.getQueryInterface();
      
      // Check if tables exist before trying to alter them
      const [tables] = await sequelize.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = '${process.env.DB_NAME || 'railway'}' AND table_type = 'BASE TABLE'`
      );
      
      const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);
      console.log('Existing tables:', tableNames);
      
      // Only try to fix foreign keys for tables that exist
      if (tableNames.includes('budgets')) {
        console.log('Checking budgets table...');
        // Check if the foreign key constraint exists and fix it if needed
        await queryInterface.sequelize.query(
          `ALTER TABLE budgets 
           ADD CONSTRAINT fk_budgets_user 
           FOREIGN KEY (user_id) REFERENCES users(id) 
           ON DELETE CASCADE;`
        ).catch(err => {
          // Ignore errors about constraint already existing
          if (!err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
            console.warn('Warning fixing budgets foreign key:', err.message);
          }
        });
      }
      
      if (tableNames.includes('documents')) {
        console.log('Checking documents table...');
        await queryInterface.sequelize.query(
          `ALTER TABLE documents 
           ADD CONSTRAINT fk_documents_user 
           FOREIGN KEY (user_id) REFERENCES users(id) 
           ON DELETE CASCADE;`
        ).catch(err => {
          if (!err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
            console.warn('Warning fixing documents foreign key:', err.message);
          }
        });
      }
      
      if (tableNames.includes('team_members')) {
        console.log('Checking team_members table...');
        // Fix invitedById foreign key
        await queryInterface.sequelize.query(
          `ALTER TABLE team_members 
           ADD CONSTRAINT fk_team_members_invited_by 
           FOREIGN KEY (invited_by_id) REFERENCES users(id) 
           ON DELETE CASCADE;`
        ).catch(err => {
          if (!err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
            console.warn('Warning fixing team_members invited_by_id foreign key:', err.message);
          }
        });
        
        // Fix userId foreign key
        await queryInterface.sequelize.query(
          `ALTER TABLE team_members 
           ADD CONSTRAINT fk_team_members_user 
           FOREIGN KEY (user_id) REFERENCES users(id) 
           ON DELETE SET NULL;`
        ).catch(err => {
          if (!err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
            console.warn('Warning fixing team_members user_id foreign key:', err.message);
          }
        });
      }
      
      console.log('✅ Foreign key checks and fixes completed');
    } catch (alterError) {
      console.warn('⚠️ Could not apply all schema changes:', alterError.message);
      console.warn('The application will continue with existing schema');
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
