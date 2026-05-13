import api from './api'

export const userService = {
  searchUsers: async (q) => {
    const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`)
    return data.users
  },

  getUserById: async (id) => {
    const { data } = await api.get(`/users/${id}`)
    return data.user
  },

  updateProfile: async (formData) => {
    const { data } = await api.put('/users/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.user
  },

  updateStatus: async (status) => {
    const { data } = await api.put('/users/status', { status })
    return data.user
  },

  getOnlineUsers: async () => {
    const { data } = await api.get('/users/online')
    return data.users
  },
}
