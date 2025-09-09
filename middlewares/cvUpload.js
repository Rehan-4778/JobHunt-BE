const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "jobhunt/cvs",
    resource_type: "raw",
    public_id: (req, file) => {
      // Generate unique filename with original extension
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const originalName = file.originalname.split('.')[0];
      const extension = file.originalname.split('.').pop();
      return `${originalName}-${uniqueSuffix}.${extension}`;
    },
    // Make files publicly accessible
    access_mode: "public",
    // Allow unsigned uploads (optional, for more security you can remove this)
    unsigned: false,
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    console.log('File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Check file type for CVs
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    // Also check file extension as backup
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      console.log('File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('File rejected:', file.originalname, 'MIME:', file.mimetype, 'Extension:', fileExtension);
      req.fileValidationError = "Only PDF, DOC, and DOCX files are allowed for CV upload";
      return cb(null, false, new Error("Only PDF, DOC, and DOCX files are allowed for CV upload"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please use "cv" as the field name.'
      });
    }
  }
  
  if (err.message === 'Only PDF, DOC, and DOCX files are allowed for CV upload') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};

module.exports = { upload, handleUploadError };
