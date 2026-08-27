const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const THUMBS_DIR = path.join(UPLOAD_DIR, 'thumbs');

// Ordner erstellen
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(THUMBS_DIR, { recursive: true });

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 }, // 40MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Nicht erlaubter Dateityp. Erlaubt: JPG, PNG, WebP'));
    }
    cb(null, true);
  }
});

// Bild verarbeiten
async function processImage(filePath, options = {}) {
  const { width = 1200, height = 800, quality = 85 } = options;

  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const processedPath = path.join(UPLOAD_DIR, `${baseName}_processed.jpg`);
  const thumbPath = path.join(THUMBS_DIR, `${baseName}_thumb.jpg`);

  // Hauptbild: Resize + Optimize
  await sharp(filePath)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .jpeg({ quality })
    .toFile(processedPath);

  // Thumbnail
  await sharp(filePath)
    .resize(300, 200, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  return {
    original: filePath,
    processed: processedPath,
    thumbnail: thumbPath,
    url: `/uploads/${path.basename(processedPath)}`,
    thumbUrl: `/uploads/thumbs/${path.basename(thumbPath)}`
  };
}

module.exports = { upload, processImage, UPLOAD_DIR, THUMBS_DIR };
