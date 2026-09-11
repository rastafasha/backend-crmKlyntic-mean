const nodemailer = require('nodemailer');
const Doctor = require('../models/doctor');
const axios = require('axios');

// Mapeamos las variables actuales de Render a la configuración de la API de Mailjet
const MAILJET_API_KEY = process.env.SMTP_USER;  // Render leerá tu SMTP_USER como la API Key
const MAILJET_SECRET_KEY = process.env.SMTP_PASS; // Render leerá tu SMTP_PASS como el Secret Key


// Inicializar el transportador SMTP con las variables de Mailjet (.env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'in-v3.mailjet.com',
  port: 465, // Puerto SSL directo estándar
  secure: true, // TRUE porque estamos usando el puerto 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Configuraciones de optimización de red para la nube
  connectionTimeout: 15000, // 15 segundos de tolerancia para conectar
  greetingTimeout: 10000,   // 10 segundos de tolerancia para el saludo SMTP
  socketTimeout: 20000,     // 20 segundos de tolerancia de actividad
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
      query.correo_sendit = enviado === true;
    }

    // 🚀 EJECUCIÓN EN PARALELO (Promise.all):
    // Hacemos la búsqueda paginada y la cuenta total del universo al mismo tiempo.
    const [doctors, totalReal] = await Promise.all([
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

    if (doctor.correo_sendit) {
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

    const htmlFinal = generarPlantillaHtml(doctor.name || doctor.nombre || '', doctor.apellido || '', parrafoIntroductorio);

    // NUEVO: Definimos las variables necesarias para la API HTTP de Mailjet
    const targetEmail = doctor.email_contacto || doctor.email;
    const subjectLine = `Doctor(a) ${doctor.name || doctor.nombre || ''}, optimice la gestión de su consultorio con nuestro Asistente de Voz 🎙️`;

    // NUEVO: Reemplazamos transporter.sendMail por la llamada a la API HTTP
    const infoApi = await enviarCorreoViaAPI(targetEmail, doctor.name || doctor.nombre || 'Doctor', subjectLine, htmlFinal);

    // Actualizamos el pipeline comercial real del Doctor
    doctor.correo_sendit = true;
    doctor.estado_seguimiento = 'CORREO_ENVIADO';
    await doctor.save();

    return res.json({
      ok: true,
      msg: `Invitación enviada con éxito al Dr./Dra. ${doctor.name || doctor.nombre || ''}`,
      info: infoApi // Retornamos la respuesta de Mailjet
    });

  } catch (error) {
    console.error("Error en enviarCorreoIndividual mediante API:", error.response ? error.response.data : error.message);
    return res.status(500).json({ ok: false, msg: "Error al procesar el envío individual desde la API de Mailjet" });
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
      correo_sendit: false,
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

    // Bucle secuencial controlado de 2 segundos por correo utilizando la API HTTP
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

        const htmlFinal = generarPlantillaHtml(doc.name ||  doc.nombre || '', doc.apellido || '', parrafoIntroductorio);

        // NUEVO: Definición de variables limpias para la llamada HTTP
        const targetEmail = doc.email_contacto || doc.email;
        const subjectLine = `Doctor(a) ${doc.name || doc.nombre || ''}, optimice la gestión de su consultorio con nuestro Asistente de Voz 🎙️`;

        // NUEVO: Llamada directa a la API en vez del transportador SMTP viejo
        await enviarCorreoViaAPI(targetEmail, doc.name || doc.nombre || 'Doctor', subjectLine, htmlFinal);

        // Actualizamos los campos operativos del pipeline en caliente
        doc.correo_sendit = true; // Aseguramos marcarlo como enviado para que salga de la cola
        doc.estado_seguimiento = 'CORREO_ENVIADO';
        await doc.save();
        
        exitos++;
        console.log(`[CRM BULK API] Enviado con éxito al Dr./Dra. ${doc.name || doc.nombre || ''}`);

        await delay(2000); // 2 segundos de descanso óptimo entre envíos web

      } catch (errSingle) {
        console.error(`[CRM BULK API ERROR] Falló para ${doc.email}:`, errSingle.message);
      }
    }

    console.log(`[CRM BULK API FINALIZADO] Proceso completo. Éxitos del lote: ${exitos}`);

  } catch (error) {
    console.error("Error crítico en enviarCampañaMasivaDoctores API:", error);
  }
};



/**
 * 5. PLANTILLA: Función aislada con tu diseño original adaptado a las variables del modelo de Doctor
 */
function generarPlantillaHtml(name, nombre, apellido, parrafoIntroductorio) {
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
                      <!-- Cabecera con Logotipo Oficial -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
                        <tr>
                          <td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
                            <a href="https://klyntic.com" target="_blank" style="text-decoration: none; display: inline-block;">
                              <img src="https://consultorio.klyntic.com/assets/img/logoklyntic.png" width="130" height="auto" border="0" alt="Klyntic" style="display: block; font-family: sans-serif; font-size: 20px; color: #6366f1; font-weight: bold;" />
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Main Content -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 40px 30px; background-color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                            <h1 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">Estimado(a) Dr(a). ${name || nombre},</h1>
                            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">Espero que se encuentre muy bien.</p>
                            
                            <!-- Párrafo de autoridad basado en el HCC y testimonios reales -->
                            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                              Le escribo porque actualmente estamos expandiendo el uso de <strong>Klyntic</strong>, un ecosistema de Inteligencia Artificial que ya opera con éxito en consulta real y está siendo utilizado por especialistas en el <strong>Anexo del Hospital de Clínicas Caracas (HCC)</strong> para eliminar por completo la transcripción manual de las consultas.
                            </p>
                            
                            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                              Diseñamos esta solución específicamente para automatizar la gestión administrativa y clínica de su consultorio mediante un potente asistente de voz, permitiéndole enfocarse al 100% en el paciente sin tocar el teclado:
                            </p>
                            
                            <!-- Bullet Box Estructurado para Gmail -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 25px; border: 1px solid #f1f5f9;">
                              <tr>
                                <td style="padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                  <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 12px;">
                                    • <strong>Comandos de Voz:</strong> Cree pacientes, agilice historias y estructure presupuestos dictándole al sistema en tiempo real.
                                  </div>
                                  <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 12px;">
                                    • <strong>Gestión de Citas por WhatsApp:</strong> Automatice la atención de la agenda y reduzca drásticamente las inasistencias de pacientes.
                                  </div>
                                  <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 0;">
                                    • <strong>Módulo Dental/Estético por Voz:</strong> Registro de planes de tratamiento y odontogramas completos mediante comandos de voz estructurados.
                                  </div>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
                              Le invito a visitar nuestra web para conocer los testimonios de sus colegas y ver las demostraciones en video. Esta semana estamos habilitando únicamente <strong>5 accesos de cortesía en el sector con un periodo de prueba de 7 días sin costo alguno</strong>.
                            </p>
                            
                            <div style="text-align: center; margin: 30px 0 10px 0;">
                              <a href="https://klyntic.com" target="_blank" class="btn-primary">Ver Testimonios y Probar Gratis</a>
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






/**
 * Función auxiliar para enviar correos usando la API HTTP de Mailjet
 */
async function enviarCorreoViaAPI(toEmail, toName, subject, htmlBody) {
  const url = 'https://api.mailjet.com/v3.1/send';

  // Codificamos las credenciales de forma segura para la petición web
  const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');

  const data = {
    Messages: [
      {
        From: {
          Email: "malcolmc@klyntic.com",
          Name: "Klyntic"
        },
        To: [
          {
            Email: toEmail,
            Name: toName
          }
        ],
        ReplyTo: {
          Email: "mercadocreativo@gmail.com",
          Name: "Soporte Klyntic"
        },
        Subject: subject,
        HTMLPart: htmlBody
      }
    ]
  };

  const response = await axios.post(url, data, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  return response.data;
}


// Exportación formal de los 4 métodos unificados
module.exports = {
  obtenerDoctoresCRM,
  enviarCorreoIndividual,
  enviarCampañaMasivaDoctores
};

