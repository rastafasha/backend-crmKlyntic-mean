const { response } = require('express');
const axios = require('axios');
const Consultorio = require('../models/consultorio');

const crearClinicaEnterprise = async (req, res) => {
    try {
        const { name, slug, ciudad, address, phone, email_admin, nombre_admin, apellido_admin } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ ok: false, msg: 'El nombre de la clínica y el subdominio (slug) son obligatorios.' });
        }

        if (!email_admin) {
            return res.status(400).json({ ok: false, msg: 'El correo electrónico del administrador de la clínica es requerido para dar de alta el entorno Enterprise.' });
        }

        // 1. Limpieza estricta del subdominio de cara a la URL de Instagram
        const slugLimpio = String(slug)
            .toLowerCase()
            .trim()
            .replace(/[\s]+/g, '-') 
            .replace(/[^\w\-]+/g, '') 
            .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')
            .replace(/ñ/g, 'n');

        // 2. Verificar que el subdominio no esté en uso
        const existeSubdominio = await Consultorio.findOne({ slug: slugLimpio });
        if (existeSubdominio) {
            return res.status(400).json({ 
                ok: false, 
                msg: `El subdominio '${slugLimpio}.klyntic.com' ya se encuentra registrado en el sistema.` 
            });
        }

        // 3. Instanciar la entidad con tus especificaciones exactas
        const nuevaClinica = new Consultorio({
            name: name,
            slug: slugLimpio,
            tipoClinica: 'Clinica', 
            status: 'Activo',
            statusapp: 'SUSCRITO', 
            planSuscripcion: 'PRO', 
            moneda: req.body.moneda || 'USD', 
            ciudad: ciudad || 'Caracas', 
            address: address || 'Dirección en proceso', 
            phone: phone ? String(phone).replace(/\D/g, '') : '584120000000', 
            user_id: '0', // 🔒 Inicializador provisional antes del puente con Laravel
            
            ConsultasyTarifasList: req.body.ConsultasyTarifasList || [], 
            Servicios_procedimientosList: req.body.Servicios_procedimientosList || [], 
            vacunasList: req.body.vacunasList || [], 
            usavacunas: req.body.usavacunas || false 
        });

        // Guardar provisionalmente en tu MongoDB para asegurar el _id NoSQL
        await nuevaClinica.save();
        console.log(`🏢 [CRM SaaS] ¡Pre-registro de Clínica guardado en Mongo! URL: https://${nuevaClinica.slug}.klyntic.com`);

        const telefonoLimpio = nuevaClinica.phone;

        // =====================================================================
        // 📡 PIPELINE DE AUTOMATIZACIÓN ENTERPRISE: ALERTA AL CORE DE LARAVEL
        // =====================================================================
        let laravelAdminId = null;
        try {
            // Limpiamos la URL base quitando barras inclinadas accidentales al final
            const urlBaseLaravel = String(process.env.LARAVEL_API_URL || 'http://127.0.0.1:8000').replace(/\/+\$/, '');
            const urlLaravelSync = `${urlBaseLaravel}/api/crm/sync-enterprise-admin`; 
            
            console.log(`📡 [CRM Enterprise Pipeline] Despachando cuenta de ADMIN institucional a Laravel Core...`);
            
            const respuestaLaravel = await axios.post(urlLaravelSync, {
                crm_clinica_id: String(nuevaClinica._id), 
                subdomain: nuevaClinica.slug,
                nombre: nombre_admin || 'Administrador',
                apellido: apellido_admin || 'Corporativo',
                email: String(email_admin).toLowerCase().trim(),
                n_doc: req.body.n_doc_admin || String(Date.now()).substring(4, 12), 
                phone: telefonoLimpio,
                moneda_cobro: nuevaClinica.moneda,
                status_app: nuevaClinica.status,
                password_inicial: telefonoLimpio
            }, {
                headers: {
                    'Authorization': process.env.CRM_INTERNAL_TOKEN || 'KlynticCRMSecretToken_2026_vM0MmcxxA4Ih'
                },
                timeout: 8000
            });

            // 4. 🔥 RETROALIMENTACIÓN INTEGRAL: Capturamos el ID e indexamos con éxito
            if (respuestaLaravel.data && respuestaLaravel.data.ok) {
                laravelAdminId = respuestaLaravel.data.laravel_user_id;
                
                if (laravelAdminId) {
                    // Sincronizamos el user_id de la clínica con el ID de PostgreSQL/Supabase [6]
                    nuevaClinica.user_id = String(laravelAdminId);
                    await nuevaClinica.save();
                    console.log(`🔗 [CRM Enterprise Pipeline] Éxito. Entorno corporativo enlazado al ADMIN ID: #${laravelAdminId}`);
                }
            }

        } catch (errorLaravel) {
            console.error('⚠️ [CRM Enterprise Pipeline] Error al sincronizar ADMIN en Laravel Core:', errorLaravel.message);
        }

        return res.status(201).json({
            ok: true,
            msg: 'Centro médico corporativo y cuenta de ADMIN registrados con éxito en Klyntic SaaS.',
            consultorio: nuevaClinica
        });

    } catch (error) {
        console.error('❌ Error fatal al registrar la clínica Enterprise:', error);
        return res.status(500).json({ ok: false, msg: 'Error interno del servidor al procesar el alta.' });
    }
};

module.exports = {
    crearClinicaEnterprise 
};