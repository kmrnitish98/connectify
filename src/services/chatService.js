import api from './api'

export const chatService = {
  // Conversations
  getConversations: async () => {
    const { data } = await api.get('/conversations')
    return data.conversations
  },

  getOrCreateConversation: async (participantId) => {
    const { data } = await api.post('/conversations', { participantId })
    return data.conversation
  },

  // Messages
  getMessages: async (conversationId, page = 1, limit = 30) => {
    const { data } = await api.get(`/messages/${conversationId}?page=${page}&limit=${limit}`)
    return data
  },

  sendMessage: async (conversationId, payload) => {
    const { data } = await api.post(`/messages/${conversationId}`, payload)
    return data.message
  },

  editMessage: async (messageId, text) => {
    const { data } = await api.put(`/messages/${messageId}`, { text })
    return data.message
  },

  deleteMessage: async (messageId) => {
    const { data } = await api.delete(`/messages/${messageId}`)
    return data
  },

  markAsRead: async (conversationId) => {
    await api.put(`/messages/${conversationId}/read`)
  },
}
