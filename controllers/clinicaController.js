const { response } = require('express');
const axios = require('axios');
const Consultorio = require('../models/consultorio');


const crearClinicaEnterprise = async (req, res) => {
    try {
        const { name, slug, ciudad, address, phone } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ ok: false, msg: 'El nombre de la clínica y el subdominio (slug) son obligatorios.' });
        }

        // 1. Limpieza estricta del subdominio de cara a la URL de Instagram
        const slugLimpio = String(slug)
            .toLowerCase()
            .trim()
            .replace(/[\s]+/g, '-') // Espacios por guiones
            .replace(/[^\w\-]+/g, '') // Remueve caracteres especiales
            .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u')
            .replace(/ñ/g, 'n');

        // 2. Verificar que el subdominio no esté en uso por otra clínica o doctor independiente
        const existeSubdominio = await Consultorio.findOne({ slug: slugLimpio });
        if (existeSubdominio) {
            return res.status(400).json({ 
                ok: false, 
                msg: `El subdominio '${slugLimpio}.klyntic.com' ya se encuentra registrado en el sistema.` 
            });
        }

        // 3. Instanciar la entidad con tus especificaciones exactas de la Base de Datos
        const nuevaClinica = new Consultorio({
            name: name,
            slug: slugLimpio,
            tipoClinica: 'Clinica', //  Flag exacto para encender el Selector Apple en Angular
            status: 'Activo',
            statusapp: 'SUSCRITO', // Configuración por defecto para clientes Enterprise
            planSuscripcion: 'PRO',
            moneda: req.body.moneda || 'USD',
            ciudad: ciudad || 'Caracas',
            address: address || 'Dirección en proceso',
            phone: phone ? String(phone).replace(/\D/g, '') : '584120000000',
            user_id: '0', // 🔒 Indicador neutro: Le avisa a Node que no depende de un médico individual
            
            // Listas maestras inicializadas vacías para el branding de la landing
            ConsultasyTarifasList: req.body.ConsultasyTarifasList || [],
            Servicios_procedimientosList: req.body.Servicios_procedimientosList || [],
            vacunasList: req.body.vacunasList || [],
            usavacunas: req.body.usavacunas || false
        });

        // 4. Guardar en MongoDB Atlas
        await nuevaClinica.save();
        console.log(`🏢 [CRM SaaS] ¡Nueva Clínica Enterprise dada de alta! URL: https://${nuevaClinica.slug}.klyntic.com`);

        return res.status(201).json({
            ok: true,
            msg: 'Centro médico corporativo registrado con éxito en Klyntic SaaS.',
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