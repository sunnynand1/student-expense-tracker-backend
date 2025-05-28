const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Budget = sequelize.define('Budget', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    period: {
      type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'yearly'),
      defaultValue: 'monthly'
    },
    planId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    planName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'budgets',
    timestamps: true,
    underscored: true
  });

  Budget.associate = (models) => {
    Budget.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Budget;
};
