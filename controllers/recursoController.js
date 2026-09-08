const { response } = require('express');
const Recurso = require('../models/recurso');
const mongoose = require('mongoose');

const getRecursos = async (req, res) => {

    try {
        const recursos = await Recurso.find()
            .sort({ createdAt: -1 })
        //traemos las tareas en orden de ultima fecha
        recursos.sort((a, b) => b.createdAt - a.createdAt);


        res.json({
            ok: true,
            recursos
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener recursos' });
    }
};


const getRecurso = async (req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    Recurso.findById(id)
        .populate('category')
        .exec((err, recurso) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar recurso',
                    errors: err
                });
            }
            if (!recurso) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El recurso con el id ' + id + 'no existe',
                    errors: { message: 'No existe un recurso con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                recurso: recurso
            });
        });
};

const createRecurso = async (req, res) => {
    const uid = req.uid;
    const recurso = new Recurso({
        usuario: uid,
        ...req.body
    });

    try {

        const recursoDB = await recurso.save();

        res.json({
            ok: true,
            recurso: recursoDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }
};

const updateRecurso = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        const recurso = await Recurso.findById(id);
        if (!recurso) {
            return res.status(404).json({ // Cambiado a 404 (Not Found)
                ok: false,
                msg: 'recurso no encontrado por el id'
            });
        }

        const cambiosRecurso = {
            ...req.body,
            usuario: uid
        }

        const recursoActualizado = await Recurso.findByIdAndUpdate(id, cambiosRecurso, { new: true });

        res.json({
            ok: true,
            recursoActualizado
        });

    } catch (error) {
        console.log(error); // Es buena práctica imprimir el error en consola para debugging
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const borrarRecurso = async (req, res) => {

    const uid = req.params.id;

    try {

        const recursoDB = await Recurso.findById(uid);
        if (!recursoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe el recurso por ese id'
            });
        }

        await Recurso.findByIdAndDelete(uid);

        res.json({
            ok: true,
            msg: 'recurso eliminado'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

const listarPorCategoria = async (req, res) => {
    var name = req.params['nombre'];
    // 1. CAPTURAR EL NUEVO FILTRO DE ESTADO DESDE LA QUERY URL
    const estadoFilter = req.query.estado_seguimiento || null;

    try {
        // First, find the category by name
        const Categoria = require('../models/categoria');
        const categoria = await Categoria.findOne({ name: name });

        if (!categoria) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        // 2. CONSTRUIR EL FILTRO DE BÚSQUEDA DINÁMICO
        let portafoliosFilter = { category: categoria._id };

        // Si el usuario envió un estado, lo agregamos al filtro de la consulta
        if (estadoFilter) {
            portafoliosFilter.estado_seguimiento = estadoFilter;
        }

        // Then, find portafolios using the category's ObjectId and the filters
        const portafolios = await Portafolio.find(portafoliosFilter)
            .populate('category');

        res.status(200).send({ portafolios: portafolios });
    } catch (err) {
        res.status(500).send({ error: err });
    }
}



module.exports = {
    getRecursos,
    listarPorCategoria,
    getRecurso,
    borrarRecurso,
    createRecurso,
    updateRecurso,
};