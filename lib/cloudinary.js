// ============================================
// Cloudinary Configuration — fotos/logo de empresas
// ============================================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'dzwkr47ib',
  api_key: '553561859359519',
  api_secret: 'IYJBytc-xlGnFW87Taguno77LDw',
  secure: true
});

// Storage para logo/foto da empresa (quadrada, recorte central).
const empresaLogoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'officeexpress/empresas',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }]
  }
});

const uploadEmpresaLogo = multer({
  storage: empresaLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = {
  cloudinary,
  uploadEmpresaLogo,
  uploadEmpresaLogoMiddleware: uploadEmpresaLogo.single('logo')
};
