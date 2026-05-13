const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'emoji', 'call'],
      default: 'text',
    },
    text: {
      type: String,
      default: '',
    },
    callData: {
      type: {
        type: String, // 'audio' or 'video'
      },
      status: String, // 'missed', 'rejected', 'answered', 'ended'
      duration: Number,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    filePublicId: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

messageSchema.index({ conversation: 1, createdAt: -1 })
// FIX #18: Index deletedFor so soft-delete filter queries are fast
messageSchema.index({ conversation: 1, deletedFor: 1 })
// Index for read receipt lookups
messageSchema.index({ conversation: 1, 'readBy': 1 })

module.exports = mongoose.model('Message', messageSchema)

