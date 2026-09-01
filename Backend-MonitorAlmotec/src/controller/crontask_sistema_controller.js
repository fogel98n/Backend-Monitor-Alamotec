const dbUsuarios = require('../models/db-usuarios');
const { getPoolSistema } = require('./sistemas_controller');
const { enviarAlertaCronCaido } = require('../utils/mailer');

const getCronTaskPorSistema = async (req, res) => {
    try {
        const { id } = req.params;

        const [sistemasRows] = await dbUsuarios.query(
            `SELECT id, nombre, host, usuario, password, base_datos, puerto FROM sistemas WHERE id = ?`,
            [id]
        );
        if (sistemasRows.length === 0) {
            return res.status(404).json({ mensaje: 'Sistema no encontrado' });
        }
        const sistema = sistemasRows[0];
        const pool = getPoolSistema(sistema);

        const [tareas] = await pool.query(
            `SELECT
                id,
                name,
                status,
                frequency,
                FROM_UNIXTIME(laststart) AS laststart,
                FROM_UNIXTIME(lastend) AS lastend,
                CASE
                    WHEN laststart IS NOT NULL AND lastend IS NOT NULL
                    THEN (lastend - laststart)
                    ELSE NULL
                END AS duracion_segundos
             FROM vtiger_cron_task
             WHERE name IN ('Workflow', 'ScheduleReports')`
        );

        const caidos = tareas.filter(t => t.status === 2);
        if (caidos.length > 0) {
            enviarAlertaCronCaido(sistema.nombre, caidos).catch(err =>
                console.error('Error enviando correo de alerta:', err)
            );
        }

        return res.status(200).json({
            mensaje: 'Consulta exitosa',
            sistema: sistema.nombre,
            baseDeDatos: sistema.base_datos,
            tareas
        });
    } catch (error) {
        console.error('ERROR en getCronTaskPorSistema:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

const actualizarStatusCronTask = async (req, res) => {
    try {
        const { id, taskId } = req.params;
        const { status } = req.body;

        if (![0, 1].includes(status)) {
            return res.status(400).json({ mensaje: 'El status debe ser 0 (desactivar) o 1 (activar)' });
        }

        const [sistemasRows] = await dbUsuarios.query(
            `SELECT id, host, usuario, password, base_datos, puerto FROM sistemas WHERE id = ?`,
            [id]
        );
        if (sistemasRows.length === 0) {
            return res.status(404).json({ mensaje: 'Sistema no encontrado' });
        }
        const pool = getPoolSistema(sistemasRows[0]);

        await pool.query(
            `UPDATE vtiger_cron_task SET status = ? WHERE id = ?`,
            [status, taskId]
        );

        return res.status(200).json({ mensaje: 'Status actualizado correctamente' });
    } catch (error) {
        console.error('ERROR en actualizarStatusCronTask:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { getCronTaskPorSistema, actualizarStatusCronTask };