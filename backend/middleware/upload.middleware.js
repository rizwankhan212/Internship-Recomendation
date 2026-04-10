const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary with env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Store resumes in Cloudinary under the "resumes" folder
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'interns-home/resumes',
    resource_type: 'raw',               // required for PDF/DOC (non-image files)
    allowed_formats: ['pdf', 'doc', 'docx'],
    public_id: (req, file) => {
      const name = path.parse(file.originalname).name;
      return `${req.user.id}_${Date.now()}_${name}`;
    },
  },
});

// Accept only PDF, DOC, DOCX — max 5 MB
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
