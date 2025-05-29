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
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Budget name cannot be empty'
        },
        len: {
          args: [1, 100],
          msg: 'Budget name must be between 1 and 100 characters'
        }
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Amount must be a valid decimal number'
        },
        min: {
          args: [0],
          msg: 'Amount must be greater than or equal to 0'
        }
      },
      get() {
        // Always return as a number, not a string
        const value = this.getDataValue('amount');
        return value === null ? null : parseFloat(value);
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Category cannot be empty'
        }
      }
    },
    period: {
      type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'yearly'),
      defaultValue: 'monthly',
      validate: {
        isIn: {
          args: [['weekly', 'monthly', 'quarterly', 'yearly']],
          msg: 'Period must be one of: weekly, monthly, quarterly, yearly'
        }
      }
    },
    planId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'plan_id'  // Explicitly set the database column name
    },
    planName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'plan_name'  // Explicitly set the database column name
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
    underscored: true, // This will automatically convert camelCase to snake_case for all fields
    // Add hooks for additional validation or logging
    hooks: {
      beforeValidate: (budget, options) => {
        // Ensure amount is properly formatted
        if (budget.amount !== undefined && typeof budget.amount === 'string') {
          budget.amount = parseFloat(budget.amount);
        }
      },
      afterCreate: (budget, options) => {
        console.log(`New budget created: ${budget.id} for user ${budget.userId}`);
      },
      afterUpdate: (budget, options) => {
        console.log(`Budget updated: ${budget.id}`);
      },
      afterDestroy: (budget, options) => {
        console.log(`Budget deleted: ${budget.id}`);
      }
    }
  });

  Budget.associate = (models) => {
    Budget.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Budget;
};
