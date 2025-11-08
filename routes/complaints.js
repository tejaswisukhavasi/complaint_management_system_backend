const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/complaints
// @desc    Create new complaint
// @access  Private (Student)
router.post('/', protect, authorize('student'), upload.array('attachments', 5), async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    // Map Cloudinary files to attachment objects
    const attachments = req.files ? req.files.map(file => {
      console.log('📎 File uploaded to Cloudinary:', {
        originalName: file.originalname,
        cloudinaryUrl: file.path,
        cloudinaryId: file.filename
      });
      return {
        filename: file.originalname,
        path: file.path // This is the Cloudinary URL
      };
    }) : [];

    console.log('📋 Creating complaint with attachments:', attachments);

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority: priority || 'Medium',
      student: req.user._id,
      attachments
    });

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('student', 'name email department studentId');

    res.status(201).json(populatedComplaint);
  } catch (error) {
    console.error('❌ Error creating complaint:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/complaints
// @desc    Get all complaints (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // Students see only their complaints
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    // Staff see only assigned complaints
    if (req.user.role === 'staff') {
      query.assignedTo = req.user._id;
    }

    // Admin sees all complaints (no filter)

    const complaints = await Complaint.find(query)
      .populate('student', 'name email department studentId')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/complaints/:id
// @desc    Get single complaint
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'name email department phone studentId')
      .populate('assignedTo', 'name email department');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check authorization
    if (req.user.role === 'student' && complaint.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.user.role === 'staff' && (!complaint.assignedTo || complaint.assignedTo._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/complaints/:id
// @desc    Update complaint
// @access  Private (Staff, Admin)
router.put('/:id', protect, authorize('staff', 'admin'), async (req, res) => {
  try {
    const { status, feedback, priority, assignedTo } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Staff can only update assigned complaints
    if (req.user.role === 'staff' && (!complaint.assignedTo || complaint.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (status) complaint.status = status;
    if (feedback) complaint.feedback = feedback;
    if (priority && req.user.role === 'admin') complaint.priority = priority;
    if (assignedTo && req.user.role === 'admin') complaint.assignedTo = assignedTo;

    if (status === 'Resolved') {
      complaint.resolvedAt = Date.now();
    }

    await complaint.save();

    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate('student', 'name email department studentId')
      .populate('assignedTo', 'name email');

    res.json(updatedComplaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/complaints/:id
// @desc    Delete complaint
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    await complaint.deleteOne();
    res.json({ message: 'Complaint removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
