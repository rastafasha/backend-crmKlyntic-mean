/*
 Ruta: /api/consultorios
 */

const { Router } = require('express');
const router = Router();
const {
    getConsultorios,
    getConsultorio,
    crearConsultorioExpress,
    findBySlug,
    actualizarConsultorio
} = require('../controllers/consultorioController.js');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');


router.get('/',  validarJWT, getConsultorios); 
router.get('/:id', getConsultorio);
router.get('/by-slug/:slug', findBySlug);


router.post('/store',  
    validarJWT, 
     crearConsultorioExpress 
    );
router.put('/update/:id',  validarJWT, actualizarConsultorio);


module.exports = router;