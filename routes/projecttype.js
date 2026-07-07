/*
 Ruta: /api/categorias
 */

const { Router } = require('express');
const router = Router();
const {
    createProjectType,
    getProjectType,
    getProjectTypes,
    updateProjectType,
    deleteProjectType,
} = require('../controllers/projectTypeController.js');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');


router.get('/',  validarJWT, getProjectTypes);
router.get('/:id',  validarJWT, getProjectType);
router.post('/store',  
    validarJWT, 
     createProjectType 
    );
router.delete('/delete/:id',  validarJWT, deleteProjectType);
router.put('/update/:id',  validarJWT, updateProjectType);


module.exports = router;