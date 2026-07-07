const fs = require('fs');
const Doctor = require('../models/doctor');

// 🛠️ SE AGREGA 'campoDestino' como parámetro opcional al final
const actualizarImagen = async (tipo, id, nombreArchivo, campoDestino = null) => {

    let pathViejo = '';

    switch (tipo) {

        case 'doctors':
            const doctor = await Doctor.findById(id);
            if (!doctor) {
                console.log('No es un doctors por id');
                return false;
            }
            pathViejo = `./uploads/doctors/${doctor.img}`;
            borrarImagen(pathViejo);
            doctor.img = nombreArchivo;
            await doctor.save();
            return true;
            break;

            const transferencia = await Transferencia.findById(id);
            if (!transferencia) {
                console.log('No es un transferencia por id');
                return false;
            }
            if (transferencia.img) {
                pathViejo = `./uploads/transferencias/${transferencia.img}`; // Corregido typo de variable 'driver'
                borrarImagen(pathViejo);
            }
            transferencia.img = nombreArchivo;
            await transferencia.save();
            return true;
            break;
    }
};

const borrarImagen = (path) => {
    if (fs.existsSync(path)) {
        // borrar la imagen anterior si usas almacenamiento local
        fs.unlinkSync(path);
    }
}
module.exports = {
    actualizarImagen,
    borrarImagen
};
