const express = require('express')
const router = express.Router()
const {
  searchUsers,
  getUserById,
  updateProfile,
  updateStatus,
  getOnlineUsers,
} = require('../controllers/userController')
const { protect } = require('../middleware/auth')
const { uploadAvatar } = require('../middleware/multer')

router.get('/search', protect, searchUsers)
router.get('/online', protect, getOnlineUsers)
router.put('/status', protect, updateStatus)
router.put('/profile', protect, uploadAvatar.single('avatar'), updateProfile)
router.get('/:id', protect, getUserById)

module.exports = router
