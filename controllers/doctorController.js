const { response } = require('express');
const Doctor = require('../models/doctor');
const Speciality = require('../models/speciality');

const getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find()
            .sort({ createdAt: -1 })
            .populate('pais')
            // .populate('speciality')
        // .populate('DoctorType');
        //traemos las tareas en orden de ultima fecha
        doctors.sort((a, b) => b.createdAt - a.createdAt);

        res.json({
            ok: true,
            doctors
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener doctores' });
    }
};

const getDoctorsByUser = async (req, res) => {
    const uid = req.uid;
    try {
        const doctors = await Doctor.find({
            partners: req.params.id
        })
        .populate('speciality')
        .populate('pais');
        res.json({
            ok: true,
            doctors
        });
    } catch (error) {
        return res.status(404).json({ message: 'No doctores found' });
    }
};

const createDoctor = async (req, res) => {
     const uid = req.uid;
        const doctor = new Doctor({
            usuario: uid,
            ...req.body
        });
    
        try {
    
            const doctorDB = await doctor.save();
    
            res.json({
                ok: true,
                doctor: doctorDB
            });
    
        } catch (error) {
            res.status(500).json({
                ok: false,
                msg: 'Hable con el admin'
            });
        }
};


const getDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id)
        .populate('speciality')
        .populate('pais')

        if (!doctor) return res.status(404).json({ msg: 'doctor not found' })
        res.json({
            ok: true,
            doctor
        });

    } catch (error) {
        return res.status(404).json({ msg: 'Doctor not found' })
    }
};

const deleteDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(req.params.id)
        if (!doctor) return res.status(404).json({ msg: 'doctor not found' })
        return res.sendStatus(204);
    } catch (error) {
        return res.status(404).json({ msg: 'doctor not found' })
    }
};

const updateDoctor = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        const doctor = await Doctor.findById(id);
        if (!doctor) {
            return res.status(404).json({ // Cambiado a 404 (Not Found)
                ok: false,
                msg: 'doctor no encontrado por el id'
            });
        }

        const cambiosDoctor = {
            ...req.body,
            usuario: uid
        }

        const doctorActualizado = await Doctor.findByIdAndUpdate(id, cambiosDoctor, { new: true });

        res.json({
            ok: true,
            doctorActualizado
        });

    } catch (error) {
        console.log(error); // Es buena práctica imprimir el error en consola para debugging
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};


function updateStatus(req, res) {
    var id = req.params['id'];
    // console.log(id);
    Doctor.findByIdAndUpdate({ _id: id }, { status: true }, (err, doctor_data) => {
        if (err) {
            res.status(500).send({ message: err });
        } else {
            if (doctor_data) {
                res.status(200).send({ doctor: doctor_data });
            } else {
                res.status(403).send({ message: 'No se actualizó el doctor, vuelva a intentar nuevamente.' });
            }
        }
    })
}

const listarProyectPorSpeciality = async (req, res) => {
    var nombre = req.params['nombre'];
    // 1. CAPTURAR EL NUEVO FILTRO DE ESTADO DESDE LA QUERY URL
    const estadoFilter = req.query.estado_seguimiento || null;

    try {
        // First, find the category by name
        const Speciality = require('../models/speciality');
        const speciality = await Speciality.findOne({ nombre: nombre });
        
        if (!speciality) {
            return res.status(404).json({ message: 'Speciality no encontrada' });
        }
        
        // 2. CONSTRUIR EL FILTRO DE BÚSQUEDA DINÁMICO
        let doctorsFilter = { category: speciality._id };

        // Si el usuario envió un estado, lo agregamos al filtro de la consulta
        if (estadoFilter) {
            doctorsFilter.estado_seguimiento = estadoFilter;
        }
        
        // Then, find projects using the category's ObjectId and the filters
        const doctors = await Doctor.find(doctorsFilter)
            .populate('speciality')
            .populate('pais');
        
        res.status(200).send({ doctors: doctors });
    } catch (err) {
        res.status(500).send({ error: err });
    }
}



module.exports = {
    getDoctors,
    getDoctorsByUser,
    createDoctor,
    getDoctor,
    deleteDoctor,
    updateDoctor,
    updateStatus,
    listarProyectPorSpeciality


};