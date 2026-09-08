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

// Initialize socket.io with the server
const io = socketIO(server);

// Export io for use in other modules
module.exports.io = io;

//cors
app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Origin', '*'); // Temporarily allow all origins for testing
  res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.header('Allow', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  next();
});

const options = {
  cors: {
    origin: '*', // Temporarily allow all origins for testing
  },
};

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
  // app.use('/api/clientes', require('./routes/cliente'));
  app.use('/api/paises', require('./routes/pais'));
  app.use('/api/specialities', require('./routes/speciality'));
  app.use('/api/payments', require('./routes/payment'));
  app.use('/api/recursos', require('./routes/recurso'));



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
    res.sendFile(path.resolve(__dirname, 'public')); //ruta para produccion, evita perder la ruta
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

  // Solo iniciar servidor local si no estamos en Vercel
  // if (process.env.VERCEL !== '1') {
  //     server.listen(process.env.PORT, () => {
  //         console.log('Servidor en puerto: ' + process.env.PORT);
  //     });
  // }
};

// Start the server
startServer().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});

// For traditional server (including Render.com)
const PORT = process.env.PORT || 5000;

// Only start the HTTP server if not in serverless mode (Vercel)
// On Render, we need to start the server normally (not serverless)
// On Vercel, we export the handler for serverless
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

