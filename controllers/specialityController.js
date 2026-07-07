const { response } = require('express');
const Speciality = require('../models/speciality');

const getSpecialities = async(req, res) => {

    const specialities = await Speciality.find()
    res.json({
        ok: true,
        specialities
    });
};


const getSpeciality = async(req, res) => {

    const id = req.params.id;


    Speciality.findById(id, {})
        .exec((err, speciality) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar speciality',
                    errors: err
                });
            }
            if (!speciality) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'La speciality con el id ' + id + 'no existe',
                    errors: { message: 'No existe una speciality con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                speciality: speciality
            });
        });


    
};

const crearSpeciality = async(req, res) => {

    const uid = req.uid;
    const speciality = new Speciality({
        usuario: uid,
        ...req.body
    });

    try {

        const specialityDB = await speciality.save();

        res.json({
            ok: true,
            speciality: specialityDB
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarSpeciality = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const speciality = await Speciality.findById(id);
        if (!speciality) {
            return res.status(500).json({
                ok: false,
                msg: 'Speciality no encontrado por el id'
            });
        }

        const cambiosSpeciality = {
            ...req.body,
            usuario: uid
        }

        const specialityActualizado = await Speciality.findByIdAndUpdate(id, cambiosSpeciality, { new: true });

        res.json({
            ok: true,
            specialityActualizado
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }


};

const borrarSpeciality = async(req, res) => {

    const id = req.params.id;

    try {

        const speciality = await Speciality.findById(id);
        if (!speciality) {
            return res.status(500).json({
                ok: false,
                msg: 'speciality no encontrado por el id'
            });
        }

        await Speciality.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'Speciality eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};



function find_by_name(req, res) {
    var nombre = req.params['nombre'];

    Speciality.findOne({ nombre: nombre })
        .exec((err, speciality_data) => {
            if (err) {
                res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
            } else {
                if (speciality_data) {
                    res.status(200).send({ speciality: speciality_data });
                } else {
                    res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
                }
            }
        });
}


const checkExistenceByName = async(req, res) => {
    const { nombre } = req.params;

    try {
        const speciality = await Speciality.findOne({ nombre: nombre });

        if (speciality) {
            return res.json({
                ok: true,
                exists: true,
                message: 'Speciality with this name already exists.'
            });
        } else {
            return res.json({
                ok: true,
                exists: false,
                message: 'No speciality found with this name.'
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            message: 'Server error while checking speciality existence.'
        });
    }
}

module.exports = {
    getSpecialities,
    crearSpeciality,
    actualizarSpeciality,
    borrarSpeciality,
    getSpeciality,
    find_by_name,
    checkExistenceByName
};