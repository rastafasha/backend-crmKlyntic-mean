const nodemailer = require('nodemailer');
const Doctor = require('../models/doctor');

// Inicializar el transportador SMTP con las variables de Mailjet (.env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 465,
  secure: process.env.SMTP_PORT == 465, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


/**
 * 2. LISTAR: Obtiene los doctores con filtros para armar tus selects o tablas en Angular
 */
/**
 * 2. LISTAR: Obtiene los doctores con paginación dinámica y filtros reales
 */
const obtenerDoctoresCRM = async (req, res) => {
  try {
    const { ubicacion, enviado } = req.query;
    
    // 💡 PAGINACIÓN DINÁMICA:
    // Capturamos 'desde' (cuántos saltar) y 'limite' (cuántos traer). 
    // Si el frontend no manda nada, por defecto arranca en 0 y trae 6 por página.
    const desde = Number(req.query.desde) || 0;
    const limite = Number(req.query.limite) || 6;

    let query = {};

    if (ubicacion) {
      query.ubicacion = { $regex: ubicacion, $options: 'i' };
    }

    if (enviado !== undefined) {
      query.correo_enviado = enviado === 'true';
    }

    // 🚀 EJECUCIÓN EN PARALELO (Promise.all):
    // Hacemos la búsqueda paginada y la cuenta total del universo al mismo tiempo.
    const [ doctors, totalReal ] = await Promise.all([
      Doctor.find(query)
            .populate('speciality') // Tu populate clave para que funcione el filtro por nombre
            .skip(desde)            // Se salta los de las páginas anteriores (ej: si estás en pág 2, salta 6)
            .limit(limite)          // Trae el bloque exacto pedido por Angular
            .sort({ createdAt: -1 }),
            
      Doctor.countDocuments(query)  // Cuenta cuántos médicos CUMPLEN con ese filtro en TODA la BD
    ]);

    return res.status(200).json({
      ok: true,
      total: totalReal, // 👈 IMPORTANTE: Ahora mandamos el total real del universo para que Angular dibuje los botones del paginador
      doctors
    });

  } catch (error) {
    console.error("Error en obtenerDoctoresCRM:", error);
    return res.status(500).json({ ok: false, msg: "Error al obtener la lista de médicos" });
  }
};


/**
 * 3. ENVÍO INDIVIDUAL: Dispara el correo por ID (Uso manual en selects del frontend)
 */
const enviarCorreoIndividual = async (req, res) => {
  const { id } = req.body;

  try {
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ ok: false, msg: "Médico no encontrado en el CRM" });
    }

    if (doctor.correo_enviado) {
      return res.status(400).json({ ok: false, msg: "Este médico ya recibió el correo de invitación anteriormente" });
    }

    // 💡 Estrategia de calle: Definimos la narrativa comercial exacta según la propiedad 'ubicacion'
    let parrafoIntroductorio = '';
    const clinicaNormalizada = doctor.ubicacion ? doctor.ubicacion.toUpperCase() : '';

    if (clinicaNormalizada.includes('HCC') || clinicaNormalizada.includes('CARACAS')) {
      parrafoIntroductorio = `Tras mi reciente visita a las instalaciones del <strong>Hospital de Clínicas Caracas (HCC)</strong>, conversé con varios colegas sobre los flujos de tiempo y lo desgastante de la transcripción manual de las consultas.`;
    } else if (clinicaNormalizada.includes('RAZETTI')) {
      parrafoIntroductorio = `Con motivo de nuestra reciente visita a la <strong>Clínica Razetti</strong>, hemos extendido una invitation especial a los especialistas del centro médico para optimizar los flujos de tiempo en la transcripción de las consultas.`;
    } else {
      parrafoIntroductorio = `A raíz de nuestro reciente acercamiento a las consultas de la <strong>Clínica Briceño Rossi</strong>, queremos presentarle una solución diseñada para optimizar los flujos de tiempo y eliminar la transcripción manual en su práctica médica diaria.`;
    }

    const htmlFinal = generarPlantillaHtml(doctor.name || '', doctor.apellido || '', parrafoIntroductorio);

    const mailOptions = {
      from: 'malcolmc@klyntic.com',
      to: doctor.email_contacto || doctor.email,
      replyTo: "mercadocreativo@gmail.com",
      subject: `Doctor(a) ${doctor.name || ''}, optimice la gestión de su consultorio con nuestro Asistente de Voz 🎙️`,
      html: htmlFinal,
    };

    const info = await transporter.sendMail(mailOptions);

    // Actualizamos el pipeline comercial real del Doctor
    doctor.correo_sendit = true;
    doctor.estado_seguimiento = 'CORREO_ENVIADO';
    await doctor.save();

    return res.json({
      ok: true,
      msg: `Invitación enviada con éxito al Dr./Dra. ${doctor.name || ''}`,
      messageId: info.messageId
    });

  } catch (error) {
    console.error("Error en enviarCorreoIndividual:", error);
    return res.status(500).json({ ok: false, msg: "Error al procesar el envío individual desde el servidor" });
  }
};

/**
 * 4. ENVÍO MASIVO (BULK): Dispara en cadena el lote diario respetando la cuota de Mailjet (Max 200)
 */
const enviarCampañaMasivaDoctores = async (req, res) => {
  try {
    // 🎛️ CAPTURAMOS LOS CHECKS: Recibimos el array de IDs opcional enviado por Angular
    const { ids } = req.body; 

    // Definimos el criterio de búsqueda base e inteligente (evita correos vacíos)
    let query = { 
      correo_enviado: false,
      email: { $exists: true, $ne: "" } 
    };

    // 💡 SI EL USUARIO USÓ LOS CHECKS EN ANGULAR: 
    // Filtramos la consulta de MongoDB utilizando el operador $in con los IDs seleccionados
    if (ids && Array.isArray(ids) && ids.length > 0) {
      query._id = { $in: ids };
    }

    // Ejecutamos la búsqueda inyectando el populate de especialidad y el límite estricto de cuota de Mailjet
    const pendientes = await Doctor.find(query)
                                   .populate('speciality')
                                   .limit(200);

    if (pendientes.length === 0) {
      return res.status(200).json({ 
        ok: true, 
        msg: "No se encontraron médicos con correo electrónico pendientes para el lote seleccionado hoy." 
      });
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let exitos = 0;

    // Respondemos de inmediato para evitar timeouts en el cliente de Angular / HTTP
    res.status(200).json({
      ok: true,
      msg: `Campaña masiva iniciada en segundo plano para ${pendientes.length} médicos seleccionados.`,
    });

    // Bucle secuencial controlado de 4 segundos por correo para proteger tu reputación de dominio
    for (const doc of pendientes) {
      try {
        let parrafoIntroductorio = '';
        const clinicaNormalizada = doc.ubicacion ? doc.ubicacion.toUpperCase() : '';

        if (clinicaNormalizada.includes('HCC') || clinicaNormalizada.includes('CARACAS')) {
          parrafoIntroductorio = `Tras mi reciente visita a las instalaciones del <strong>Hospital de Clínicas Caracas (HCC)</strong>, conversé con varios colegas sobre los flujos de tiempo y lo desgastante de la transcripción manual de las consultas.`;
        } else if (clinicaNormalizada.includes('RAZETTI')) {
          parrafoIntroductorio = `Con motivo de nuestra reciente visita a la <strong>Clínica Razetti</strong>, hemos extendido una invitación especial a los especialistas del centro médico para optimizar los flujos de tiempo en la transcripción de las consultas.`;
        } else {
          parrafoIntroductorio = `A raíz de nuestro reciente acercamiento a las consultas de la <strong>Clínica Briceño Rossi</strong>, queremos presentarle una solución diseñada para optimizar los flujos de tiempo y eliminar la transcripción manual en su práctica médica diaria.`;
        }

        const htmlFinal = generarPlantillaHtml(doc.name || '', doc.apellido || '', parrafoIntroductorio);

        const mailOptions = {
          from: 'malcolmc@klyntic.com',
          to: doc.email_contacto,
          replyTo: "mercadocreativo@gmail.com",
          subject: `Doctor(a) ${doc.name || ''}, optimice la gestión de su consultorio con nuestro Asistente de Voz 🎙️`,
          html: htmlFinal,
        };

        await transporter.sendMail(mailOptions);

        // Actualizamos los campos operativos del pipeline en caliente
        doc.correo_sendit = true;
        doc.estado_seguimiento = 'CORREO_ENVIADO';
        await doc.save();

        exitos++;
        console.log(`[CRM BULK] Enviado al Dr./Dra. ${doc.name}`);
        
        await delay(4000); // 4 segundos de descanso humano simulado

      } catch (errSingle) {
        console.error(`[CRM BULK ERROR] Falló para ${doc.email}:`, errSingle.message);
      }
    }

    console.log(`[CRM BULK FINALIZADO] Proceso completo. Éxitos del lote: ${exitos}`);

  } catch (error) {
    console.error("Error crítico en enviarCampañaMasivaDoctores:", error);
  }
};


/**
 * 5. PLANTILLA: Función aislada con tu diseño original adaptado a las variables del modelo de Doctor
 */
function generarPlantillaHtml(name, apellido, parrafoIntroductorio) {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://w3.org">
<html xmlns="http://w3.org">
<head>
	<meta http-equiv="Content-type" content="text/html; charset=utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<link href="https://googleapis.com" rel="stylesheet" />
	<title>Simplifica tu consulta con Klyntic</title>
	<style type="text/css" media="screen">
		body { padding:0 !important; margin:0 auto !important; display:block !important; min-width:100% !important; width:100% !important; background:#f8fafc; -webkit-text-size-adjust:none }
		a { color:#6366f1; text-decoration:none }
		p { padding:0 !important; margin:0 !important } 
		img { margin: 0 !important; -ms-interpolation-mode: bicubic; }
		.btn-primary { background-color: #6366f1; color: #ffffff !important; padding: 12px 25px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; }
		.gradient { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); }
		@media only screen and (max-device-width: 480px), only screen and (max-width: 480px) {
			.mpx-10 { padding-left: 10px !important; padding-right: 10px !important; }
			.mpx-15 { padding-left: 15px !important; padding-right: 15px !important; }
			.td, .m-shell { width: 100% !important; min-width: 100% !important; }
		}
	</style>
</head>
<body class="body" style="padding:0 !important; margin:0 auto !important; display:block !important; min-width:100% !important; width:100% !important; background:#f8fafc;">
	<center>
		<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0; padding: 0; width: 100%; height: 100%;" bgcolor="#f8fafc">
			<tr>
				<td style="margin: 0; padding: 0; width: 100%; height: 100%;" align="center" valign="top">
					<table width="600" border="0" cellspacing="0" cellpadding="0" class="m-shell" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 30px; border: 1px solid #e2e8f0; border-collapse: separate;">
						<tr>
							<td class="td" style="font-size:0pt; line-height:0pt; padding:0; margin:0; font-weight:normal;">
								<table width="100%" border="0" cellspacing="0" cellpadding="0">
									<tr>
										<td>
											<!-- Header -->
											<table width="100%" border="0" cellspacing="0" cellpadding="0">
												<tr>
													<td class="gradient" style="padding: 35px 20px; text-align: center;">
														<div style="color: #ffffff; font-size: 26px; font-weight: bold; letter-spacing: 1px; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">KLYNTIC</div>
														<div style="color: #e0e7ff; font-size: 13px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Asistente de Voz Clínico</div>
													</td>
												</tr>
											</table>
											
											<!-- Main Content -->
											<table width="100%" border="0" cellspacing="0" cellpadding="0">
												<tr>
													<td style="padding: 40px 30px; background-color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
														<h1 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">Estimado(a) Dr(a). ${name},</h1>
														<p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Espero que se encuentre muy bien.</p>
														
														<!-- Inyección dinámica del párrafo comercial de calle (HCC, Razetti o Briceño Rossi) -->
														<p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">${parrafoIntroductorio}</p>
														
														<p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Quiero presentarle formalmente <strong>Klyntic</strong>, un ecosistema especializado que integra un potente asistente de voz para automatizar la gestión administrativa de su consultorio:</p>
														
														<!-- Bullet Box -->
														<div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #f1f5f9;">
															<div style="font-size: 14px; color: #334155; margin-bottom: 12px; position: relative; padding-left: 15px;">• <strong>Comandos de Voz:</strong> Cree pacientes, agilice historias y estructure presupuestos dictándole al sistema en tiempo real.</div>
															<div style="font-size: 14px; color: #334155; margin-bottom: 12px; position: relative; padding-left: 15px;">• <strong>Gestión de Citas:</strong> Automatice la atención y el control de su agenda de forma fluida.</div>
															<div style="font-size: 14px; color: #334155; position: relative; padding-left: 15px;">• <strong>Módulo Dental por Voz:</strong> Registro de odontogramas completos mediante comandos de voz estructurados si maneja el área dental.</div>
														</div>
														
														<p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Le invito a visitar nuestra web renovada para ver las demostraciones en video. Por formar parte del directorio de la clínica, tiene disponible un <strong>periodo de prueba de 7 días sin costo alguno</strong>.</p>
														
														<div style="text-align: center; margin: 30px 0 10px 0;">
															<a href="https://klyntic.com" target="_blank" class="btn-primary">Ver Demostraciones y Probar Gratis</a>
														</div>
													</td>
												</tr>
											</table>
											
											<!-- Footer -->
											<table width="100%" border="0" cellspacing="0" cellpadding="0">
												<tr>
													<td style="padding: 25px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
														<p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0; margin-bottom: 10px;">
															Toda la información médica y presupuestos almacenados son estrictamente confidenciales y de uso exclusivo del doctor o clínica titular.
														</p>
														<p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">© 2026 Klyntic. Todos los derechos reservados.</p>
													</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</center>
</body>
</html>
  `;
}

// Exportación formal de los 4 métodos unificados
module.exports = {
  obtenerDoctoresCRM,
  enviarCorreoIndividual,
  enviarCampañaMasivaDoctores
};

