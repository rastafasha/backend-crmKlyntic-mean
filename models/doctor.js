// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const DoctorSchema = new mongoose.Schema(
//   {
//     // Básico landing
//     nombre: { type: String, required: false, unique: false },
//     apellido: { type: String, required: false},
//     ciudad: { type: String, required: false },
//     phone: { type: String, required: false },
//     speciality: { type: Schema.Types.ObjectId, ref: "speciality" },
//     email: { type: String, required: false },
//     rrss: { type: String, required: false },
//     dondeSeEntero: { type: String, required: false },
//     address: { type: String, required: false },
//     terminos: { type: String, required: false },
//     img: { type: String, required: false },

//     // CRM
//     name: { type: String, required: false, unique: false },
//     ubicacion: { type: String, required: false },
//     tipoClinica: { type: String, required: false },
//     hasVisited: { type: Boolean, required: false, default: false }, // Corregido 'require' a 'required'
//     hasLaboratory: { type: Boolean, required: false },

//     // Fechas corregidas a tipo Date para poder hacer reportes/filtros reales en el CRM
//     dateVisita: { type: Date, required: false, default: Date.now },
//     dateAprobado: { type: Date, required: false, default: Date.now },
    
//     status: { type: Boolean, required: false, default: false },     // Corregido 'require' a 'required'
//     pais: { type: Schema.Types.ObjectId, ref: "pais" },               // Corregido Schema.ObjectId

//     // Propuesta enviada
//     negociacion: { type: String, required: false },
//     propuesta: { type: String, required: false },
//     notificado: { type: Boolean, required: false, default: false }, // Corregido 'require' a 'required'
    
//     //estado del doctor en el pipeline
//     statusapp: { 
//       type: String, 
//       required: false, 
//       enum: ['TEST', 'SUSCRITO', 'PENDIENTE'],
//       default: 'PENDIENTE' 
//     },
//     // Si respondió (Seguimiento del Pipeline)
//     // Cambiado a String para usarlo como estado dinámico en tu selector del CRM
//     estado_seguimiento: { 
//       type: String, 
//       required: false, 
//       enum: ['PENDIENTE', 'INTERESADO_ESPERA_DATOS', 'CORREO_ENVIADO', 'RECHAZADO'],
//       default: 'PENDIENTE' 
//     },
//     email_contacto: { type: String, required: false },
//     canal_origen: { type: String, required: false }, // 'Instagram (DM)', 'WhatsApp Directo', 'En Persona'
//     correo_enviado: { type: String, required: false, default: false } // Cambiado a Boolean
//   },
//   {
//     timestamps: true, // Te crea automáticamente createdAt y updatedAt
//   }
// );

// module.exports = mongoose.model("Doctor", DoctorSchema);



const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DoctorSchema = new mongoose.Schema(
  {
    // Básico landing / Registro en Frío
    nombre: { type: String, required: false },
    apellido: { type: String, required: false },
    ciudad: { type: String, required: false, default: 'Caracas' },
    phone: { type: String, required: false },
    
    // Cambiado a String para permitir guardar la especialidad a pie (ej: "Cardiología") sin obligar a crear un ID primero
    speciality: { type: Schema.Types.ObjectId, ref: "speciality" },
    
    email: { type: String, required: false, unique: true }, // unique para evitar cargar dos veces al mismo médico
    rrss: { type: String, required: false },
    dondeSeEntero: { type: String, required: false, default: 'Visita de un consultor en clínica' },
    address: { type: String, required: false },
    terminos: { type: String, required: false },
    img: { type: String, required: false },

    // CRM e Información de Calle
    name: { type: String, required: false }, // Nombre completo opcional
    ubicacion: { type: String, required: false }, // ¡AQUÍ GUARDAREMOS LA CLÍNICA! (HCC, Razetti, Briceño Rossi)
    tipoClinica: { type: String, required: false },
    hasVisited: { type: Boolean, required: false, default: true }, // true porque ya los visitaste a pie
    hasLaboratory: { type: Boolean, required: false },

    // Fechas para reportes
    dateVisita: { type: Date, required: false, default: Date.now },
    dateAprobado: { type: Date, required: false, default: Date.now },
    
    status: { type: Boolean, required: false, default: false },     
    pais: { type: Schema.Types.ObjectId, ref: "pais" },  // Simplificado para la carga rápida de la campaña

    // Propuesta enviada
    negociacion: { type: String, required: false },
    propuesta: { type: String, required: false },
    notificado: { type: Boolean, required: false, default: false }, 
    
    // Estado en el pipeline del sistema
    statusapp: { 
      type: String, 
      required: false, 
      enum: ['TEST', 'SUSCRITO', 'PENDIENTE', 'COLABORADOR'],
      default: 'PENDIENTE' 
    },
    
    // Seguimiento del Pipeline
    estado_seguimiento: { 
      type: String, 
      required: false, 
      enum: ['PENDIENTE', 'INTERESADO_ESPERA_DATOS', 'CORREO_ENVIADO', 'RECHAZADO', 'APROBADO'],
      default: 'PENDIENTE' 
    },
    email_contacto: { type: String, required: false },
    canal_origen: { type: String, required: false }, 
    
    // CORRECCIÓN CLAVE: Cambiado formalmente a Boolean para el control de Mailjet
    correo_sendit: { type: Boolean, required: false, default: false },
    correo_enviado: { type: String, required: false} 
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
    collection: 'doctors' // Nombre de tu colección en MongoDB
  }
);

module.exports = mongoose.model("Doctor", DoctorSchema);

