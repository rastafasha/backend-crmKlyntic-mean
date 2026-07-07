var mongoose = require("mongoose");
var Schema = mongoose.Schema;

const paymentSchema = new mongoose.Schema(
  {
    cliente: { type: Schema.ObjectId, ref: "cliente", required: true },
    amount: { type: Number, required: true }, // Cambiado a Number para cálculos
    tipo_pago: { 
      type: String, 
      enum: ["inscripcion", "suscripcion"], // Para evitar errores de dedo
      required: true 
    },
    referencia: { type: String, required: true, unique: true }, // Unique evita pagos duplicados
    bank_destino: { type: String, required: true }, 
    status: { type: Boolean, default: false },
    
    // Para el control de las partes (33.3%)
    reparticion: {
      vendedor: { id: { type: Schema.ObjectId, ref: "usuario" }, monto: Number },
      admin: { id: { type: Schema.ObjectId, ref: "usuario" }, monto: Number },
      ceo: { id: { type: Schema.ObjectId, ref: "usuario" }, monto: Number }
    },

    metodo_pago: { type: String }, // Ej: "Zelle", "Efectivo", "Transferencia"
    fecha_verificacion: { type: Date } 
  },
  { timestamps: true } // Esto crea automáticamente createdAt y updatedAt
);

module.exports = mongoose.model("payment", paymentSchema);
