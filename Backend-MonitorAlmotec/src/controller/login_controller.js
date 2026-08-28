const db = require('../models/db-usuarios.js');

const login = async (req, res) => {
    try {
        const { correo, password } = req.body;
        if (!correo || !password) {
            return res.status(400).json({
                mensaje: "Correo y contraseña son obligatorios"
            });
        }

        const [usuarios] = await db.query(
            'SELECT id, correo, password FROM usuarios WHERE correo = ? LIMIT 1',
            [correo]
        );
        if (usuarios.length === 0) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        const usuario = usuarios[0];
        if (password !== usuario.password) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });
        }
        return res.status(200).json({
            mensaje: "Login exitoso",
            usuario: {
                id: usuario.id,
                correo: usuario.correo
            }
        });
    } catch (error) {
        console.error('ERROR en login:', error);
        return res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

module.exports = {login};

