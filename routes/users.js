const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/users/staff
// @desc    Get all staff members
// @access  Private (Admin)
router.get('/staff', protect, authorize('admin'), async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff', isActive: true })
      .select('-password')
      .sort({ name: 1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, department, phone, isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.department = department || user.department;
    user.phone = phone || user.phone;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      isActive: user.isActive
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
