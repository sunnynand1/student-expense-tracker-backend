const { Sequelize } = require('sequelize');

// Database configuration with environment variables
const dbConfig = {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    useUTC: false,
    dateStrings: true,
    typeCast: true,
    timezone: process.env.TZ || '+05:30'  // Use TZ environment variable or default to IST
  },
  timezone: process.env.TZ || '+05:30'
};

let sequelize;

// Use DATABASE_URL from environment if available, otherwise use individual parameters
if (process.env.DATABASE_URL) {
  // Parse the database URL
  const url = new URL(process.env.DATABASE_URL);
  
  // Create Sequelize instance with DATABASE_URL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...dbConfig,
    dialect: 'mysql',
    protocol: 'mysql',
    dialectOptions: {
      ...dbConfig.dialectOptions,
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  // Fallback to individual environment variables
  sequelize = new Sequelize(
    process.env.DB_NAME || 'railway',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      ...dbConfig
    }
  );
}

// Test database connection with detailed error reporting
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    
    // Log connection details (but mask sensitive info)
    const config = sequelize.config;
    console.log(`Connected to ${config.dialect} database at ${config.host}:${config.port}/${config.database}`);
    
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.original?.code,
      errno: error.original?.errno,
      sqlState: error.original?.sqlState,
      sqlMessage: error.original?.sqlMessage
    });
    
    // Check for common connection errors and provide helpful messages
    if (error.original?.code === 'ECONNREFUSED') {
      console.error('Database server is not running or not accessible at the specified host and port.');
    } else if (error.original?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied: Invalid username or password.');
    } else if (error.original?.code === 'ER_BAD_DB_ERROR') {
      console.error('Database does not exist. You may need to create it first.');
    } else if (error.original?.code === 'ETIMEDOUT') {
      console.error('Connection timed out. Check network connectivity or firewall settings.');
    }
    
    return false;
  }
};

// Sync all models with improved error handling
const syncDatabase = async () => {
  try {
    console.log('🔍 Starting database sync...');
    
    // Use a safer sync mode first to check connection
    console.log('🔄 Testing database connection...');
    const connectionSuccessful = await testConnection();
    if (!connectionSuccessful) {
      throw new Error('Failed to establish database connection. Cannot proceed with sync.');
    }
    
    // Use force: false and alter: false first to avoid index issues
    console.log('🔄 Performing initial sync with no schema changes...');
    try {
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ Initial sync completed');
    } catch (syncError) {
      console.error('❌ Error during initial sync:', syncError.message);
      console.error('Error details:', {
        name: syncError.name,
        code: syncError.original?.code,
        sqlMessage: syncError.original?.sqlMessage
      });
      throw new Error('Failed to perform initial database sync');
    }
    
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
