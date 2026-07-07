/*
 Ruta: /api/payments
 */

const { Router } = require('express');
const router = Router();
const {
    createPayment,
    getPayment,
    getPayments,
    updatePayment,
    deletePayment,
    getPaymentsByUser,
    updateStatus,
    getMonthlyReport
} = require('../controllers/paymentController.js');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/',  validarJWT, getPayments);
router.get('/monthlyreport',  validarJWT, getMonthlyReport);

router.get('/:id',  validarJWT, getPayment);
router.get('/user/:id', validarJWT, getPaymentsByUser);


router.post('/store', [
    validarJWT,
    check('amount', 'El monto es obligatorio y debe ser número').isNumeric(),
    check('cliente', 'El ID del cliente es necesario').isMongoId(),
    check('referencia', 'La referencia es obligatoria').not().isEmpty(),
    validarCampos
], createPayment);

router.delete('/delete/:id',  validarJWT, deletePayment);
router.put('/update/:id',  validarJWT, updatePayment);
router.put('/updatestatus/:id',  validarJWT, updateStatus);


module.exports = router;