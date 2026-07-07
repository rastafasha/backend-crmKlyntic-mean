const { response } = require('express');
const Cliente = require('../models/cliente');
const Project = require('../models/project');


const getClientes = async (req, res) => {
    try {
        const clientes = await Project.find({status:true})
            .sort({ createdAt: -1 })
            .populate('category')
            .populate('pais')
        // .populate('ProjectType');
        //traemos las tareas en orden de ultima fecha
        clientes.sort((a, b) => b.createdAt - a.createdAt);


        res.json({
            ok: true,
            clientes
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener clientes' });
    }
};
const getClientesByUser = async (req, res) => {
    const uid = req.uid;
    try {
        const clientes = await Cliente.find({
            partners: req.params.id
        })
        .populate('category')
        .populate('pais');
        res.json({
            ok: true,
            clientes
        });
    } catch (error) {
        return res.status(404).json({ message: 'No clientes found' });
    }
};
const createCliente = async (req, res) => {
    
    const uid = req.uid;
    const cliente = new Cliente({
        usuario: uid,
        ...req.body
    });

    try {

        const clientetDB = await cliente.save();

        res.json({
            ok: true,
            cliente: clientetDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};
const getCliente = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id)
        .populate('category')
        .populate('pais')

        if (!cliente) return res.status(404).json({ msg: 'cliente not found' })
        res.json({
            ok: true,
            cliente
        });

    } catch (error) {
        return res.status(404).json({ msg: 'cliente not found' })
    }
};
const deleteCliente = async (req, res) => {
    try {
        const cliente = await Cliente.findByIdAndDelete(req.params.id)
        if (!cliente) return res.status(404).json({ msg: 'cliente not found' })
        return res.sendStatus(204);
    } catch (error) {
        return res.status(404).json({ msg: 'cliente not found' })
    }
};
const updateCliente = async (req, res) => {
    try {
        const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true })
        if (!cliente) return res.status(404).json({ msg: 'Cliente not found' })
        res.json({
            ok: true,
            cliente
        });
    } catch (error) {
        return res.status(404).json({ msg: 'cliente not found' })
    }
};

function updateStatus(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Cliente.findByIdAndUpdate({ _id: id }, { status: true }, (err, cliente_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (cliente_data) {
                res.status(200).send({ cliente: cliente_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el cliente, vuelva a intentar nuevamente.' });
            }
        }
    })
}

const listarClientePorCategoria = async (req, res) => {
    var nombre = req.params['nombre'];
    try {
        // First, find the category by name
        const Categoria = require('../models/categoria');
        const categoria = await Categoria.findOne({ nombre: nombre });
        
        if (!categoria) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        
        // Then, find clientes using the category's ObjectId
        const clientes = await Cliente.find({ category: categoria._id })
            .populate('category')
            .populate('pais');
        
        res.status(200).send({ clientes: clientes });
    } catch (err) {
        res.status(500).send({ error: err });
    }
}


module.exports = {
    createCliente,
    getCliente,
    getClientes,
    updateCliente,
    deleteCliente,
    getClientesByUser,
    updateStatus,
    listarClientePorCategoria


};