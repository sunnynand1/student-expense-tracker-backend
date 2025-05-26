const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { Op } = require('sequelize');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('amount', 'Amount is required and must be greater than 0').isFloat({ min: 0.01 }),
      check('description', 'Description is required').not().isEmpty(),
      check('category', 'Category is required').not().isEmpty(),
      check('date', 'Date is required').isDate(),
    ],
  ],
  async (req, res) => {
    try {
      const { amount, description, category, date } = req.body;

      // Create new expense
      const expense = await Expense.create({
        user_id: req.user.id,
        amount,
        notes: description,  // Using notes field instead of description
        category,
        date: date || new Date(),
      });
      
      console.log('New expense created:', expense.toJSON());

      res.status(201).json({
        success: true,
        expense,
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// @route   GET /api/expenses
// @desc    Get all expenses for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      where: { user_id: req.user.id },
      order: [['date', 'DESC']],
      raw: true
    });
    
    console.log('Fetched expenses:', expenses);

    res.json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update an expense
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { amount, description, category, date } = req.body;

    const expense = await Expense.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Update expense
    const updatedExpense = await expense.update({
      amount: amount || expense.amount,
      notes: description || expense.notes,
      category: category || expense.category,
      date: date || expense.date,
    });
    
    console.log('Updated expense:', updatedExpense.toJSON());

    res.json({
      success: true,
      expense: updatedExpense,
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id,
      },
    });
    
    console.log('Deleting expense:', expense ? expense.toJSON() : 'Not found');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    await expense.destroy();

    res.json({
      success: true,
      message: 'Expense removed',
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
