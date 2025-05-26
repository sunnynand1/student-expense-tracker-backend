const { sequelize } = require('../config/db');
const User = require('./User');
const Expense = require('./Expense');

// Set up associations
User.hasMany(Expense, {
  foreignKey: 'user_id',
  as: 'expenses'
});

Expense.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Expense
};
