const User = require('../models/User')
const cloudinary = require('../config/cloudinary')

// @desc  Search users
// @route GET /api/users/search?q=
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, users: [] })
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        },
      ],
    })
      .select('name username email avatar status lastSeen')
      .limit(20)

    res.json({ success: true, users })
  } catch (error) {
    next(error)
  }
}

// @desc  Get user by ID
// @route GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      'name username email avatar bio status lastSeen createdAt'
    )
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

// @desc  Update profile
// @route PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, status } = req.body
    const updates = {}

    if (name) updates.name = name.trim()
    if (bio !== undefined) updates.bio = bio.trim()
    if (status && ['online', 'away', 'busy', 'offline'].includes(status)) {
      updates.status = status
    }

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar from Cloudinary
      if (req.user.avatarPublicId) {
        await cloudinary.uploader.destroy(req.user.avatarPublicId).catch(() => {})
      }
      updates.avatar = req.file.path
      updates.avatarPublicId = req.file.filename
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('name username email avatar bio status lastSeen')

    res.json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

// @desc  Update status only
// @route PUT /api/users/status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    if (!['online', 'away', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { status, lastSeen: new Date() },
      { new: true }
    ).select('status lastSeen')
    res.json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

// @desc  Get online users
// @route GET /api/users/online
const getOnlineUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      status: 'online',
      _id: { $ne: req.user._id },
    }).select('name username avatar status')
    res.json({ success: true, users })
  } catch (error) {
    next(error)
  }
}

module.exports = { searchUsers, getUserById, updateProfile, updateStatus, getOnlineUsers }
