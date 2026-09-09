const { Router } = require('express');
const { 
  obtenerDoctoresCRM, 
  enviarCorreoIndividual, 
  enviarCampañaMasivaDoctores 
} = require('../controllers/prospectoController'); // Asegúrate de que el path sea el correcto

const router = Router();


// 2. Ruta para listar médicos con filtros para tus tablas o selects (GET: /api/prospectos)
router.get('/', obtenerDoctoresCRM);

// 3. Ruta para enviar el correo individual por ID desde el body (POST: /api/prospectos/enviar-correo)
router.post('/enviar-correo', enviarCorreoIndividual);

// 4. Ruta para disparar el lote diario controlado de 200 correos para Mailjet (POST: /api/prospectos/enviar-masivo)
router.post('/enviar-masivo', enviarCampañaMasivaDoctores);

module.exports = router;
