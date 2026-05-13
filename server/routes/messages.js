const express = require('express')
const router = express.Router()
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
} = require('../controllers/messageController')
const { protect } = require('../middleware/auth')

router.get('/:conversationId', protect, getMessages)
router.post('/:conversationId', protect, sendMessage)
router.put('/:messageId', protect, editMessage)
router.delete('/:messageId', protect, deleteMessage)
router.put('/:conversationId/read', protect, markAsRead)

module.exports = router
