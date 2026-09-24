var mongoose = require('mongoose');

const recursoSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: true,
    trim: true // Elimina espacios en blanco accidentales al inicio/final
  },
  descripcion: { 
    type: String,
    trim: true 
  },
  tipo: { 
    type: String, 
    enum: ['video', 'banner'], 
    required: true 
  },
  urlMedia: { 
    type: String, 
    required: false 
  }, 
  // 🔥 NUEVO: Identificador único de Cloudinary indispensable para poder ELIMINAR/REEMPLAZAR el archivo
  cloudinary_id: { 
    type: String,
    default: null
  },
  categoria: { 
    type: String, 
    enum: ['general', 'odontologia', 'asistentes', 'whatsapp'] 
  },
  // 🔥 NUEVO: Metadata útil para pintar en las tarjetas de la Landing Page
  bytes: {
    type: Number,
    default: 0
  },
  activo: { 
    type: Boolean, 
    default: true 
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  }
}, {
  // Opcional: añade automáticamente createdAt y updatedAt administrados por Mongo
  timestamps: true 
});

// Guardamos el modelo en SINGULAR ('Recurso'). Mongo creará la colección 'recursos' automáticamente.
module.exports = mongoose.model('Recurso', recursoSchema);
