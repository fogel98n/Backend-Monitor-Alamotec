const { execFile } = require('child_process');
const dbUsuarios = require('../models/db-usuarios');

const ejecutarReset = async (req, res) => {
    try {
        const { id } = req.params;

        const [sistemasRows] = await dbUsuarios.query(
            `SELECT id, nombre, script_reset FROM sistemas WHERE id = ?`,
            [id]
        );
        if (sistemasRows.length === 0) {
            return res.status(404).json({ mensaje: 'Sistema no encontrado' });
        }

        const sistema = sistemasRows[0];
        if (!sistema.script_reset) {
            return res.status(400).json({ mensaje: 'Este sistema no tiene un script de reset configurado' });
        }

        execFile('sh', [sistema.script_reset], (error, stdout, stderr) => {
            if (error) {
                console.error(`ERROR ejecutando reset de ${sistema.nombre}:`, error);
                return res.status(500).json({ mensaje: 'Error al ejecutar el reset', detalle: stderr || error.message });
            }
            return res.status(200).json({ mensaje: `Reset ejecutado correctamente en ${sistema.nombre}` });
        });
    } catch (error) {
        console.error('ERROR en ejecutarReset:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { ejecutarReset };