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

// Storage para foto de perfil do usuário/cliente (quadrada, recorte central).
const usuarioFotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'officeexpress/usuarios',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }]
  }
});

const uploadUsuarioFoto = multer({
  storage: usuarioFotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Storage para banner de vaga (horizontal, qualidade auto).
const vagaBannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'officeexpress/vagas',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto' }]
  }
});

const uploadVagaBanner = multer({
  storage: vagaBannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = {
  cloudinary,
  uploadEmpresaLogo,
  uploadEmpresaLogoMiddleware: uploadEmpresaLogo.single('logo'),
  uploadUsuarioFotoMiddleware: uploadUsuarioFoto.single('foto'),
  uploadVagaBannerMiddleware: uploadVagaBanner.single('banner')
};
