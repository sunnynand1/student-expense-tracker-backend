const express = require('express');
const router = express.Router();
const { TeamMember, User, sequelize } = require('../models');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const { Op } = require('sequelize');

// @route   GET /api/team
// @desc    Get all team members
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Find all team members where the current user is the inviter
    const teamMembers = await TeamMember.findAll({
      where: { invitedById: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ]
    });

    res.json({
      success: true,
      data: teamMembers
    });
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/team/:id
// @desc    Get a specific team member
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const teamMember = await TeamMember.findOne({
      where: {
        id: req.params.id,
        invitedById: req.user.id
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'profileImage']
        }
      ]
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      data: teamMember
    });
  } catch (err) {
    console.error('Error fetching team member:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/team/invite
// @desc    Invite a new team member
// @access  Private
router.post('/invite', auth, async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and email'
      });
    }

    // Check if the email is already a team member
    const existingMember = await TeamMember.findOne({
      where: { email, invitedById: req.user.id }
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'This email is already a team member or has a pending invitation'
      });
    }

    // Generate invite token and expiry
    const inviteToken = crypto.randomBytes(20).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create team member
    const teamMember = await TeamMember.create({
      name,
      email,
      role: role || 'member',
      status: 'pending',
      invitedById: req.user.id,
      inviteToken,
      inviteExpires
    });

    // In a real application, you would send an email with the invitation link
    // For this demo, we'll just return the token

    res.status(201).json({
      success: true,
      data: teamMember,
      message: 'Invitation sent successfully'
    });
  } catch (err) {
    console.error('Error inviting team member:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/team/:id
// @desc    Update a team member
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, role } = req.body;

    // Find the team member
    const teamMember = await TeamMember.findOne({
      where: {
        id: req.params.id,
        invitedById: req.user.id
      }
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Update team member
    teamMember.name = name || teamMember.name;
    teamMember.role = role || teamMember.role;

    await teamMember.save();

    res.json({
      success: true,
      data: teamMember
    });
  } catch (err) {
    console.error('Error updating team member:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/team/:id
// @desc    Delete a team member
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const teamMember = await TeamMember.findOne({
      where: {
        id: req.params.id,
        invitedById: req.user.id
      }
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    await teamMember.destroy();

    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (err) {
    console.error('Error removing team member:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/team/accept/:token
// @desc    Accept a team invitation
// @access  Public
router.get('/accept/:token', async (req, res) => {
  try {
    const teamMember = await TeamMember.findOne({
      where: {
        inviteToken: req.params.token,
        status: 'pending',
        inviteExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!teamMember) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation token'
      });
    }

    // In a real application, you would redirect to a page where the user can
    // create an account or log in, and then associate their user ID with this invitation

    res.json({
      success: true,
      data: {
        email: teamMember.email,
        name: teamMember.name,
        token: req.params.token
      }
    });
  } catch (err) {
    console.error('Error accepting invitation:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
