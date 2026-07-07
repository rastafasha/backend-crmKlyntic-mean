/*
 Ruta: /api/specialities
 */

const { Router } = require('express');
const router = Router();
const {
    getSpecialities,
crearSpeciality,
actualizarSpeciality,
borrarSpeciality,
getSpeciality,
find_by_name,
checkExistenceByName
} = require('../controllers/specialityController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getSpecialities);
router.get('/:id', getSpeciality);
router.get('/existencia/:nombre', checkExistenceByName);

router.post('/crear', [
    validarJWT,
    check('nombre', 'El nombre del speciality es necesario').not().isEmpty(),
    validarCampos
], crearSpeciality);

router.put('/editar/:id', [
    validarJWT,
    check('nombre', 'El nombre del speciality es necesario').not().isEmpty(),
    validarCampos
], actualizarSpeciality);

router.delete('/borrar/:id', validarJWT, borrarSpeciality);


router.get('/speciality_by_nombre/:nombre', find_by_name);


module.exports = router;