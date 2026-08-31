const express=require('express')
const cors=require('cors')
const routes=require("./api/endpoints")
const app= express()
const PORT=3000;

app.use(cors({
    origin:['https://monitor.alamotec.com.gt','http://localhost:5173'],methods:["GET","POST","PUT","DELETE"],allowedHeaders:["Content-Type"]
}))

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use("/api",routes)

app.listen(PORT,()=>{
    console.log(`servidor correindo en el puerto ${PORT}`)
})