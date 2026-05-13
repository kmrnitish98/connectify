const express = require('express')
const router = express.Router()
const { uploadImage, uploadFile, deleteUpload } = require('../controllers/uploadController')
const { protect } = require('../middleware/auth')
const { uploadImage: imgMiddleware, uploadFile: fileMiddleware } = require('../middleware/multer')

router.post('/image', protect, imgMiddleware.single('file'), uploadImage)
router.post('/file', protect, fileMiddleware.single('file'), uploadFile)
router.delete('/:publicId', protect, deleteUpload)

module.exports = router
