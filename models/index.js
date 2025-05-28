const { sequelize } = require('../config/db');
const User = require('./User');
const Expense = require('./Expense');

// Initialize models with sequelize instance
let Budget, Document, TeamMember;
try {
  Budget = require('./budget')(sequelize);
  Document = require('./document')(sequelize);
  TeamMember = require('./team')(sequelize);
} catch (error) {
  console.error('Error initializing models:', error);
}

// Set up associations
User.hasMany(Expense, {
  foreignKey: 'user_id',
  as: 'expenses',
  onDelete: 'CASCADE'
});

Expense.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Only set up associations if models were successfully initialized
if (Budget) {
  User.hasMany(Budget, {
    foreignKey: 'userId',
    as: 'budgets',
    onDelete: 'CASCADE'
  });

  Budget.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });
}

if (Document) {
  User.hasMany(Document, {
    foreignKey: 'userId',
    as: 'documents',
    onDelete: 'CASCADE'
  });

  Document.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });
}

if (TeamMember) {
  User.hasMany(TeamMember, {
    foreignKey: 'invitedById',
    as: 'teamInvites',
    onDelete: 'CASCADE'
  });

  User.hasMany(TeamMember, {
    foreignKey: 'userId',
    as: 'teamMemberships',
    onDelete: 'SET NULL'
  });

  TeamMember.belongsTo(User, {
    foreignKey: 'invitedById',
    as: 'invitedBy'
  });

  TeamMember.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });
}

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Expense,
  Budget,
  Document,
  TeamMember
};
