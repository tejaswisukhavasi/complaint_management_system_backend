const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private (Admin)
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    // Total counts
    const totalComplaints = await Complaint.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalStaff = await User.countDocuments({ role: 'staff' });

    // Status breakdown
    const statusBreakdown = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Category breakdown
    const categoryBreakdown = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Priority breakdown
    const priorityBreakdown = await Complaint.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent complaints
    const recentComplaints = await Complaint.find()
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Average resolution time (in days)
    const resolvedComplaints = await Complaint.find({ status: 'Resolved', resolvedAt: { $exists: true } });
    let avgResolutionTime = 0;
    if (resolvedComplaints.length > 0) {
      const totalTime = resolvedComplaints.reduce((acc, complaint) => {
        const time = (complaint.resolvedAt - complaint.createdAt) / (1000 * 60 * 60 * 24);
        return acc + time;
      }, 0);
      avgResolutionTime = (totalTime / resolvedComplaints.length).toFixed(1);
    }

    res.json({
      totalComplaints,
      totalStudents,
      totalStaff,
      statusBreakdown,
      categoryBreakdown,
      priorityBreakdown,
      recentComplaints,
      avgResolutionTime
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/analytics/staff-performance
// @desc    Get staff performance metrics
// @access  Private (Admin)
router.get('/staff-performance', protect, authorize('admin'), async (req, res) => {
  try {
    const staffPerformance = await Complaint.aggregate([
      {
        $match: { assignedTo: { $exists: true } }
      },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staff'
        }
      },
      {
        $unwind: '$staff'
      },
      {
        $project: {
          name: '$staff.name',
          email: '$staff.email',
          total: 1,
          resolved: 1,
          pending: 1,
          inProgress: 1
        }
      }
    ]);

    res.json(staffPerformance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
