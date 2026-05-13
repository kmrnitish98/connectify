const express = require('express')
const router = express.Router()
const Call = require('../models/Call')
const { protect } = require('../middleware/auth')

// @route   GET /api/calls
// @desc    Get user's call history
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [{ caller: req.user._id }, { receiver: req.user._id }]
    })
      .populate('caller', 'name username avatar')
      .populate('receiver', 'name username avatar')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json(calls)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error fetching calls' })
  }
})

module.exports = router
