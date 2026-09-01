const mysql = require('mysql2/promise');
const dbUsuarios = require('../models/db-usuarios');

// Cache de pools por sistema, para no crear una conexion nueva en cada request
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

const getSistemas = async (req, res) => {
    try {
        const [sistemas] = await dbUsuarios.query(
            `SELECT id, nombre, base_datos FROM sistemas`
        );
        return res.status(200).json({ mensaje: "Consulta exitosa", sistemas });
    } catch (error) {
        console.error('ERROR en getSistemas:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

const crearSistema = async (req, res) => {
    try {
        const { nombre, host, usuario, password, base_datos, puerto } = req.body;

        if (!nombre || !host || !usuario || !password || !base_datos) {
            return res.status(400).json({ mensaje: 'Faltan datos requeridos: nombre, host, usuario, password, base_datos' });
        }

        await dbUsuarios.query(
            `INSERT INTO sistemas (nombre, host, usuario, password, base_datos, puerto) VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, host, usuario, password, base_datos, puerto || 3306]
        );

        return res.status(201).json({ mensaje: 'Sistema agregado correctamente' });
    } catch (error) {
        console.error('ERROR en crearSistema:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { getSistemas, crearSistema, getPoolSistema };