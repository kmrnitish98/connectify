import api from './api'

export const uploadService = {
  uploadImage: async (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })
    return data
  },

  uploadFile: async (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })
    return data
  },

  deleteFile: async (publicId) => {
    const { data } = await api.delete(`/upload/${encodeURIComponent(publicId)}`)
    return data
  },
}
