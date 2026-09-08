const mysql = require('mysql2/promise');
const dbUsuarios = require('../models/db-usuarios');

const poolsCache = {};

const getPoolSistema = (sistema) => {
    if (poolsCache[sistema.id]) return poolsCache[sistema.id];

    const pool = mysql.createPool({
        host: sistema.host,
        user: sistema.usuario,
        password: sistema.password,
        database: sistema.base_datos,
        port: sistema.puerto || 3306,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        ssl: { rejectUnauthorized: false }
    });

    poolsCache[sistema.id] = pool;
    return pool;
};

const invalidarPoolSistema = (id) => {
    if (poolsCache[id]) {
        poolsCache[id].end().catch(() => {});
        delete poolsCache[id];
    }
};

const getSistemas = async (req, res) => {
    try {
        const [sistemas] = await dbUsuarios.query(
            `SELECT id, nombre, base_datos, orden FROM sistemas ORDER BY orden ASC, id ASC`
        );
        return res.status(200).json({ mensaje: "Consulta exitosa", sistemas });
    } catch (error) {
        console.error('ERROR en getSistemas:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

const crearSistema = async (req, res) => {
    try {
        const { nombre, host, usuario, password, base_datos, puerto, script_reset } = req.body;

        if (!nombre || !host || !usuario || !password || !base_datos) {
            return res.status(400).json({ mensaje: 'Faltan datos requeridos: nombre, host, usuario, password, base_datos' });
        }

        const [maxOrden] = await dbUsuarios.query(`SELECT COALESCE(MAX(orden), 0) AS maxOrden FROM sistemas`);
        const nuevoOrden = maxOrden[0].maxOrden + 1;

        await dbUsuarios.query(
            `INSERT INTO sistemas (nombre, host, usuario, password, base_datos, puerto, script_reset, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, host, usuario, password, base_datos, puerto || 3306, script_reset || null, nuevoOrden]
        );

        return res.status(201).json({ mensaje: 'Sistema agregado correctamente' });
    } catch (error) {
        console.error('ERROR en crearSistema:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

const obtenerSistemaCompleto = async (id) => {
    const [rows] = await dbUsuarios.query(`SELECT * FROM sistemas WHERE id = ?`, [id]);
    return rows[0] || null;
};

const actualizarSistema = async (req, res) => {
    try {
        const { id } = req.params;
        const existente = await obtenerSistemaCompleto(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Sistema no encontrado' });
        }

        const nombre = req.body.nombre ?? existente.nombre;
        const host = req.body.host ?? existente.host;
        const usuario = req.body.usuario ?? existente.usuario;
        const password = req.body.password ?? existente.password;
        const base_datos = req.body.base_datos ?? existente.base_datos;
        const puerto = req.body.puerto ?? existente.puerto;
        const orden = req.body.orden ?? existente.orden;
        const script_reset = req.body.script_reset ?? existente.script_reset;

        await dbUsuarios.query(
            `UPDATE sistemas SET nombre=?, host=?, usuario=?, password=?, base_datos=?, puerto=?, orden=?, script_reset=? WHERE id=?`,
            [nombre, host, usuario, password, base_datos, puerto, orden, script_reset, id]
        );

        // Las credenciales de conexion pudieron cambiar: invalidamos el pool para que se reconstruya
        invalidarPoolSistema(Number(id));

        return res.status(200).json({ mensaje: 'Sistema actualizado correctamente' });
    } catch (error) {
        console.error('ERROR en actualizarSistema:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

const eliminarSistema = async (req, res) => {
    try {
        const { id } = req.params;
        const [resultado] = await dbUsuarios.query(`DELETE FROM sistemas WHERE id = ?`, [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Sistema no encontrado' });
        }

        invalidarPoolSistema(Number(id));

        return res.status(200).json({ mensaje: 'Sistema eliminado correctamente' });
    } catch (error) {
        console.error('ERROR en eliminarSistema:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = {
    getSistemas,
    crearSistema,
    actualizarSistema,
    eliminarSistema,
    getPoolSistema,
    obtenerSistemaCompleto
};