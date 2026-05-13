const User = require('../models/User')
const generateToken = require('../utils/generateToken')

// @desc  Register user
// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Generate unique username from email
    let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const usernameExists = await User.findOne({ username })
    if (usernameExists) {
      username = `${username}_${Date.now().toString().slice(-4)}`
    }

    const user = await User.create({ name, email, password, username })

    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc  Login user
// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' })
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Update status to online
    user.status = 'online'
    user.lastSeen = new Date()
    await user.save({ validateBeforeSave: false })

    const token = generateToken(user._id)

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
      },
    })
  } catch (error) {
    next(error)
  }
}

// @desc  Get current user
// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      _id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
      bio: req.user.bio,
      status: req.user.status,
      lastSeen: req.user.lastSeen,
    },
  })
}

// @desc  Logout
// @route POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      status: 'offline',
      lastSeen: new Date(),
      socketId: null,
    })
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = { register, login, getMe, logout }
