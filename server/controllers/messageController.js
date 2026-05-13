const Message = require('../models/Message')
const Conversation = require('../models/Conversation')

// @desc  Get messages for a conversation (paginated)
// @route GET /api/messages/:conversationId?page=1&limit=30
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 30
    const skip = (page - 1) * limit

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    })
    if (!conversation) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: req.user._id },
    })
      .populate('sender', 'name username avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'name username' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Message.countDocuments({ conversation: conversationId })

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    next(error)
  }
}

// @desc  Send a text message
// @route POST /api/messages/:conversationId
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params
    const { text, type = 'text', fileUrl, filePublicId, fileName, fileSize, mimeType, replyTo } = req.body

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    })
    if (!conversation) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      type,
      text: text || '',
      fileUrl,
      filePublicId,
      fileName,
      fileSize,
      mimeType,
      replyTo: replyTo || null,
      readBy: [req.user._id],
    })

    await message.populate('sender', 'name username avatar')
    if (message.replyTo) {
      await message.populate({ path: 'replyTo', populate: { path: 'sender', select: 'name username' } })
    }

    // Update lastMessage in conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    })

    res.status(201).json({ success: true, message })
  } catch (error) {
    next(error)
  }
}

// @desc  Edit a message
// @route PUT /api/messages/:messageId
const editMessage = async (req, res, next) => {
  try {
    const { text } = req.body
    const message = await Message.findOne({
      _id: req.params.messageId,
      sender: req.user._id,
      type: 'text',
    })

    if (!message) return res.status(404).json({ message: 'Message not found or not editable' })

    message.text = text
    message.edited = true
    message.editedAt = new Date()
    await message.save()
    await message.populate('sender', 'name username avatar')

    res.json({ success: true, message })
  } catch (error) {
    next(error)
  }
}

// @desc  Delete a message (soft delete)
// @route DELETE /api/messages/:messageId
const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findOne({
      _id: req.params.messageId,
      conversation: { $exists: true },
    })

    if (!message) return res.status(404).json({ message: 'Message not found' })

    // Only sender can delete for everyone; anyone can delete for themselves
    if (message.sender.toString() === req.user._id.toString()) {
      await Message.findByIdAndDelete(message._id)
    } else {
      message.deletedFor.push(req.user._id)
      await message.save()
    }

    res.json({ success: true, messageId: req.params.messageId })
  } catch (error) {
    next(error)
  }
}

// @desc  Mark messages as read
// @route PUT /api/messages/:conversationId/read
const markAsRead = async (req, res, next) => {
  try {
    await Message.updateMany(
      {
        conversation: req.params.conversationId,
        readBy: { $ne: req.user._id },
        sender: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    )
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

module.exports = { getMessages, sendMessage, editMessage, deleteMessage, markAsRead }
