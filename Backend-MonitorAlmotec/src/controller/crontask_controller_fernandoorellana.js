const db = require('../models/bd.fernando');

const getCronTasks = async (req, res) => {
    try {
        const [tareas] = await db.query(
            `SELECT 
                DATABASE() AS base_de_datos,
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

        return res.status(200).json({
            mensaje: "Consulta exitosa",
            tareas
        });
    } catch (error) {
        console.error('ERROR en getCronTasks:', error);
        return res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

module.exports = { getCronTasks };