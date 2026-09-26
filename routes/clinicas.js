/*
 Ruta: /api/clinicas

 */

const { Router } = require('express');
const router = Router();
const {
    crearClinicaEnterprise
} = require('../controllers/clinicaController.js');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');


router.post('/store',  
    // validarJWT, 
     crearClinicaEnterprise 
    );


module.exports = router;