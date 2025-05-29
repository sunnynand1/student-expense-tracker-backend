'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('budgets', 'plan_id', {
      type: Sequelize.STRING,
      allowNull: true,
      field: 'plan_id'
    });

    await queryInterface.addColumn('budgets', 'plan_name', {
      type: Sequelize.STRING,
      allowNull: true,
      field: 'plan_name'
    });

    console.log('Added plan_id and plan_name columns to budgets table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('budgets', 'plan_id');
    await queryInterface.removeColumn('budgets', 'plan_name');
    
    console.log('Removed plan_id and plan_name columns from budgets table');
  }
};
