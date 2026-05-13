import { useState, useRef, useCallback } from 'react'
import { uploadService } from '../services/uploadService'

const useUpload = () => {
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const uploadImage = useCallback(async (file) => {
    setUploading(true)
    setProgress(0)
    setError(null)
    try {
      const result = await uploadService.uploadImage(file, setProgress)
      return result
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
      return null
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [])

  const uploadFile = useCallback(async (file) => {
    setUploading(true)
    setProgress(0)
    setError(null)
    try {
      const result = await uploadService.uploadFile(file, setProgress)
      return result
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
      return null
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [])

  return { uploadImage, uploadFile, progress, uploading, error }
}

export default useUpload
