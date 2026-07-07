const { response } = require('express');
const Payment = require('../models/payment');

const getPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .sort({ createdAt: -1 })
            .populate('cliente')
        payments.sort((a, b) => b.createdAt - a.createdAt);


        res.json({
            ok: true,
            payments
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error al obtener payments' });
    }
};

const getPaymentsByUser = async (req, res) => {
    const userId = req.params.id; // El ID del vendedor/admin que queremos consultar
    try {
        // Buscamos pagos donde este usuario aparezca en la repartición
        const payments = await Payment.find({
            $or: [
                { "reparticion.vendedor.id": userId },
                { "reparticion.admin.id": userId },
                { "reparticion.ceo.id": userId }
            ]
        }).populate('cliente', 'nombre email');

        res.json({ ok: true, payments });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al obtener reportes' });
    }
};

const createPayment = async (req, res) => {
    try {
        // Desestructuramos lo que viene de Angular
        const { 
            amount, 
            cliente, 
            tipo_pago, 
            referencia, 
            vendedorId, 
            adminId, 
            ceoId,
            metodo_pago,
            bank_destino,
            fecha_verificacion
        } = req.body;

        // Validación de seguridad: que los IDs no vengan vacíos
        if (!vendedorId || !adminId || !ceoId) {
            return res.status(400).json({ 
                ok: false, 
                msg: 'Faltan los IDs de los asociados para la repartición' 
            });
        }

        const cuota = Number(amount) / 3;

        const payment = new Payment({
            cliente,
            amount: Number(amount),
            tipo_pago,
            referencia,
            metodo_pago,
            bank_destino,
            fecha_verificacion,
            // Guardamos la repartición estructurada
            reparticion: {
                vendedor: { id: vendedorId, monto: cuota },
                admin: { id: adminId, monto: cuota },
                ceo: { id: ceoId, monto: cuota }
            },
            usuario: req.uid // El admin que está operando el sistema
        });

        const paymentDB = await payment.save();

        res.json({
            ok: true,
            payment: paymentDB
        });

    } catch (error) {
        console.error(error); // Revisa la consola de Node para ver el error exacto
        res.status(500).json({
            ok: false,
            msg: 'Error interno en el servidor, revise los logs'
        });
    }
};

const getPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('cliente')
            .populate({
                path: 'reparticion.vendedor.id',
                select: 'username',
                model: 'Usuario'
            })
            .populate({
                path: 'reparticion.admin.id', 
                select: 'username',
                model: 'Usuario'
            })
            .populate({
                path: 'reparticion.ceo.id',
                select: 'username', 
                model: 'Usuario'
            })

        if (!payment) return res.status(404).json({ msg: 'payment not found' })
        res.json({
            ok: true,
            payment
        });

    } catch (error) {
        return res.status(404).json({ msg: 'payment not found' })
    }
};
const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByIdAndDelete(req.params.id)
        if (!payment) return res.status(404).json({ msg: 'payment not found' })
        return res.sendStatus(204);
    } catch (error) {
        return res.status(404).json({ msg: 'payment not found' })
    }
};
const updatePayment = async (req, res) => {
    const id = req.params.id;
    try {
        const { amount, vendedorId, adminId, ceoId, ...rest } = req.body;
        
        let updateData = { ...rest };

        // Si se envió un nuevo monto, recalculamos la repartición
        if (amount) {
            const cuota = Number(amount) / 3;
            updateData.amount = Number(amount);
            updateData.reparticion = {
                vendedor: { id: vendedorId, monto: cuota },
                admin: { id: adminId, monto: cuota },
                ceo: { id: ceoId, monto: cuota }
            };
        }

        const payment = await Payment.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!payment) return res.status(404).json({ ok: false, msg: 'Pago no encontrado' });
        
        res.json({ ok: true, payment });
    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al actualizar' });
    }
};

const updateStatus = async (req, res) => {
    const id = req.params.id;
    try {
        // Usamos async/await en lugar de callbacks (más moderno y limpio)
        const payment_data = await Payment.findByIdAndUpdate(
            id,
            { status: true, updatedAt: Date.now() },
            { new: true }
        );

        if (!payment_data) {
            return res.status(404).json({ ok: false, msg: 'No se encontró el pago' });
        }

        res.status(200).json({ ok: true, payment: payment_data });
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar estado' });
    }
};

const getMonthlyReport = async (req, res) => {
    try {
        // 1. Forzar la conversión a Números (Importante)
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);

        if (isNaN(month) || isNaN(year)) {
            return res.status(400).json({ ok: false, msg: "Mes y año son requeridos como números" });
        }

        // 2. Crear fechas de inicio y fin exactas
        const startDate = new Date(year, month - 1, 1, 0, 0, 0); // Día 1 a las 00:00:00
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Último día a las 23:59:59

        const report = await Payment.aggregate([
            {
                $match: {
                    // status: true, // ¡OJO! Verifica si en tu BD es "true" (booleano) o "COMPLETED" (string)
                    createdAt: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalVendedores: { $sum: "$reparticion.vendedor.monto" },
                    totalAdmins: { $sum: "$reparticion.admin.monto" },
                    totalCEOs: { $sum: "$reparticion.ceo.monto" },
                    granTotal: { $sum: "$amount" },
                    cantidadPagos: { $sum: 1 }
                }
            }
        ]);

        if (report.length === 0) {
            return res.json({ 
                ok: true, 
                msg: "No hay pagos confirmados en este periodo", 
                rango: { startDate, endDate }, // Para que debuguees qué fechas está buscando
                report: { totalVendedores: 0, totalAdmins: 0, totalCEOs: 0, granTotal: 0, cantidadPagos: 0 } 
            });
        }

        res.json({
            ok: true,
            periodo: `${month}-${year}`,
            report: report[0]
        });

    } catch (error) {
        console.error(error); // Siempre loguea el error para saber qué falló
        res.status(500).json({ ok: false, msg: 'Error al generar el cierre' });
    }
};



module.exports = {
    createPayment,
    getPayment,
    getPayments,
    updatePayment,
    deletePayment,
    getPaymentsByUser,
    updateStatus,
    getMonthlyReport


};