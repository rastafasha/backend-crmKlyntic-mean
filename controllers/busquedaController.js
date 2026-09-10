const { response } = require('express');
const Usuario = require('../models/usuario');
const Doctor = require('../models/doctor');
const Speciality = require('../models/speciality');
const Pais = require('../models/pais');
const Cliente = require('../models/cliente');
const Recurso = require('../models/recurso');

const getTodo = async(req, res = response) => {
    const busqueda = req.params.busqueda || ''; 
    const typeFilter = req.query.tipoClinica || null;
    const estadoFilter = req.query.estado_seguimiento || null; 
    const regexStr = busqueda === '' ? '.*' : busqueda;
    const regex = new RegExp(regexStr, 'i');

    const specialities = await Speciality.find({ nombre: regex });
    const specialityIds = specialities.map(cat => cat._id);

    const matchingPaises = await Pais.find({ pais: regex });
    const paisIds = matchingPaises.map(p => p._id);

    const doctorsFilter = {
        $or: [
            { name: regex },
            { ubicacion: regex },
            { speciality: { $in: specialityIds } },
            { pais: { $in: paisIds } }
        ]
    };
    
    if (typeFilter) {
        doctorsFilter.tipoClinica = typeFilter;
    }

    if (estadoFilter) {
        doctorsFilter.estado_seguimiento = estadoFilter;
    }

    const [usuarios, doctors, speciality, clientes, recursos] = await Promise.all([
        Usuario.find({ username: regex }),
        Doctor.find(doctorsFilter).populate('speciality', 'nombre'),
        Speciality.find({ nombre: regex }),
        Cliente.find({ nombre: regex }),
        Recurso.find({ titulo: regex }),
    ]);
    const searchPaises = Pais.find({ pais: regex });

    res.json({
        ok: true,
        usuarios,
        doctors,
        speciality,
        clientes,
        recursos,
        paises: await searchPaises
    });
}

const getDocumentosColeccion = async(req, res = response) => {
    const tabla = req.params.tabla;
    const busqueda = req.params.busqueda;
    const typeFilter = req.query.tipoClinica || null;
    const estadoFilter = req.query.estado_seguimiento || null;
    
    const regexStr = busqueda === 'all' ? '.*' : busqueda;
    const regex = new RegExp(regexStr, 'i');

    let data = [];

    switch (tabla) {
        case 'usuarios':
            data = await Usuario.find({ username: regex });
            break;
        case 'specialities':
            data = await Speciality.find({ nombre: regex });
            break; // CORREGIDO: Añadido break y quitado el "5"
        case 'recursos':
            data = await Recurso.find({ titulo: regex });
            break; // CORREGIDO: Quitado el "5"
        case 'doctors':
            const specialities = await Speciality.find({ nombre: regex });
            const specialityIds = specialities.map(cat => cat._id); // CORREGIDO: se llamaba 'speciality' abajo pero aquí faltaba 'Ids'

            const matchingPaises = await Pais.find({ pais: regex });
            const paisIds = matchingPaises.map(p => p._id);

            let doctorsFilter = {};

            if (busqueda !== 'all') {
                doctorsFilter.$or = [ // CORREGIDO: Se quitó el "5" de doctor5sFilter
                    { name: regex },
                    { ubicacion: regex },
                    { tipoMenu: regex },
                    { speciality: { $in: specialityIds } },
                    { pais: { $in: paisIds } }
                ];
            }

            if (typeFilter) {
                doctorsFilter.tipoClinica = typeFilter;
            }
            
            if (estadoFilter) {
                doctorsFilter.estado_seguimiento = estadoFilter;
            }

            data = await Doctor.find(doctorsFilter).populate('speciality', 'nombre');
            break;
        case 'pais':
            data = await Pais.find({ pais: regex });
            break;
        case 'clientes':
            data = await Cliente.find({ cliente: regex });
            break;
        default:
            return res.status(400).json({
                ok: false,
                msg: 'la tabla debe ser usuarios/specialities/doctors/pais/clientes'
            });
    }

    res.json({
        ok: true,
        resultados: data
    });
}

module.exports = {
    getTodo,
    getDocumentosColeccion
}
