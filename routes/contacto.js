/*
 Ruta: /api/contacto
 */

const { Router } = require('express');
const router = Router();
const {
    getContactos,
    crearContacto,
    borrarContacto,
    getContacto,
    envioCorreo
} = require('../controllers/contactoController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getContactos);

router.post('/crear', [
    check('name', 'El nombre es necesario').not().isEmpty(),
    validarCampos
], envioCorreo);


router.delete('/:id', validarJWT, borrarContacto);

router.get('/:id', validarJWT, getContacto);


module.exports = router;