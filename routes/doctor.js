/*
 Ruta: /api/doctors
 */

const { Router } = require('express');
const router = Router();
const {
    getDoctors,
    getDoctorsByUser,
    createDoctor,
    getDoctor,
    deleteDoctor,
    updateDoctor,
    updateStatus,
    listarProyectPorSpeciality
} = require('../controllers/doctorController.js');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');


router.get('/',  
    validarJWT, 
    getDoctors);
router.get('/user/:id',   getDoctorsByUser);
router.get('/speciality/:nombre',   listarProyectPorSpeciality);

router.get('/:id',  
    validarJWT,
     getDoctor);

router.post('/store',  
    validarJWT, 
     createDoctor 
    );
router.delete('/delete/:id',  validarJWT, deleteDoctor);
router.put('/update/:id',  validarJWT, updateDoctor);
router.put('/updatestatus/:id',  validarJWT, updateStatus);


module.exports = router;