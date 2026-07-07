var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SpecialitySchema = Schema({
    nombre: { type: String, required: true, unique:true },
    doctor: { type: Schema.ObjectId, ref: 'doctor' },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('Speciality', SpecialitySchema);