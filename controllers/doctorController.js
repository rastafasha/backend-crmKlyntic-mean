const { response } = require('express');
const Doctor = require('../models/doctor');
const Speciality = require('../models/speciality');
const Consultorio = require('../models/consultorio'); // Importamos el nuevo modelo de SaaS [12]


// =========================================================================
// ✉️ HELPER INTERNO PARA MAILJET (Evita errores de importación ausente)
// =========================================================================
const enviarCorreoAccesosSaaS = async ({ email, nombre, phone, nombreComercial, url, esEnterprise }) => {
    const MAILJET_API_KEY = process.env.SMTP_USER;
    const MAILJET_SECRET_KEY = process.env.SMTP_PASS;
    const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

    const planSuscripcion = esEnterprise ? 'ENTERPRISE' : 'GRATIS';

    const htmlBody = `
    <div style="font-family: sans-serif; padding: 30px; background: #f5f5f7; color: #1d1d1f;">
        <div style="max-width: 500px; background: #ffffff; padding: 30px; border-radius: 14px; margin: 0 auto;">
            <h2 style="text-align: center; color: #6366f1;">¡Tu acceso a Klyntic está listo! 🚀</h2>
            <p>Hola, <strong>Dr(a). ${nombre}</strong>,</p>
            <p>Su espacio de trabajo corporativo ha sido configurado y aprobado de forma exitosa.</p>
            <div style="background: #f5f5f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                🏢 <strong>Entidad:</strong> ${nombreComercial}<br>
                📧 <strong>Usuario:</strong> ${email}<br>
                📧 <strong>Contraseña:</strong> ${phone}<br>
                ⚙️ <strong>Plan:</strong> ${planSuscripcion}
            </div>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${url}" target="_blank" style="background: #0071e3; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ingresar al Sistema</a>
            </p>
            <p style="font-size: 12px; color: #86868b; text-align: center;">Infraestructura Segura Multi-Tenant — Klyntic</p>
        </div>
    </div>`;

    return axios.post('https://mailjet.com', {
        Messages: [{
            From: { Email: "malcolmc@klyntic.com", Name: "Klyntic" },
            To: [{ Email: email, Name: nombre }],
            ReplyTo: { Email: "mercadocreativo@gmail.com", Name: "Soporte Klyntic" },
            Subject: "¡Tu infraestructura médica en Klyntic ya está lista! 🚀",
            HTMLPart: htmlBody
        }]
    }, {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        }
    });
};

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
    try {
        let data = req.body;

        // 1. RECEPTOR INTELIGENTE DE ESPECIALIDAD (Tu lógica de string a ObjectId)
        if (data.speciality && typeof data.speciality === 'string' && data.speciality.trim() !== '') {
            const nombreEspecialidad = data.speciality.trim();
            let specialityDB = await Speciality.findOne({
                nombre: { $regex: new RegExp(`^${nombreEspecialidad}$`, 'i') }
            });

            if (!specialityDB) {
                console.log(`✨ Creando nueva especialidad automática desde Landing: ${nombreEspecialidad}`);
                specialityDB = new Speciality({ nombre: nombreEspecialidad });
                await specialityDB.save();
            }
            data.speciality = specialityDB._id;
        } else if (data.speciality === '') {
            delete data.speciality;
        }

        // 🟢 2. CORRECCIÓN CLAVE DE MAPEADO:
        // Extraemos 'ciudad' y 'ubicacion' de forma segura desde el objeto de entrada (data)
        const ciudadFormulario = data.ciudad || 'Caracas';
        let ubicacionFinal = data.ubicacion;

        // Si el usuario seleccionó "Consultorio", el campo 'ubicacion' llegará vacío desde Angular.
        // En ese caso, le asignamos el nombre de la ciudad por defecto para evitar registros vacíos en el CRM.
        if (data.tipoClinica === 'Consultorio' || !ubicacionFinal || ubicacionFinal.trim() === '') {
            ubicacionFinal = ciudadFormulario;
        }

        const uid = req.uid || null;

        // 🟢 3. CONSTRUCCIÓN SEGURA DEL MODELO
        const doctor = new Doctor({
            usuario: uid,
            ...data, // Mantiene todos los campos nativos del formulario (incluyendo data.ciudad)
            ubicacion: ubicacionFinal // Sobreescribimos la ubicación de forma inteligente
        });

        const doctorDB = await doctor.save();

        res.json({
            ok: true,
            doctor: doctorDB
        });

    } catch (error) {
        console.error('❌ Error crítico en el registro del doctor desde Landing:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno en el servidor, por favor hable con el admin.'
        });
    }
};





const updateDoctor = async (req, res) => {
    const id = req.params.id;
    const uid = req.uid;

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

        const doctorActualizado = await Doctor.findByIdAndUpdate(id, cambiosDoctor, { new: true });

        // Inicializamos la variable para retornar un link alternativo manual por si el webhook falla
        let whatsapp_link = '';

        if (dataModificada.estado_seguimiento === 'APROBADO') {

            const existeConsultorio = await Consultorio.findOne({ user_id: doctorActualizado._id });

            let slug;
            let queryBusqueda = {};

            const nombreComercial = doctorActualizado.tipoClinica === 'Clinica'
                ? (doctorActualizado.ubicacion || 'Clinica Enterprise')
                : `${doctorActualizado.nombre || ''} ${doctorActualizado.apellido || ''}`.trim();

            if (existeConsultorio) {
                console.log(`♻️ ¡Actualización detectada! Modificando entidad existente ID: ${existeConsultorio._id}`);
                queryBusqueda = { _id: existeConsultorio._id };
                slug = existeConsultorio.slug;
            } else {
                console.log(`🚀 ¡Conversión detectada! Creando espacio para: ${nombreComercial}`);
                queryBusqueda = { user_id: doctorActualizado._id };

                const nombreSlugBase = nombreComercial || 'centro-medico';

                slug = nombreSlugBase.toLowerCase().trim()
                    .replace(/[\s]+/g, '-')
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-')
                    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')
                    .replace(/ñ/g, 'n').replace(/ü/g, 'u');

                const existeSlug = await Consultorio.findOne({ slug });
                if (existeSlug) {
                    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
                }
            }

            const esEnterprise = doctorActualizado.tipoClinica === 'Clinica';
            const planSuscripcion = esEnterprise ? 'ENTERPRISE' : 'GRATIS';
            const statusAppActual = esEnterprise ? 'SUSCRITO' : (doctorActualizado.statusapp || 'PENDIENTE');

            const camposConsultorio = {
                name: nombreComercial,
                slug: slug,
                moneda: 'USD',
                acepta_usd_internacional: false,
                acepta_moneda_local: true,
                statusapp: statusAppActual,
                ciudad: doctorActualizado.ciudad || 'Caracas',
                address: doctorActualizado.address || 'Dirección en proceso',
                ubicacion: doctorActualizado.ubicacion || 'Dirección en proceso',
                phone: doctorActualizado.phone || '584120000000',
                status: 'Activo',
                user_id: doctorActualizado._id,
                planSuscripcion: planSuscripcion
            };

            const consultorioFinal = await Consultorio.findOneAndUpdate(
                queryBusqueda,
                { $set: camposConsultorio },
                { new: true, upsert: true }
            );

            const urlAcceso = esEnterprise
                ? `https://${consultorioFinal.slug}.admin.klyntic.com`
                : `https://${consultorioFinal.slug}.klyntic.com`;

            // =========================================================================
            // ✉️ DISPARADOR DE ACCESOS AUTOMÁTICO AL APROBAR (Mailjet)
            // =========================================================================
            if (doctorActualizado.email && !doctorActualizado.correo_sendit) {
                console.log(`✉️ Despachando credenciales de acceso a: ${doctorActualizado.email}`);

                try {
                    await enviarCorreoAccesosSaaS({
                        email: doctorActualizado.email,
                        phone: doctorActualizado.phone,
                        nombre: doctorActualizado.nombre || 'Doctor(a)',
                        nombreComercial: nombreComercial,
                        url: urlAcceso,
                        esEnterprise: esEnterprise
                    });

                    doctorActualizado.correo_sendit = true;
                    doctorActualizado.correo_enviado = new Date().toISOString();
                    await doctorActualizado.save();

                    console.log(`✅ Correo de accesos entregado a Mailjet con éxito.`);
                } catch (mailError) {
                    console.error('⚠️ Error al enviar el correo automático de accesos:', mailError.message);
                }
            }

            // =========================================================================
            // 📲 DISPARADOR AUTOMÁTICO DE CREDENCIALES VÍA WHATSAPP (Webhook Render)
            // =========================================================================
            if (doctorActualizado.phone) {
                const mensajeBot = `✨ *KLYNTIC CONSULTORIO DIGITAL* ✨\n\n` +
                    `👋 ¡Hola Doc! Su acceso a la plataforma ya se encuentra activo y configurado.\n\n` +
                    `🔗 *Enlace Privado:* ${urlAcceso}\n` +
                    `📧 *Usuario de Ingreso:* ${doctorActualizado.email}\n` +
                    `📧 *Contraseña:* ${doctorActualizado.phone}\n\n` +
                    `Cualquier duda o asistencia con la configuración inicial de sus agendas me avisa.`;

                try {
                    // 🔍 BUSQUEDA MAESTRA: Intentamos buscar tu consultorio administrador en la DB
                    // Cambia 'klyntic' por el slug real que use tu cuenta administradora corporativa
                    let consultorioAdmin = await Consultorio.findOne({ slug: 'klyntic' });

                    // Si no existe un consultorio admin creado, generamos un ObjectId de respaldo válido
                    // para que el microservicio receptor no rebote la petición por formato inválido.
                    const adminId = consultorioAdmin
                        ? String(consultorioAdmin._id)
                        : "6a48458d6b613b73e4c34d02"; // 24 caracteres hexadecimales (Format ObjectId)

                    await axios.post('https://back-klyntic-envios.onrender.com/api/klyntic/notificaciones/webhook-recordatorio', {
                        consultorio_id: adminId,                               // 🟢 ID Corporativo Maestro asignado
                        telefono: doctorActualizado.phone,
                        mensaje: mensajeBot,
                        usuario: String(doctorActualizado._id).trim(),
                        rolDestinatario: 'DOCTOR',
                        titulo: '¡Tu acceso a Klyntic está listo! 🏥',
                        tipo: 'AVISO_GENERAL'
                    });

                    console.log(`📲 Alerta de accesos encolada en el Webhook de WhatsApp con éxito.`);
                } catch (wsError) {
                    console.error('⚠️ El microservicio de envíos no respondió o está dormido:', wsError.message);

                    const numeroLimpio = doctorActualizado.phone.replace(/[^\d]/g, '');

                    // 🟢 UNIFICADO: Estructura nativa wa.me indestructible que Angular procesa sin quejas
                    whatsapp_link = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensajeBot)}`;
                }
            }

            if (esEnterprise) {
                console.log(`🏢 [ENTERPRISE] Clínica procesada con éxito. URL Corporativa: ${urlAcceso}`);
            } else {
                console.log(`[EXPRESS] Consultorio independiente procesado con éxito.URL Redes: ${urlAcceso}`);
            }
        }
        // Retornamos el doctor y el link manual (si se generó en el catch)
        res.json({
            ok: true,
            doctorActualizado,
            whatsapp_link
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



const checkExistenceByName = async (req, res) => {
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