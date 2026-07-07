'use strict'
const { Schema, model } = require('mongoose');

var ContactoSchema = Schema({
    mensaje: { type: String, required: true },
    nombres: { type: String, required: true },
    tema: { type: String, required: true },
    correo: { type: String, required: true },
    telefono: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, required: true },
}, { collection: 'contactos' });

module.exports = model('Contacto', ContactoSchema);