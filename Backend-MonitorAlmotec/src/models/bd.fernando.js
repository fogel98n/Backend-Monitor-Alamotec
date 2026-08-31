const mysql=require('mysql2/promise')

const pool=mysql.createPool({
    host:"db.alamotec.com.gt",
    user:"orellana",
    password:"Al@moTec26",
    database:"fernanadoorellana",
    port:3306,
    waitForConnections:true,
    connectionLimit:10,
    queueLimit:0,
    ssl:{rejectUnauthorized:false}
})

pool.getConnection().then(connection=>{
    console.log('conexion exitosa')
    connection.release()
})
.catch(error=>{
    console.error('Error conectando a MYSQL:',error)
})
module.exports=pool