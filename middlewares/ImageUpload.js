const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // check mimetype
    if (!file.mimetype.startsWith("image")) {
      req.fileValidationError = "Only images are allowed";
      return cb(null, false, new Error("Only images are allowed"));
    }
    cb(null, true);
  },
});

module.exports = upload;
