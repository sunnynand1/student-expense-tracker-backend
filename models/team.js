const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeamMember = sequelize.define('TeamMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
      defaultValue: 'member'
    },
    status: {
      type: DataTypes.ENUM('pending', 'active'),
      defaultValue: 'pending'
    },
    invitedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    inviteToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    inviteExpires: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'team_members',
    timestamps: true,
    underscored: true
  });

  TeamMember.associate = (models) => {
    TeamMember.belongsTo(models.User, {
      foreignKey: 'invitedById',
      as: 'invitedBy'
    });
    
    TeamMember.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return TeamMember;
};
