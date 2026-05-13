const mongoose = require('mongoose')

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['missed', 'rejected', 'answered', 'ended'],
      required: true,
    },
    duration: {
      type: Number,
      default: 0, // in seconds
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Call', callSchema)
