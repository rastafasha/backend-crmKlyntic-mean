const { response } = require('express');
const Usuario = require('../models/usuario');
const Doctor = require('../models/doctor');
const Speciality = require('../models/speciality');
const Pais = require('../models/pais');
const Cliente = require('../models/cliente');

const getTodo = async(req, res = response) => {

    // Si no viene búsqueda, usamos un string vacío en lugar de undefined
    const busqueda = req.params.busqueda || ''; 
    const typeFilter = req.query.type || null;
    const estadoFilter = req.query.estado_seguimiento || null; 
    // Si la búsqueda está vacía, hacemos que machee con todo (.*) en lugar de fallar
    const regexStr = busqueda === '' ? '.*' : busqueda;
    const regex = new RegExp(regexStr, 'i');

    // First, find categories that match the search
    const specialities = await Speciality.find({ nombre: regex });
    const specialityIds = specialities.map(cat => cat._id);

    // Find matching pais
    const matchingPaises = await Pais.find({ pais: regex });
    const paisIds = matchingPaises.map(p => p._id);

    // Then, find projects that match either name or category or pais in the list
    const doctorsFilter = {
        $or: [
            { name: regex },
            { direccion: regex },
            { speciality: { $in: specialityIds } },
            { pais: { $in: paisIds } }
        ]
    };
    
    if (typeFilter) {
        doctorsFilter.type = typeFilter;
    }

    // 2. APLICAR EL FILTRO DE ESTADO EN LA BÚSQUEDA GLOBAL DE PROYECTOS
    if (estadoFilter) {
        doctorsFilter.estado_seguimiento = estadoFilter;
    }

    const [usuarios, doctors, speciality, clientes] = await Promise.all([
        Usuario.find({ username: regex }),
        Doctor.find(doctorsFilter).populate('speciality', 'nombre'),
        Speciality.find({ nombre: regex }),
        Cliente.find({ nombre: regex }),
    ]);
    const searchPaises = Pais.find({ pais: regex });

    res.json({
        ok: true,
        usuarios,
        doctors,
        speciality,
        clientes,
        paises: await searchPaises
    });
}

const getDocumentosColeccion = async(req, res = response) => {

     const tabla = req.params.tabla;
    const busqueda = req.params.busqueda;
    const typeFilter = req.query.type || null;
    const estadoFilter = req.query.estado_seguimiento || null;
    
    // Si el parámetro es 'all', usamos una expresión regular que traiga todo
    const regexStr = busqueda === 'all' ? '.*' : busqueda;
    const regex = new RegExp(regexStr, 'i');

    let data = [];

    switch (tabla) {
        case 'usuarios':
            data = await Usuario.find({ username: regex });
            break;
        case 'specialities':
            data = await Speciality.find({ nombre: regex });5
            break;
        case 'doctors':
            const specialities = await Speciality.find({ nombre: regex });
            const speciality = specialities.map(cat => cat._id);

            const matchingPaises = await Pais.find({ pais: regex });
            const paisIds = matchingPaises.map(p => p._id);

            let doctorsFilter = {};

            // Si es una búsqueda real por texto, aplicamos el $or
            if (busqueda !== 'all') {
                doctor5sFilter.$or = [
                    { name: regex },
                    { ubicacion: regex },
                    { tipoMenu: regex },
                    { speciality: { $in: specialityIds } },
                    { pais: { $in: paisIds } }
                ];
            }

            if (typeFilter) {
                doctorsFilter.type = typeFilter;
            }
            
            // Aplicamos el filtro de estado de manera limpia
            if (estadoFilter) {
                doctorsFilter.estado_seguimiento = estadoFilter;
            }
5
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
                msg: 'la tabla debe ser usuarios/speciality/doctors/pais/clientes'
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
