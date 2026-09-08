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

        try {
            const pool = getPoolSistema(sistema);

            const [tareas] = await pool.query(
                ` SELECT
        id,
        name,
        status,
        frequency,
        FROM_UNIXTIME(laststart) AS laststart,
        FROM_UNIXTIME(lastend) AS lastend,
        CASE
            WHEN laststart IS NOT NULL
                 AND lastend IS NOT NULL
            THEN CAST(lastend AS SIGNED) - CAST(laststart AS SIGNED)
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
        } catch (dbError) {
            // Este sistema en particular no responde: lo reportamos SIN tronar el resto
            console.error(`ERROR conectando al sistema ${sistema.nombre}:`, dbError.message);
            return res.status(200).json({
                mensaje: 'Error de conexion en este sistema',
                sistema: sistema.nombre,
                baseDeDatos: sistema.base_datos,
                tareas: [],
                error: dbError.sqlMessage || dbError.message || 'No se pudo conectar a la base de datos'
            });
        }
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

const resetTimestampCronTask = async (req, res) => {
    try {
        const { id, taskId } = req.params;

        const [sistemasRows] = await dbUsuarios.query(
            `SELECT id, host, usuario, password, base_datos, puerto FROM sistemas WHERE id = ?`,
            [id]
        );
        if (sistemasRows.length === 0) {
            return res.status(404).json({ mensaje: 'Sistema no encontrado' });
        }
        const pool = getPoolSistema(sistemasRows[0]);

        await pool.query(
            `UPDATE vtiger_cron_task SET laststart = 0, lastend = 0 WHERE id = ?`,
            [taskId]
        );

        return res.status(200).json({ mensaje: 'Timestamp reiniciado correctamente' });
    } catch (error) {
        console.error('ERROR en resetTimestampCronTask:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { getCronTaskPorSistema, actualizarStatusCronTask, resetTimestampCronTask };