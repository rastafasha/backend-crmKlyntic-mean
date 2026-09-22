const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConsultorioSchema = Schema({
    name: { type: String, required: true },// name user
    nombre: { type: String, required: false },
    apellido: { type: String, required: false },
    // El slug/subdominio que se genera al pasar a modo Express
    slug: { type: String, required: true, unique: true },
    pais: { type: Schema.Types.ObjectId, ref: "pais" },
    rrss: { type: String, required: false },
    speciality: { type: Schema.Types.ObjectId, ref: "speciality" },
    dateTest: {
        type: String,
        required: false,
        default: Date.now,
    },
    dateInicio: {
        type: String,
        required: false,
        default: Date.now,
    },
    tipoClinica: { type: String, required: false },

    // 🌍 CONTROL DE MONEDA PARA CITAS (Ej: 'USD', 'VES', 'COP', etc.)
    moneda: { type: String, required: true, default: 'USD' },


    // 💳 MÉTODOS DE PAGO ADMITIDOS PARA LA RESERVA DE LA CITA
    acepta_usd_internacional: { type: Boolean, default: false, required: true }, // Zelle / PayPal
    acepta_moneda_local: { type: Boolean, default: true, required: true },      // Pago Móvil / Transferencia

    //datos para la reserva
    usavacunas: { type: Boolean, default: false, required: true },

    // Definimos sub-esquemas limpios de arrays de objetos estructurados
    vacunasList: [{
        descripcion: { type: String, required: true },
        precio: { type: String, default: 'N/A' }
    }],
    Servicios_procedimientosList: [{
        descripcion: { type: String, required: true },
        precio: { type: String, default: 'N/A' }
    }],
    ConsultasyTarifasList: [{
        descripcion: { type: String, required: true },
        precio: { type: String, default: 'N/A' }
    }],

    HorariodeAtencion: { type: String, required: false },

    // Datos de ubicación de la clínica o consultorio
    ciudad: { type: String, required: false },
    address: { type: String, required: false },
    phone: { type: String, required: false },
    img_logo: { type: String, required: false }, // Logo del consultorio


    // 📊 CONTROL DEL ESTADO EXPRESS (Viene desde tu CRM)
    status: { type: String, required: false, default: 'Desactivado', enum: ['Activo', 'Desactivado'] },
    statusapp: {
        type: String,
        required: false,
        enum: ['TEST', 'SUSCRITO', 'PENDIENTE', 'COLABORADOR'],
        default: 'PENDIENTE'
    },
    // Relación con el usuario dueño del consultorio/médico
    user_id: { type: String, required: true }, // ID del médico en la BD central o CRM

    // 💳 ESQUEMA DE SUSCRIPCIÓN PARA MODO EXPRESS
    planSuscripcion: {
        type: String,
        enum: ['GRATIS', 'BASICO', 'PRO'],
        default: 'GRATIS'
    },
    fechaVencimiento: { type: Date, required: false },
    idSuscripcionPago: { type: String, required: false },

    // 💬 CONFIGURACIÓN DE NOTIFICACIONES WHATSAPP (Se mantiene tu excelente lógica)
    whatsappStatus: {
        type: String,
        enum: ['CONECTADO', 'DESCONECTADO', 'ESPERANDO_QR'],
        default: 'DESCONECTADO'
    },
    whatsappQR: { type: String, default: '' },
    whatsappConnectedAt: { type: Date },

    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('consultorio', ConsultorioSchema);
