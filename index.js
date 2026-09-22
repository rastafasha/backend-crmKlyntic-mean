// Load environment variables FIRST - before any other requires
require('dotenv').config();
const express = require('express');
const { dbConnection } = require('./database/config');
const cors = require('cors');
const path = require('path');
const socketIO = require('socket.io');

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
  "http://localhost:4203",
  "https://reservacita.vercel.app", //app reserva express
];

const corsOptions = {
  origin: (origin, callback) => {
    // 1. Permitir peticiones sin origen (como Postman o peticiones entre tus servidores)
    if (!origin) return callback(null, true);

    // 2. FILTRO DINÁMICO MULTI-TENANT: 
    // Acepta cualquier subdominio tuyo (*.klyntic.com) AND acepta cualquier subdominio de pruebas de Vercel (*.vercel.app)
    // Esto repara instantáneamente el bloqueo mientras estás probando tus despliegues
    const esSubdominioValido = /\.klyntic\.com\$/.test(origin) || 
                               /\.vercel\.app\$/.test(origin) || 
                               origin === "https://klyntic.com" || 
                               origin === "http://klyntic.com";

    if (esSubdominioValido || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS RECHAZADO]: Origen denegado -> ${origin}`);
      callback(new Error('Origen no permitido por las políticas de CORS del SaaS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  credentials: true,
  optionsSuccessStatus: 204
};

// Aplicar CORS a la REST API y configurar cabeceras adicionales si es necesario
app.use(cors(corsOptions));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  next();
});

// Inicializamos el Socket.io con las opciones de CORS dinámicas ya configuradas
const io = socketIO(server, {
  cors: corsOptions
});

// 🔥 CORRECCIÓN CRÍTICA: Exportamos el 'io' justo AQUÍ, después de haber sido creado legítimamente
module.exports.io = io;

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
module.exports = { app, server, io };
