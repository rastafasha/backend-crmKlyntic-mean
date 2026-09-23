// Load environment variables FIRST - before any other requires
require('dotenv').config();
const express = require('express');
const { dbConnection } = require('./database/config');
const cors = require('cors');
const path = require('path');

// Check if we're running on a serverless platform
const isServerless = process.env.RENDER === '1' || process.env.VERCEL === '1';
const isRender = process.env.RENDER === '1';

// Only require serverless-http if not on traditional server
let serverless;
if (!isServerless || isServerless && process.env.SERVERLESS) {
  serverless = require('serverless-http');
}

//notifications
const webpush = require('web-push');
const bodyParser = require('body-parser');

//crear server de express
const app = express();
const server = require('http').Server(app);

// ==========================================
// CONFIGURACIÓN DE CORS PARA SAAS MULTI-TENANT
// ==========================================
// Define aquí tus dominios fijos o paneles administrativos estáticos

const allowedOrigins = [
  "http://localhost:4200",
  "https://localhost:4200",
  "http://localhost:4203",
  "https://localhost:4203",
  "https://vercel.app",
  "https://reservacita.vercel.app"
];

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Permitir peticiones sin origen (como Postman o llamadas internas del servidor)
    if (!origin) return callback(null, true);

    // Limpiamos la cadena quitando espacios o barras accidentales al final
    const originLimpio = origin.trim().toLowerCase();

    // 2. 🔥 FILTRO DINÁMICO INFALIBLE (Cero errores de escape de expresiones regulares)
    // Usamos 'endsWith' nativo de JavaScript para validar que la URL termine en tu dominio o en Vercel
    const esSubdominioValido = originLimpio.endsWith('.klyntic.com') || 
                               originLimpio.endsWith('.vercel.app') || 
                               originLimpio === "https://klyntic.com" || 
                               originLimpio === "http://klyntic.com";

    if (esSubdominioValido || allowedOrigins.includes(origin)) {
      // Autorizamos el acceso de inmediato
      callback(null, true);
    } else {
      console.log(`❌ [CORS RECHAZADO]: Origen bloqueado de forma explícita -> ${origin}`);
      callback(new Error('Origen no permitido por las políticas de CORS del SaaS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  credentials: true, // Obligatorio para permitir el flujo de pre-registro anónimo
  optionsSuccessStatus: 204
};

// Aplicamos la directiva única del middleware oficial
app.use(cors(corsOptions));



//lectura y parseo del body
app.use(express.json());

// Wrap everything in async function to properly await dbConnection
const startServer = async () => {
  //db
  await dbConnection();

  //directiorio publico de pruebas de google
  app.use(express.static('public'));

  //rutas
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/usuarios', require('./routes/usuarios'));
  app.use('/api/profile', require('./routes/profile'));
  app.use('/api/uploads', require('./routes/uploads'));
  app.use('/api/todo', require('./routes/busquedas'));
  app.use('/api/contactos', require('./routes/contacto'));
  app.use('/api/doctors', require('./routes/doctor'));
  app.use('/api/paises', require('./routes/pais'));
  app.use('/api/specialities', require('./routes/speciality'));
  app.use('/api/payments', require('./routes/payment'));
  app.use('/api/recursos', require('./routes/recurso'));
  app.use('/api/prospectos', require('./routes/prospecto'));
  
  // Ruta para el flujo Express
  app.use('/api/consultorios', require('./routes/consultorios'));

  //notification
  const vapidKeys = {
    "publicKey": "BOD_CraUESbh9BhUEccgqin8vbZSKHAziTtpqvUFl8B8LO9zrMnfbectiViqWIsTLglTqEx3c0XsmqQQ5A-KALg",
    "privateKey": "34CA-EpxLdIf8fmJBj2zoDg5OIQIvveBcu7zWkTkPnw"
  };

  webpush.setVapidDetails(
    'mailto:example@youremail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey,
  );

  app.use(bodyParser.json());

  //test
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to nodejs." });
  });

  //lo ultimo
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public')); 
  });

  // Global error handling middleware
  app.use((err, req, res, next) => {
    console.error('Global error handler caught an error:', err);
    res.status(500).json({
      ok: false,
      msg: 'Internal Server Error',
      error: err.message || err.toString()
    });
  });
};

// Start the server
startServer().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});

// For traditional server (including Render.com)
const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`✅ Servidor ejecutándose en puerto: ${PORT}`);
    console.log(`🌐 Entorno: ${isRender ? 'Render.com' : 'Local/Production'}`);
  });
}

// Export for serverless platforms (Vercel)
if (typeof serverless !== 'undefined' && serverless) {
  module.exports.handler = serverless(app);
}

// Export app for testing and other uses
module.exports = { app, server };
