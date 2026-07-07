/*
 Ruta: /api/task
 */

const { Router } = require('express');
const router = Router();
const {
    createTask,
    getTask,
    getTasks,
    updateTask,
    deleteTask,
    getTasksByUser,
} = require('../controllers/taskController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/tasks',  validarJWT, getTasks);
router.get('/tasks/user/:id',  validarJWT, getTasksByUser);
router.get('/task/:id',  validarJWT, getTask);
router.post('/tasks/store',  
    validarJWT, 
    // validateSchema(createTaskSchema),
     createTask 
    );
router.delete('/tasks/delete/:id',  validarJWT, deleteTask );
router.put('/tasks/update/:id',  validarJWT, updateTask);


module.exports = router;