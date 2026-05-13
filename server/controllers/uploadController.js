const cloudinary = require('../config/cloudinary')

// @desc  Upload image to Cloudinary (via multer middleware)
// @route POST /api/upload/image
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    res.json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    })
  } catch (error) {
    next(error)
  }
}

// @desc  Upload file to Cloudinary
// @route POST /api/upload/file
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    res.json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    })
  } catch (error) {
    next(error)
  }
}

// @desc  Delete file from Cloudinary
// @route DELETE /api/upload/:publicId
const deleteUpload = async (req, res, next) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId)
    await cloudinary.uploader.destroy(publicId)
    res.json({ success: true, message: 'File deleted' })
  } catch (error) {
    next(error)
  }
}

module.exports = { uploadImage, uploadFile, deleteUpload }
