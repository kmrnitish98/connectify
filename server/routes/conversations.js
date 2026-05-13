const express = require('express')
const router = express.Router()
const { getConversations, getOrCreateConversation } = require('../controllers/conversationController')
const { protect } = require('../middleware/auth')

router.get('/', protect, getConversations)
router.post('/', protect, getOrCreateConversation)

module.exports = router
