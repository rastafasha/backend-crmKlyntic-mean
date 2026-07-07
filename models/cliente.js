var mongoose = require("mongoose");
var Schema = mongoose.Schema;

const clienteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    rrss: {
      type: String,
      required: true,
    },
    ubicacion: {
      type: String,
      required: true,
    },
    partners: {
      type: Array,
      required: false,
    },
    status: { type: Boolean, require: false, default: false },
    category: { type: Schema.ObjectId, ref: "categoria" },
    pais: { type: Schema.ObjectId, ref: "pais" },
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
    
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("cliente", clienteSchema);
