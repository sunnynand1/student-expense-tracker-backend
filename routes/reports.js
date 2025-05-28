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
    
    // Ensure end date is not before start date
    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be before start date'
      });
    }
    
    // Debug info
    console.log('Report request:', {
      userId: req.user.id,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      startObj: start,
      endObj: end
    });
    
    // Get all expenses within the date range
    let expenses = [];
    try {
      expenses = await Expense.findAll({
        where: {
          user_id: req.user.id, // Fixed: changed userId to user_id to match the database schema
          date: {
            [Op.between]: [start, end]
          }
        },
        attributes: ['id', 'amount', 'category', 'date']
      });
      console.log(`Found ${expenses.length} expenses for the date range`);
    } catch (expenseErr) {
      console.error('Error fetching expenses:', expenseErr);
      throw new Error(`Failed to fetch expenses: ${expenseErr.message}`);
    }
    
    // Get all budgets for the user
    let budgets = [];
    try {
      budgets = await Budget.findAll({
        where: {
          user_id: req.user.id // Fixed: changed userId to user_id to match the database schema
        },
        attributes: ['id', 'amount', 'category', 'period']
      });
      console.log(`Found ${budgets.length} budgets for the user`);
    } catch (budgetErr) {
      console.error('Error fetching budgets:', budgetErr);
      throw new Error(`Failed to fetch budgets: ${budgetErr.message}`);
    }
    
    // Calculate total expenses - with error handling
    let totalExpenses = 0;
    try {
      totalExpenses = expenses.reduce((sum, expense) => {
        const amount = parseFloat(expense.amount || 0);
        return isNaN(amount) ? sum : sum + amount;
      }, 0);
      console.log('Total expenses calculated:', totalExpenses);
    } catch (calcError) {
      console.error('Error calculating total expenses:', calcError);
      totalExpenses = 0; // Default to 0 if calculation fails
    }
    
    // Calculate expenses by category - with error handling
    const expensesByCategory = [];
    const categoryTotals = {};
    
    try {
      // Safely process each expense
      expenses.forEach(expense => {
        try {
          // Handle potentially missing or invalid category
          const category = expense.category || 'other';
          // Handle potentially invalid amount
          const amount = parseFloat(expense.amount || 0);
          
          if (isNaN(amount)) {
            console.warn('Invalid expense amount:', expense);
            return; // Skip this expense
          }
          
          if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
          }
          
          categoryTotals[category] += amount;
        } catch (expError) {
          console.error('Error processing expense for category calculation:', expError, expense);
          // Continue with next expense
        }
      });
      
      // Convert totals to array format
      Object.keys(categoryTotals).forEach(category => {
        expensesByCategory.push({
          category,
          amount: categoryTotals[category]
        });
      });
      
      console.log(`Processed ${expensesByCategory.length} categories`);
    } catch (categoryError) {
      console.error('Error calculating expenses by category:', categoryError);
      // Return empty array if calculation fails completely
    }
    
    // Calculate expenses by month - with error handling
    const expensesByMonth = [];
    const monthTotals = {};
    
    try {
      // Safely process each expense
      expenses.forEach(expense => {
        try {
          // Safely parse date
          let date;
          try {
            date = new Date(expense.date);
            // Check if date is valid
            if (isNaN(date.getTime())) {
              console.warn('Invalid expense date:', expense.date);
              return; // Skip this expense
            }
          } catch (dateError) {
            console.warn('Error parsing expense date:', expense.date);
            return; // Skip this expense
          }
          
          // Format month string
          const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          
          // Handle potentially invalid amount
          const amount = parseFloat(expense.amount || 0);
          if (isNaN(amount)) {
            console.warn('Invalid expense amount:', expense);
            return; // Skip this expense
          }
          
          // Initialize month total if needed
          if (!monthTotals[month]) {
            monthTotals[month] = 0;
          }
          
          // Add to month total
          monthTotals[month] += amount;
        } catch (expError) {
          console.error('Error processing expense for month calculation:', expError, expense);
          // Continue with next expense
        }
      });
      
      // Convert totals to array format
      Object.keys(monthTotals).forEach(month => {
        expensesByMonth.push({
          month,
          amount: monthTotals[month]
        });
      });
      
      console.log(`Processed ${expensesByMonth.length} months`);
    } catch (monthError) {
      console.error('Error calculating expenses by month:', monthError);
      // Return empty array if calculation fails completely
    }
    
    // Calculate budget comparison - with robust error handling
    const budgetComparison = [];
    
    try {
      // Process each budget safely
      for (const budget of budgets) {
        try {
          // Validate budget data
          if (!budget || !budget.category) {
            console.warn('Invalid budget data:', budget);
            continue; // Skip this budget
          }
          
          const category = budget.category;
          
          // Parse budget amount safely
          let budgetAmount;
          try {
            budgetAmount = parseFloat(budget.amount);
            if (isNaN(budgetAmount)) {
              console.warn('Invalid budget amount:', budget.amount);
              budgetAmount = 0;
            }
          } catch (parseError) {
            console.error('Error parsing budget amount:', parseError);
            budgetAmount = 0;
          }
          
          // Get actual amount spent in this category
          const actualAmount = categoryTotals[category] || 0;
          
          // Adjust budget amount based on period and date range
          let adjustedBudgetAmount = budgetAmount;
          try {
            // Default to monthly if period is missing or invalid
            const period = budget.period || 'monthly';
            
            if (period === 'monthly') {
              // Calculate number of months in the date range - safer calculation
              let months = 0;
              
              // Clone dates to avoid modifying the original dates
              const startDate = new Date(start);
              const endDate = new Date(end);
              
              // Set both dates to the 1st of their respective months to simplify calculation
              startDate.setDate(1);
              endDate.setDate(1);
              
              // Count months
              months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth()) + 1;
                      
              // Ensure at least 1 month
              months = Math.max(1, months);
              
              adjustedBudgetAmount = budgetAmount * months;
              console.log(`Calculated ${months} months for budget period`);
            } else if (period === 'weekly') {
              // Calculate number of weeks in the date range - safer calculation
              const diffTime = Math.max(0, end.getTime() - start.getTime());
              const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const weeks = Math.max(1, Math.ceil(days / 7));
              adjustedBudgetAmount = budgetAmount * weeks;
              console.log(`Calculated ${weeks} weeks for budget period`);
            } else if (period === 'quarterly') {
              // Calculate number of quarters (3-month periods)
              const startDate = new Date(start);
              const endDate = new Date(end);
              startDate.setDate(1);
              endDate.setDate(1);
              
              const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                             (endDate.getMonth() - startDate.getMonth()) + 1;
              const quarters = Math.max(1, Math.ceil(monthDiff / 3));
              adjustedBudgetAmount = budgetAmount * quarters;
              console.log(`Calculated ${quarters} quarters for budget period`);
            } else if (period === 'yearly') {
              // Calculate number of years
              const yearDiff = end.getFullYear() - start.getFullYear();
              const years = Math.max(1, yearDiff + (end.getMonth() > start.getMonth() || 
                                                (end.getMonth() === start.getMonth() && end.getDate() >= start.getDate()) ? 1 : 0));
              adjustedBudgetAmount = budgetAmount * years;
              console.log(`Calculated ${years} years for budget period`);
            } else {
              console.warn(`Unknown budget period: ${period}, using original amount`);
            }
          } catch (periodError) {
            console.error('Error calculating adjusted budget amount:', periodError);
            // Fallback to the original budget amount if calculation fails
            adjustedBudgetAmount = budgetAmount;
          }
          
          // Calculate difference safely
          const difference = adjustedBudgetAmount - actualAmount;
          
          // Add to comparison array
          budgetComparison.push({
            category,
            budget: adjustedBudgetAmount,
            actual: actualAmount,
            difference
          });
        } catch (budgetError) {
          console.error('Error processing budget for comparison:', budgetError, budget);
          // Continue with next budget
        }
      }
      
      console.log(`Processed ${budgetComparison.length} budget comparisons`);
    } catch (comparisonError) {
      console.error('Error calculating budget comparison:', comparisonError);
      // Leave as empty array if calculation fails completely
    }
    
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
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      code: err.code,
      query: req.query,
      userId: req.user?.id
    });
    
    // Provide more specific error messages based on error type
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: err.message,
        errors: err.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error generating report',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
