/*
 Ruta: /api/recursos
 */

const { Router } = require('express');
const router = Router();
const {
    getRecursos,
    listarPorCategoria,
    getRecurso,
    borrarRecurso,
    createRecurso,
    updateRecurso,
} = require('../controllers/recursoController.js');

const { validarJWT } = require('../middlewares/validar-jwt');


router.get('/',  getRecursos);
router.get('/category/:nombre', listarPorCategoria);

router.get('/:id',  
    validarJWT,
     getRecurso);

router.post('/store',  
    validarJWT, 
     createRecurso 
    );
router.delete('/delete/:id',  validarJWT, borrarRecurso);
router.put('/update/:id',  validarJWT, updateRecurso);


module.exports = router;