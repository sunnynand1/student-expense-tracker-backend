const express = require('express');
const router = express.Router();
const { Expense, Budget, sequelize } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

// @route   GET /api/reports
// @desc    Get expense reports for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate date range
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure valid date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    // Get all expenses within the date range
    const expenses = await Expense.findAll({
      where: {
        userId: req.user.id,
        date: {
          [Op.between]: [start, end]
        }
      },
      attributes: ['id', 'amount', 'category', 'date']
    });
    
    // Get all budgets for the user
    const budgets = await Budget.findAll({
      where: {
        userId: req.user.id
      },
      attributes: ['id', 'amount', 'category', 'period']
    });
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    
    // Calculate expenses by category
    const expensesByCategory = [];
    const categoryTotals = {};
    
    expenses.forEach(expense => {
      const category = expense.category;
      const amount = parseFloat(expense.amount);
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      
      categoryTotals[category] += amount;
    });
    
    Object.keys(categoryTotals).forEach(category => {
      expensesByCategory.push({
        category,
        amount: categoryTotals[category]
      });
    });
    
    // Calculate expenses by month
    const expensesByMonth = [];
    const monthTotals = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const amount = parseFloat(expense.amount);
      
      if (!monthTotals[month]) {
        monthTotals[month] = 0;
      }
      
      monthTotals[month] += amount;
    });
    
    Object.keys(monthTotals).forEach(month => {
      expensesByMonth.push({
        month,
        amount: monthTotals[month]
      });
    });
    
    // Calculate budget comparison
    const budgetComparison = [];
    
    budgets.forEach(budget => {
      const category = budget.category;
      const budgetAmount = parseFloat(budget.amount);
      const actualAmount = categoryTotals[category] || 0;
      const difference = budgetAmount - actualAmount;
      
      budgetComparison.push({
        category,
        budget: budgetAmount,
        actual: actualAmount,
        difference
      });
    });
    
    // Return the report data
    res.json({
      success: true,
      data: {
        totalExpenses,
        expensesByCategory,
        expensesByMonth,
        budgetComparison
      }
    });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
