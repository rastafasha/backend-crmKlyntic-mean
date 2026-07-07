/*
 Ruta: /api/clientes
 */

const { Router } = require('express');
const router = Router();
const {
    createCliente,
    getCliente,
    getClientes,
    updateCliente,
    deleteCliente,
    getClientesByUser,
    updateStatus,
    listarClientePorCategoria
} = require('../controllers/clienteController.js');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');


router.get('/',  validarJWT, getClientes); 
router.get('/user/:id', getClientesByUser);
router.get('/category/:nombre', listarClientePorCategoria);

router.get('/:id',  
    validarJWT,
     getCliente);

router.post('/store',  
    validarJWT, 
     createCliente 
    );
router.delete('/delete/:id',  validarJWT, deleteCliente);
router.put('/update/:id',  validarJWT, updateCliente);
router.put('/updatestatus/:id',  validarJWT, updateStatus);


module.exports = router;