const mysql = require('mysql2/promise');

const dbUsuarios = require('../models/db-usuarios');

const poolsCache = {};

/**
 * Obtiene o crea el pool de conexión del sistema.
 */
const getPoolSistema = (sistema) => {
    if (poolsCache[sistema.id]) {
        return poolsCache[sistema.id];
    }

    const pool = mysql.createPool({
        host: sistema.host,
        user: sistema.usuario,
        password: sistema.password,
        database: sistema.base_datos,
        port: sistema.puerto || 3306,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        ssl: {
            rejectUnauthorized: false
        }
    });

    poolsCache[sistema.id] = pool;

    return pool;
};

/**
 * Invalida el pool cuando cambian las credenciales
 * o cuando se elimina un sistema.
 */
const invalidarPoolSistema = (id) => {
    if (poolsCache[id]) {
        poolsCache[id].end().catch(() => {});
        delete poolsCache[id];
    }
};

/**
 * Obtiene todos los sistemas ordenados por prioridad.
 */
const getSistemas = async (req, res) => {
    try {
        const [sistemas] = await dbUsuarios.query(`
            SELECT
                id,
                nombre,
                host,
                usuario,
                password,
                base_datos,
                puerto,
                orden,
                script_reset
            FROM sistemas
            ORDER BY orden ASC, id ASC
        `);

        return res.status(200).json({
            mensaje: "Consulta exitosa",
            sistemas
        });

    } catch (error) {
        console.error('ERROR en getSistemas:', error);

        return res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

/**
 * Obtiene un sistema completo por ID.
 * Esta función se utiliza internamente por actualizarSistema.
 */
const obtenerSistemaPorId = async (id) => {
    const [rows] = await dbUsuarios.query(
        `SELECT * FROM sistemas WHERE id = ?`,
        [id]
    );

    return rows[0] || null;
};

/**
 * Endpoint para obtener todos los datos de un sistema.
 * Se utiliza principalmente para la edición.
 */
const obtenerSistemaCompleto = async (req, res) => {
    try {
        const { id } = req.params;

        const sistema = await obtenerSistemaPorId(id);

        if (!sistema) {
            return res.status(404).json({
                mensaje: 'Sistema no encontrado'
            });
        }

        return res.status(200).json({
            mensaje: 'Consulta exitosa',
            sistema
        });

    } catch (error) {
        console.error('ERROR en obtenerSistemaCompleto:', error);

        return res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

/**
 * Crea un nuevo sistema.
 * La prioridad se asigna automáticamente al final de la lista.
 */
const crearSistema = async (req, res) => {
    try {
        const {
            nombre,
            host,
            usuario,
            password,
            base_datos,
            puerto,
            script_reset
        } = req.body;

        if (!nombre || !host || !usuario || !password || !base_datos) {
            return res.status(400).json({
                mensaje: 'Faltan datos requeridos: nombre, host, usuario, password, base_datos'
            });
        }

        const [maxOrden] = await dbUsuarios.query(`
            SELECT COALESCE(MAX(orden), 0) AS maxOrden
            FROM sistemas
        `);

        const nuevoOrden = Number(maxOrden[0].maxOrden) + 1;

        await dbUsuarios.query(
            `
            INSERT INTO sistemas
            (
                nombre,
                host,
                usuario,
                password,
                base_datos,
                puerto,
                script_reset,
                orden
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                nombre,
                host,
                usuario,
                password,
                base_datos,
                puerto || 3306,
                script_reset || null,
                nuevoOrden
            ]
        );

        return res.status(201).json({
            mensaje: 'Sistema agregado correctamente'
        });

    } catch (error) {
        console.error('ERROR en crearSistema:', error);

        return res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

/**
 * Actualiza un sistema.
 */
const actualizarSistema = async (req, res) => {
    try {
        const { id } = req.params;

        const existente = await obtenerSistemaPorId(id);

        if (!existente) {
            return res.status(404).json({
                mensaje: 'Sistema no encontrado'
            });
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
            `
            UPDATE sistemas
            SET
                nombre = ?,
                host = ?,
                usuario = ?,
                password = ?,
                base_datos = ?,
                puerto = ?,
                orden = ?,
                script_reset = ?
            WHERE id = ?
            `,
            [
                nombre,
                host,
                usuario,
                password,
                base_datos,
                puerto,
                orden,
                script_reset,
                id
            ]
        );

        // Las credenciales de conexión pudieron cambiar,
        // por lo que reconstruimos el pool.
        invalidarPoolSistema(Number(id));

        return res.status(200).json({
            mensaje: 'Sistema actualizado correctamente'
        });

    } catch (error) {
        console.error('ERROR en actualizarSistema:', error);

        return res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

/**
 * Elimina un sistema.
 */
const eliminarSistema = async (req, res) => {
    try {
        const { id } = req.params;

        const [resultado] = await dbUsuarios.query(
            `DELETE FROM sistemas WHERE id = ?`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'Sistema no encontrado'
            });
        }

        invalidarPoolSistema(Number(id));

        return res.status(200).json({
            mensaje: 'Sistema eliminado correctamente'
        });

    } catch (error) {
        console.error('ERROR en eliminarSistema:', error);

        return res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

/**
 * Mueve un sistema hacia arriba o hacia abajo
 * y vuelve a numerar todas las prioridades.
 *
 * direccion:
 * - "arriba"
 * - "abajo"
 */
const moverSistema = async (req, res) => {
    try {
        const { id } = req.params;
        const { direccion } = req.body;

        if (direccion !== "arriba" && direccion !== "abajo") {
            return res.status(400).json({
                mensaje: 'La dirección debe ser "arriba" o "abajo"'
            });
        }

        const [sistemas] = await dbUsuarios.query(`
            SELECT id, orden
            FROM sistemas
            ORDER BY orden ASC, id ASC
        `);

        const indiceActual = sistemas.findIndex(
            (sistema) => Number(sistema.id) === Number(id)
        );

        if (indiceActual === -1) {
            return res.status(404).json({
                mensaje: "Sistema no encontrado"
            });
        }

        const nuevoIndice =
            direccion === "arriba"
                ? indiceActual - 1
                : indiceActual + 1;

        // Ya está en la primera posición
        if (nuevoIndice < 0) {
            return res.status(200).json({
                mensaje: "El sistema ya está en la primera posición"
            });
        }

        // Ya está en la última posición
        if (nuevoIndice >= sistemas.length) {
            return res.status(200).json({
                mensaje: "El sistema ya está en la última posición"
            });
        }

        // Quitamos el sistema de su posición actual.
        const [sistemaMovido] = sistemas.splice(indiceActual, 1);

        // Lo colocamos en la nueva posición.
        sistemas.splice(nuevoIndice, 0, sistemaMovido);

        // Reasignamos todas las prioridades:
        // 1, 2, 3, 4, 5...
        for (let i = 0; i < sistemas.length; i++) {
            await dbUsuarios.query(
                `UPDATE sistemas SET orden = ? WHERE id = ?`,
                [
                    i + 1,
                    sistemas[i].id
                ]
            );
        }

        return res.status(200).json({
            mensaje: "Orden actualizado correctamente"
        });

    } catch (error) {
        console.error("ERROR en moverSistema:", error);

        return res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
};

module.exports = {
    getSistemas,
    crearSistema,
    obtenerSistemaCompleto,
    actualizarSistema,
    eliminarSistema,
    getPoolSistema,
    moverSistema
};