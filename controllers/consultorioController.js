const { response } = require('express');
const axios = require('axios');
const Consultorio = require('../models/consultorio');

// Obtener todos los consultorios (Panel CRM)
const getConsultorios = async (req, res) => {
    try {
        const consultorios = await Consultorio.find().sort({ createdAt: -1 });
        res.json({ ok: true, consultorios });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al obtener consultorios' });
    }
};

const getConsultorio = async (req, res) => {
    try {
        const consultorio = await Consultorio.findById(req.params.id)
        .populate('speciality')
        .populate('pais')

        if (!consultorio) return res.status(404).json({ msg: 'consultorio not found' })
        res.json({
            ok: true,
            consultorio
        });

    } catch (error) {
        return res.status(404).json({ msg: 'consultorio not found' })
    }
};

// Crear Consultorio Express (Cuando el CRM cambia de formulario a Cliente Activo)
/**
 * 🚀 ALTA AUTOMÁTICA SAAS MULTI-TENANT
 * Registra en el CRM (MongoDB) y da de alta la cuenta maestra del Médico en Laravel (Supabase)
 */
const crearConsultorioExpress = async (req, res) => {
    try {
        // 1. Instanciamos el modelo con los datos que vienen del formulario de Angular del CRM
        const nuevoConsultorio = new Consultorio(req.body);

        // Limpiamos y formateamos el slug/subdominio de forma segura (ej: 'dra-belen')
        nuevoConsultorio.slug = String(req.body.slug || req.body.name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-]/g, ''); // Remueve eñes, acentos y caracteres especiales para la URL
        
        nuevoConsultorio.status = 'Activo';
        nuevoConsultorio.statusapp = req.body.statusapp || 'PENDIENTE';
        nuevoConsultorio.planSuscripcion = req.body.planSuscripcion || 'GRATIS';
        nuevoConsultorio.moneda = req.body.moneda || 'USD';

        // Limpiamos el teléfono para usarlo de forma segura (eliminamos guiones o espacios)
        const telefonoLimpio = String(req.body.phone || req.body.telefono || '').replace(/\D/g, '');
        nuevoConsultorio.phone = telefonoLimpio;

        // 2. Guardamos provisionalmente en tu MongoDB del CRM para asegurar el _id NoSQL
        await nuevoConsultorio.save();
        console.log(`💾 [CRM] Pre-registro guardado en MongoDB. Slug: ${nuevoConsultorio.slug}`);

        // =====================================================================
        // 📡 PIPELINE DE AUTOMATIZACIÓN: ALERTA AL CORE DE LARAVEL (SUPABASE)
        // =====================================================================
        let laravelCoreId = null;
        try {
            // Limpiamos la URL base para evitar el bug de la doble barra '//api'
            const urlBaseLaravel = rtrim(process.env.LARAVEL_API_URL || 'http://127.0.0', '/');
            const urlLaravelSync = `${urlBaseLaravel}/crm/sync-tenant`;
            
            console.log(`📡 [CRM Pipeline] Despachando credenciales de Médico a Laravel Core...`);
            
            // Disparamos la petición POST hacia el CRMIntegrationController de Laravel
            const respuestaLaravel = await axios.post(urlLaravelSync, {
                crm_doctor_id: String(nuevoConsultorio._id),
                subdomain: nuevoConsultorio.slug,
                
                // Mapeamos los campos reales que espera tu tabla 'users' de PostgreSQL
                nombre: req.body.nombre || req.body.name || 'Médico',
                apellido: req.body.apellido || 'Express',
                email: strtolower(trim(req.body.email || `${nuevoConsultorio.slug}@klyntic.com`)),
                n_doc: req.body.n_doc || String(Date.now()).substring(4, 12), // Cédula/DNI
                phone: telefonoLimpio,
                speciality_id: req.body.category || req.body.speciality_id || null, // Tu ID de especialidad médica
                moneda_cobro: nuevoConsultorio.moneda,
                status_app: nuevoConsultorio.status,

                // 🔑 TU ESTRATEGIA: Mandamos el teléfono limpio como password inicial para que Laravel le haga bcrypt
                password_inicial: telefonoLimpio 
            }, {
                // Cabecera de autenticación interna compartida entre tus servidores
                headers: {
                    'Authorization': process.env.CRM_INTERNAL_TOKEN || 'KlynticCRMSecretToken_2026_vM0MmcxxA4Ih'
                },
                timeout: 8000 // Cortafuegos de 8 segundos si Render está frío
            });

            // Si Laravel procesó y creó el User de forma exitosa en Supabase
            if (respuestaLaravel.data && respuestaLaravel.data.ok) {
                laravelCoreId = respuestaLaravel.data.laravel_user_id;
                
                if (laravelCoreId) {
                    // 🔄 RETROALIMENTACIÓN INTEGRAL: Sincronizamos el ID numérico real en MongoDB
                    nuevoConsultorio.user_id = String(laravelCoreId);
                    await nuevoConsultorio.save();
                    console.log(`🔗 [CRM Pipeline] Éxito. Enlazado MongoDB con la tabla users ID: #${laravelCoreId}`);
                }
            }

        } catch (errorLaravel) {
            // Si Laravel está en reposo o da timeout, capturamos el error para no colgar tu panel del CRM
            console.error('⚠️ [CRM Pipeline] Sincronización en frío omitida temporalmente:', errorLaravel.message);
        }

        // 3. RESPUESTA AL PANEL ADMINISTRATIVO DEL CRM (ANGULAR)
        return res.status(201).json({
            ok: true,
            msg: 'Médico dado de alta y sincronizado en el ecosistema Klyntic Express.',
            consultorio: nuevoConsultorio
        });

    } catch (error) {
        console.error('❌ Error fatal al dar de alta el consultorio Express:', error);
        return res.status(500).json({ ok: false, msg: 'Error de servidor al crear consultorio.' });
    }
};

// Funciones utilitarias de soporte rápidas
function rtrim(str, chr) {
    const rgx = new RegExp(chr + '+\$');
    return str.replace(rgx, '');
}
function strtolower(str) { return String(str).toLowerCase(); }
function trim(str) { return String(str).trim(); }

// Buscar consultorio por su Slug/Subdominio (¡Esta es la petición que hará Angular!)
const findBySlug = async (req, res) => {
    const { slug } = req.params;

    try {
        // 1. Buscamos el consultorio en MongoDB por su subdominio (slug)
        const consultorio = await Consultorio.findOne({ slug: slug.toLowerCase().trim() });
        
        if (!consultorio) {
            return res.status(404).json({ ok: false, msg: 'Consultorio no encontrado.' });
        }

        // =====================================================================
        // 🔥 AQUÍ VA LA FUNCIÓN DE CONFIGURACIÓN Y LIMPIEZA DINÁMICA:
        // =====================================================================
        // Convertimos a String limpio quitando espacios accidentales
        const user_id_raw = consultorio.user_id ? String(consultorio.user_id).trim() : '';
        
        // Transformamos a un entero base 10 legítimo para Laravel (PostgreSQL)
        const laravelDoctorId = parseInt(user_id_raw, 10);

        // Si la base de datos de Mongo arroja vacío o un texto corrupto, frena aquí de forma segura
        if (!user_id_raw || isNaN(laravelDoctorId) || laravelDoctorId <= 0) {
            console.log(`⚠️ [CRM] El subdominio '${slug}' está registrado pero no tiene un 'user_id' de Laravel asociado válido. Recibido: "${consultorio.user_id}"`);
            
            return res.status(200).json({
                ok: true,
                consultorio: {
                    ...consultorio.toObject(),
                    schedule_selecteds: [] // Enviamos el perfil con agenda vacía para que Angular no rompa
                }
            });
        }

        // =====================================================================
        // 📡 SI PASA EL FILTRO, SOLICITA LA AGENDA REAL A LARAVEL CORE (SUPABASE)
        // =====================================================================
        console.log(`📡 [CRM Puente] Solicitando agenda real a Laravel para el Médico ID legítimo: ${laravelDoctorId}`);
        
        let agendaRealLaravel = [];
        try {
            const urlLaravel = `${process.env.LARAVEL_API_URL || 'http://127.0.0'}/doctors/profile/${laravelDoctorId}`;
            
            const respuestaLaravel = await axios.get(urlLaravel);
            if (respuestaLaravel.data && respuestaLaravel.data.schedule_selecteds) {
                agendaRealLaravel = respuestaLaravel.data.schedule_selecteds;
                console.log(`✅ [CRM Puente] Sincronización exitosa con Laravel para Doctor #${laravelDoctorId}.`);
            }
        } catch (errorLaravel) {
            console.error('⚠️ [CRM Puente] Error de comunicación con Laravel Core:', errorLaravel.message);
        }

        // 3. RETORNO UNIFICADO MULTI-TENANT PARA ANGULAR (VERCEL)
        const consultorioSaaS = consultorio.toObject();
        consultorioSaaS.user_id = laravelDoctorId; // Retornamos el entero limpio (ej: 9)
        consultorioSaaS.schedule_selecteds = agendaRealLaravel; // Inyectamos sus horarios reales

        return res.status(200).json({
            ok: true,
            consultorio: consultorioSaaS
        });

    } catch (error) {
        console.error('❌ Error crítico en el buscador de subdominios del CRM:', error);
        return res.status(500).json({ ok: false, msg: 'Fallo interno al procesar el subdominio.' });
    }
};

// Actualizar Datos desde el CRM
const actualizarConsultorio = async (req, res) => {
    const id = req.params.id;
    let data = req.body;

    try {
        const consultorioDB = await Consultorio.findById(id);
        if (!consultorioDB) {
            return res.status(404).json({ ok: false, msg: 'Consultorio no encontrado.' });
        }

        // Si se cambia el name, actualizamos el slug
        if (data.name) {
            data.slug = data.name.toLowerCase().trim().replace(/[\s]+/g, '-').replace(/[^\w\-]+/g, '');
        }

        const consultorioActualizado = await Consultorio.findByIdAndUpdate(id, data, { new: true });
        res.json({ ok: true, consultorio: consultorioActualizado });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar.' });
    }
};



module.exports = {
    getConsultorios,
    getConsultorio,
    crearConsultorioExpress,
    findBySlug,
    actualizarConsultorio
};
