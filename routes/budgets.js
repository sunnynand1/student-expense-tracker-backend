const express = require('express');
const router = express.Router();
const { Budget } = require('../models');
const auth = require('../middleware/auth');

// @route   GET /api/budgets
// @desc    Get all budgets for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: budgets
    });
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/budgets/:id
// @desc    Get a specific budget
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    res.json({
      success: true,
      data: budget
    });
  } catch (err) {
    console.error('Error fetching budget:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/budgets
// @desc    Create a new budget
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, amount, category, period, planId, planName } = req.body;

    // Validation
    if (!name || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, amount, and category'
      });
    }

    const budget = await Budget.create({
      name,
      amount,
      category,
      period: period || 'monthly',
      planId,
      planName,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: budget
    });
  } catch (err) {
    console.error('Error creating budget:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/budgets/:id
// @desc    Update a budget
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, amount, category, period, planId, planName } = req.body;

    // Find the budget
    const budget = await Budget.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Update budget
    budget.name = name || budget.name;
    budget.amount = amount || budget.amount;
    budget.category = category || budget.category;
    budget.period = period || budget.period;
    
    // Only update plan fields if they are provided
    if (planId !== undefined) budget.planId = planId;
    if (planName !== undefined) budget.planName = planName;

    await budget.save();

    res.json({
      success: true,
      data: budget
    });
  } catch (err) {
    console.error('Error updating budget:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/budgets/:id
// @desc    Delete a budget
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const budget = await Budget.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    await budget.destroy();

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting budget:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
