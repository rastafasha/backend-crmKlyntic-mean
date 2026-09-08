var mongoose = require('mongoose');

const recursoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String },
  tipo: { type: String, enum: ['video', 'banner'], required: true },
  urlMedia: { type: String, required: true }, // Aquí va el enlace de Screenpal, Vimeo o tu AWS S3 para los banners
  categoria: { type: String, enum: ['general', 'odontologia', 'asistentes', 'whatsapp'] },
  activo: { type: Boolean, default: true },
  fechaCreacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('recursos', recursoSchema);