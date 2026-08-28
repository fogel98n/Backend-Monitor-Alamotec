const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: "db.alamoguate.com",
    user: "alamotec",
    password: "Al@moTec26",
    database: "monitor_alamotec",
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.getConnection()
    .then(connection => {
        console.log('✅ Conexión a MySQL exitosa');
        connection.release();
    })
    .catch(error => {
        console.error('❌ Error conectando a MySQL:', error);
    });

module.exports = pool;