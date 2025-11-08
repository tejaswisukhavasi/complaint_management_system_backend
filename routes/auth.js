const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId, department, phone, registrationKey } = req.body;

    // Validate registration key for admin and staff roles
    if (role === 'admin') {
      if (!registrationKey || registrationKey !== process.env.ADMIN_REGISTRATION_KEY) {
        return res.status(403).json({ 
          message: 'Invalid admin registration key. Contact administrator for the correct key.' 
        });
      }
    }

    if (role === 'staff') {
      if (!registrationKey || registrationKey !== process.env.STAFF_REGISTRATION_KEY) {
        return res.status(403).json({ 
          message: 'Invalid staff registration key. Contact administrator for the correct key.' 
        });
      }
    }

    // Validate studentId for students
    if (role === 'student' && !studentId) {
      return res.status(400).json({ message: 'Student ID is required for student registration' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if studentId already exists (for students)
    if (studentId) {
      const studentIdExists = await User.findOne({ studentId });
      if (studentIdExists) {
        return res.status(400).json({ message: 'Student ID already registered' });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      studentId: role === 'student' ? studentId : undefined,
      department,
      phone
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId,
      department: user.department,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
