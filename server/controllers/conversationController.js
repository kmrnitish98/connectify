const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const User = require('../models/User')

// @desc  Get all conversations for current user
// @route GET /api/conversations
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name username avatar status lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name username' },
      })
      .sort({ updatedAt: -1 })

    // Attach unread count for each conversation
    const convsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          readBy: { $ne: req.user._id },
          sender: { $ne: req.user._id },
          deletedFor: { $ne: req.user._id },
        })
        return { ...conv.toObject(), unreadCount }
      })
    )

    res.json({ success: true, conversations: convsWithUnread })
  } catch (error) {
    next(error)
  }
}

// @desc  Get or create 1-to-1 conversation
// @route POST /api/conversations
const getOrCreateConversation = async (req, res, next) => {
  try {
    const { participantId } = req.body

    if (!participantId) {
      return res.status(400).json({ message: 'participantId is required' })
    }

    const participant = await User.findById(participantId)
    if (!participant) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Find existing 1-to-1 conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId], $size: 2 },
    }).populate('participants', 'name username avatar status lastSeen')

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId],
        isGroup: false,
      })
      conversation = await conversation.populate('participants', 'name username avatar status lastSeen')
    }

    res.json({ success: true, conversation })
  } catch (error) {
    next(error)
  }
}

module.exports = { getConversations, getOrCreateConversation }
