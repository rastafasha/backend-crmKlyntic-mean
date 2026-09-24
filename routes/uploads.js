/*
Ruta: /api/uploads/
*/

const { Router } = require('express');
const expressfileUpload = require('express-fileupload');

const { validarJWT } = require('../middlewares/validar-jwt');
const router = Router();
const { fileUpload, retornaImagen, videoUpload } = require('../controllers/uploadController');


router.use(expressfileUpload());

router.get('/:tipo/:foto', retornaImagen);
router.put('/:tipo/:id', validarJWT, fileUpload);
// 🔥 NUEVA RUTA DE VIDEOS: Espera recibir un campo llamado "video" en el FormData
router.put('/video/:tipo/:id', videoUpload);

module.exports = router;