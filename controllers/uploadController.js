const path = require('path');
const fs = require('fs');
const { response } = require('express');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary (Compartido por ambos controladores)
cloudinary.config({
    api_key: process.env.API_KEY_CLOUDINARY,
    api_secret: process.env.API_SECRET_CLOUDINARY,
    cloud_name: process.env.CLOUD_NAME
});

// ==========================================
// 1. CONTROLADOR DE IMÁGENES (Tu código original intacto)
// ==========================================
const fileUpload = async (req, res = response) => {
    const tipo = req.params.tipo;
    const id = req.params.id;

    const tiposValidos = ['doctors'];
    if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ ok: false, msg: 'Tipo de colección no permitido' });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ ok: false, msg: 'No se seleccionó ninguna imagen' });
    }

    const file = req.files.imagen;

    const MAX_SIZE_MB = 3;
    const bytesLimit = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > bytesLimit) {
        return res.status(400).json({ ok: false, msg: `La imagen supera el límite de ${MAX_SIZE_MB}MB.` });
    }

    const nombreCortado = file.name.split('.');
    const extensionArchivo = nombreCortado[nombreCortado.length - 1].toLowerCase();
    const extensionesValidas = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

    if (!extensionesValidas.includes(extensionArchivo)) {
        return res.status(400).json({ ok: false, msg: 'Formato no permitido' });
    }

    try {
        const base64Image = Buffer.from(file.data).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${base64Image}`;

        const result = await cloudinary.uploader.upload(dataURI, {
            folder: `crmklyntic/uploads/${tipo}/`,
            public_id: uuidv4(),
            transformation: [
                { width: 1000, crop: "limit" }, 
                { quality: "auto" },            
                { fetch_format: "auto" }        
            ]
        });

        const urlImagen = result.secure_url;
        const campoDestino = req.query.campo || 'img';
        const updateQuery = { [campoDestino]: urlImagen };

        const Doctor = require('../models/doctor');
        await Doctor.findByIdAndUpdate(id, updateQuery, { new: true, runValidators: false });

        res.json({
            ok: true,
            msg: 'Imagen subida y optimizada con éxito',
            nombreArchivo: urlImagen
        });

    } catch (error) {
        console.error('Error Cloudinary:', error);
        return res.status(500).json({ ok: false, msg: 'Error interno en servidor', error: error.message });
    }
};

// ==========================================
// 2. 🔥 NUEVO CONTROLADOR: EXCLUSIVO PARA VIDEOS KLYNTIC
// ==========================================
const videoUpload = async (req, res = response) => {
    const tipo = req.params.tipo; // Recibe 'recursos' o 'consultorios'
    const id = req.params.id;     // ID del documento en Mongo a actualizar

    // Validamos las colecciones válidas que aceptarán videos demostrativos o express
    const tiposValidos = ['recursos', 'consultorios'];
    if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ ok: false, msg: 'Tipo de colección para video no permitido' });
    }

    // Validamos que el archivo venga en el request (ej: req.files.video)
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.video) {
        return res.status(400).json({ ok: false, msg: 'No se seleccionó ningún archivo de video válido' });
    }

    const file = req.files.video;

    // Validación estricta de peso para videos (Límite: 20MB para tus mp4 de 16MB)
    const MAX_SIZE_MB = 20;
    const bytesLimit = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > bytesLimit) {
        return res.status(400).json({
            ok: false,
            msg: `El video supera el límite permitido de ${MAX_SIZE_MB}MB. Por favor, pásalo por HandBrake primero.`
        });
    }

    // Validar extensiones de video comunes
    const nombreCortado = file.name.split('.');
    const extensionArchivo = nombreCortado[nombreCortado.length - 1].toLowerCase();
    const extensionesValidas = ['mp4', 'mov', 'webm'];

    if (!extensionesValidas.includes(extensionArchivo)) {
        return res.status(400).json({ ok: false, msg: 'Formato de video no permitido (usa mp4, mov o webm)' });
    }

    try {
        // Convertimos el Buffer del video a Data URI de forma segura
        const base64Video = Buffer.from(file.data).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${base64Video}`;

        console.log(`⏳ Subiendo video a Cloudinary en la carpeta /recursos... Peso: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

        // 🚀 CLAVE: Usamos upload_large para soportar streams pesados de video sin cortes de buffer
        const result = await cloudinary.uploader.upload_large(dataURI, {
            folder: `crmklyntic/videos/${tipo}/`,
            public_id: uuidv4(),
            resource_type: "video", // 👈 OBLIGATORIO: Le indica a Cloudinary que procese codecs de video
            chunk_size: 6000000     // Envía fragmentos de 6MB en memoria para máxima velocidad
        });

        const urlVideo = result.secure_url;
        const campoDestino = req.query.campo || 'urlMedia'; // 'urlMedia' por defecto para tus recursos
        const updateQuery = { 
            urlMedia: result.secure_url,
            cloudinary_id: result.public_id, // 👈 Se guarda el ID de borrado
            bytes: result.bytes               // 👈 Se guarda el peso real devuelto por Cloudinary
        };

        // 🔄 Actualización dinámica de base de datos según el tipo elegido
        if (tipo === 'recursos') {
            const Recurso = require('../models/recurso'); // Asegúrate de tener este modelo creado
            await Recurso.findByIdAndUpdate(id, updateQuery, { new: true, runValidators: false });
        } else if (tipo === 'consultorios') {
            const Consultorio = require('../models/consultorio');
            await Consultorio.findByIdAndUpdate(id, updateQuery, { new: true, runValidators: false });
        }

        res.json({
            ok: true,
            msg: 'Video subida y procesado en Cloudinary con éxito',
            url: urlVideo
        });

    } catch (error) {
        console.error('❌ Error crítico en Cloudinary Video:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Hubo un error al procesar el video en el servidor',
            error: error.message
        });
    }
};

const retornaImagen = (req, res) => {
    const tipo = req.params.tipo;
    const foto = req.params.foto;

    const pathImg = path.join(__dirname, `../uploads/${tipo}/${foto}`);
    
    //traigo la foto desde cloudinary
    const urlImg = cloudinary.url(foto, {
        width: 300,
        height: 300,
        crop: 'fill'
    });

    //imagen por defecto
    if (fs.existsSync(pathImg)) {
        res.sendFile(pathImg);
    } else {
        const pathImg = path.join(__dirname, `../uploads/${tipo}/no-image.jpg`);
        res.sendFile(pathImg);
    }
};

module.exports = {
    fileUpload,
    retornaImagen,
    videoUpload
}
