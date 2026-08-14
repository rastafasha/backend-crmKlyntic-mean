const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DoctorSchema = new mongoose.Schema(
  {
    // Básico landing
    nombre: { type: String, required: false, unique: false },
    apellido: { type: String, required: false},
    ciudad: { type: String, required: false },
    phone: { type: String, required: false },
    speciality: { type: Schema.Types.ObjectId, ref: "speciality" },
    email: { type: String, required: false },
    rrss: { type: String, required: false },
    dondeSeEntero: { type: String, required: false },
    address: { type: String, required: false },
    terminos: { type: String, required: false },
    img: { type: String, required: false },

    // CRM
    name: { type: String, required: false, unique: false },
    ubicacion: { type: String, required: false },
    tipoClinica: { type: String, required: false },
    hasVisited: { type: Boolean, required: false, default: false }, // Corregido 'require' a 'required'
    hasLaboratory: { type: Boolean, required: false },

    // Fechas corregidas a tipo Date para poder hacer reportes/filtros reales en el CRM
    dateVisita: { type: Date, required: false, default: Date.now },
    dateAprobado: { type: Date, required: false, default: Date.now },
    
    status: { type: Boolean, required: false, default: false },     // Corregido 'require' a 'required'
    pais: { type: Schema.Types.ObjectId, ref: "pais" },               // Corregido Schema.ObjectId

    // Propuesta enviada
    negociacion: { type: String, required: false },
    propuesta: { type: String, required: false },
    notificado: { type: Boolean, required: false, default: false }, // Corregido 'require' a 'required'
    
    //estado del doctor en el pipeline
    statusapp: { 
      type: String, 
      required: false, 
      enum: ['TEST', 'SUSCRITO', 'PENDIENTE'],
      default: 'PENDIENTE' 
    },
    // Si respondió (Seguimiento del Pipeline)
    // Cambiado a String para usarlo como estado dinámico en tu selector del CRM
    estado_seguimiento: { 
      type: String, 
      required: false, 
      enum: ['PENDIENTE', 'INTERESADO_ESPERA_DATOS', 'CORREO_ENVIADO', 'RECHAZADO'],
      default: 'PENDIENTE' 
    },
    email_contacto: { type: String, required: false },
    canal_origen: { type: String, required: false }, // 'Instagram (DM)', 'WhatsApp Directo', 'En Persona'
    correo_enviado: { type: String, required: false, default: false } // Cambiado a Boolean
  },
  {
    timestamps: true, // Te crea automáticamente createdAt y updatedAt
  }
);

module.exports = mongoose.model("Doctor", DoctorSchema);
