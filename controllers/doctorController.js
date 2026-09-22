const { response } = require('express');
const Doctor = require('../models/doctor');
const Speciality = require('../models/speciality');
const Consultorio = require('../models/consultorio'); // Importamos el nuevo modelo de SaaS [12]


const getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find()
            .sort({ createdAt: -1 })
            .populate('pais')
            .populate('speciality');
        //traemos las tareas en orden de ultima fecha
        doctors.sort((a, b) => b.createdAt - a.createdAt);

        res.json({
            ok: true,
            doctors
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error al obtener doctores' });
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
            console.log(error);
            res.status(500).json({
                ok: false,
                msg: 'Hable con el admin'
            });
        }
};

const updateDoctor = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid; // ID del operador/admin del CRM [10]

    try {
        const doctorDB = await Doctor.findById(id);
        if (!doctorDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Médico prospecto no encontrado por el id.'
            });
        }

        const dataModificada = req.body;
        const cambiosDoctor = {
            ...dataModificada,
            usuario: uid
        };

        // 1. Guardar la actualización del prospecto en la colección 'doctors' [10]
        const doctorActualizado = await Doctor.findByIdAndUpdate(id, cambiosDoctor, { new: true });

        // 🔥 DETECTOR DE CONVERSIÓN EXPRESS:
        // Si el estado de seguimiento pasa a APROBADO y ese doctor AÚN no tiene un consultorio SaaS creado...
        if (dataModificada.estado_seguimiento === 'APROBADO') {
            const existeConsultorio = await Consultorio.findOne({ user_id: doctorActualizado._id });

            if (!existeConsultorio) {
                console.log(`🚀 ¡Conversión detectada! Creando Consultorio Express para la Dra/Dr: ${doctorActualizado.name}`);

                // Generación limpia del slug usando el nombre y apellido del prospecto
                const nombreCompleto = `${doctorActualizado.nombre || ''} ${doctorActualizado.apellido || ''}`.trim();
                const nombreSlugBase = nombreCompleto || 'consultorio-medico';
                
                let slug = nombreSlugBase.toLowerCase().trim()
                    .replace(/[\s]+/g, '-')
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-')
                    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')
                    .replace(/ñ/g, 'n').replace(/ü/g, 'u');

                // Asegurar que el subdominio no colisione con otro existente en MongoDB
                const existeSlug = await Consultorio.findOne({ slug });
                if (existeSlug) {
                    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`; // Le añade un sufijo numérico aleatorio
                }

                // Creamos el Consultorio SaaS en caliente heredando los datos recabados en calle por el consultor
                const nuevoConsultorio = new Consultorio({
                    name: `${doctorActualizado.name}`,
                    slug: slug,
                    moneda: 'USD', // Moneda por defecto
                    acepta_usd_internacional: false,
                    acepta_moneda_local: true,
                    statusapp: doctorActualizado.statusapp || 'PENDIENTE',
                    ciudad: doctorActualizado.ciudad || 'Caracas',
                    address: doctorActualizado.address || 'Dirección en proceso', // Mapea HCC, Razetti, etc [15]
                    ubicacion: doctorActualizado.ubicacion || 'Dirección en proceso', // Mapea HCC, Razetti, etc [15]
                    phone: doctorActualizado.phone || '584120000000',
                    status: 'Activo', // Se inicializa activo para producción inmediata en Vercel [12]
                    user_id: doctorActualizado._id, // Relación directa con el ID único del prospecto [14]
                    planSuscripcion: 'GRATIS' [14]
                });

                await nuevoConsultorio.save();
                console.log(`✅ Consultorio SaaS creado con éxito. URL: https://${slug}.klyntic.com`);
            }
        }

        res.json({
            ok: true,
            doctorActualizado
        });

    } catch (error) {
        console.error('Error crítico al actualizar el doctor/crear consultorio:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno, por favor hable con el administrador.'
        });
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
    // Usar const en lugar de var es una mejor práctica
    const nombre = req.params['nombre'];
    const estadoFilter = req.query.estado_seguimiento || null;

    try {
        const Speciality = require('../models/speciality');
        const speciality = await Speciality.findOne({ nombre: nombre });
        
        if (!speciality) {
            return res.status(404).json({ message: 'Especialidad no encontrada' });
        }
        
        // SOLUCIÓN: Cambiar 'category' por 'speciality' (o el nombre real del campo en tu modelo Doctor)
        let doctorsFilter = { speciality: speciality._id };

        if (estadoFilter) {
            doctorsFilter.estado_seguimiento = estadoFilter;
        }
        
        // Ejecutar la búsqueda con el filtro corregido
        const doctors = await Doctor.find(doctorsFilter)
            .populate('speciality')
            .populate('pais');
        
        return res.status(200).json({ doctors: doctors });
    } catch (err) {
        // Es más seguro enviar err.message para no exponer detalles internos del servidor
        return res.status(500).json({ error: err.message || err });
    }
}



const checkExistenceByName = async(req, res) => {
    const { name } = req.params;

    try {
        const doctor = await Doctor.findOne({ name: name });

        if (doctor) {
            return res.json({
                ok: true,
                exists: true,
                message: 'Project with this name already exists.'
            });
        } else {
            return res.json({
                ok: true,
                exists: false,
                message: 'No project found with this name.'
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            ok: false,
            message: 'Server error while checking project existence.'
        });
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
    listarProyectPorSpeciality,
    checkExistenceByName


};