const express = require('express');
const router = express.Router();
const { Budget } = require('../models');
const auth = require('../middleware/auth');

// @route   GET /api/budgets
// @desc    Get all budgets for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching budgets for user:', req.user.id);
    
    // Validate user ID
    if (!req.user || !req.user.id) {
      console.error('Invalid user ID in request');
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    const budgets = await Budget.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${budgets.length} budgets for user ${req.user.id}`);
    
    res.json({
      success: true,
      data: budgets
    });
  } catch (err) {
    console.error('Error fetching budgets:', err.message);
    console.error('Error stack:', err.stack);
    
    // More detailed error response
    res.status(500).json({
      success: false,
      message: 'Server error while fetching budgets',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
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
    console.log('Creating budget for user:', req.user.id);
    console.log('Request body:', JSON.stringify(req.body));
    
    const { name, amount, category, period, planId, planName } = req.body;

    // Validation
    if (!name || !amount || !category) {
      console.error('Missing required fields:', { name, amount, category });
      return res.status(400).json({
        success: false,
        message: 'Please provide name, amount, and category'
      });
    }
    
    // Validate user ID
    if (!req.user || !req.user.id) {
      console.error('Invalid user ID in request');
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Validate amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Amount must be a valid number'
      });
    }

    // Create the budget with validated data
    const budget = await Budget.create({
      name,
      amount: parsedAmount,
      category,
      period: period || 'monthly',
      planId: planId || null,
      planName: planName || null,
      userId: req.user.id
    });

    console.log('Budget created successfully:', budget.id);
    
    res.status(201).json({
      success: true,
      data: budget
    });
  } catch (err) {
    console.error('Error creating budget:', err.message);
    console.error('Error stack:', err.stack);
    
    // Handle specific database errors
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.errors.map(e => e.message)
      });
    }
    
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(400).json({
        success: false,
        message: 'Database error',
        error: process.env.NODE_ENV === 'production' ? 'Database error' : err.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating budget',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   PUT /api/budgets/:id
// @desc    Update a budget
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    console.log(`Updating budget ${req.params.id} for user ${req.user.id}`);
    console.log('Request body:', JSON.stringify(req.body));
    
    const { name, amount, category, period, planId, planName } = req.body;

    // Validate ID
    if (!req.params.id) {
      console.error('Missing budget ID');
      return res.status(400).json({
        success: false,
        message: 'Budget ID is required'
      });
    }

    // Find the budget
    const budget = await Budget.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!budget) {
      console.error(`Budget ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Validate amount if provided
    let parsedAmount = budget.amount;
    if (amount !== undefined) {
      parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        console.error('Invalid amount:', amount);
        return res.status(400).json({
          success: false,
          message: 'Amount must be a valid number'
        });
      }
    }

    // Update the budget with validated data
    budget.name = name || budget.name;
    budget.amount = parsedAmount;
    budget.category = category || budget.category;
    budget.period = period || budget.period;
    budget.planId = planId !== undefined ? planId : budget.planId;
    budget.planName = planName !== undefined ? planName : budget.planName;

    await budget.save();
    console.log(`Budget ${budget.id} updated successfully`);

    res.json({
      success: true,
      data: budget
    });
  } catch (err) {
    console.error('Error updating budget:', err.message);
    console.error('Error stack:', err.stack);
    
    // Handle specific database errors
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.errors.map(e => e.message)
      });
    }
    
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(400).json({
        success: false,
        message: 'Database error',
        error: process.env.NODE_ENV === 'production' ? 'Database error' : err.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating budget',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

// @route   DELETE /api/budgets/:id
// @desc    Delete a budget
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log(`Deleting budget ${req.params.id} for user ${req.user.id}`);
    
    // Validate ID
    if (!req.params.id) {
      console.error('Missing budget ID');
      return res.status(400).json({
        success: false,
        message: 'Budget ID is required'
      });
    }

    // Find the budget
    const budget = await Budget.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!budget) {
      console.error(`Budget ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Delete the budget
    await budget.destroy();
    console.log(`Budget ${req.params.id} deleted successfully`);

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting budget:', err.message);
    console.error('Error stack:', err.stack);
    
    // Handle specific database errors
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete budget that is referenced by other records',
        error: process.env.NODE_ENV === 'production' ? 'Constraint error' : err.message
      });
    }
    
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(400).json({
        success: false,
        message: 'Database error',
        error: process.env.NODE_ENV === 'production' ? 'Database error' : err.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting budget',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  }
});

module.exports = router;
