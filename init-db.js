const { sequelize } = require('./config/db');
const { User, Expense } = require('./models');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  try {
    // Test the database connection
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');

    // Sync all models with the database
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ force: true });
    console.log('✅ Database synchronized');

    // Create a test user
    console.log('👤 Creating test user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await User.create({
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      is_active: true
    });
    console.log('✅ Test user created:', testUser.toJSON());

    // Create some test expenses
    console.log('💰 Creating test expenses...');
    const expenses = await Expense.bulkCreate([
      {
        user_id: testUser.id,
        category: 'Food',
        amount: 25.50,
        notes: 'Lunch at cafe',
        date: new Date()
      },
      {
        user_id: testUser.id,
        category: 'Transport',
        amount: 15.00,
        notes: 'Bus fare',
        date: new Date()
      },
      {
        user_id: testUser.id,
        category: 'Entertainment',
        amount: 10.99,
        notes: 'Movie ticket',
        date: new Date()
      }
    ]);
    console.log(`✅ Created ${expenses.length} test expenses`);

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('You can now start the server with: npm run dev\n');
    console.log('Test user credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
