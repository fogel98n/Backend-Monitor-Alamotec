require('dotenv').config();
const express=require('express')
const cors=require('cors')
const routes=require("./api/endpoints")
const app= express()
const PORT=3000;

process.on('uncaughtException', (err) => {
    console.error('uncaughtException (el proceso sigue vivo):', err);
});

process.on('unhandledRejection', (err) => {
    console.error('unhandledRejection (el proceso sigue vivo):', err);
});

app.use(cors({
    origin:['https://monitor.alamotec.com.gt'],methods:["GET","POST","PUT","DELETE","PATCH"],allowedHeaders:["Content-Type"]
}))

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use("/",routes)

app.listen(PORT,()=>{
    console.log(`servidor correindo en el puerto ${PORT}`)
})