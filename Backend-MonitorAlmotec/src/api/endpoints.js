const express=require("express")
const router=express.Router()
const logincontroller=require("../controller/login_controller")
const getCronTasks=require("../controller/crontask_controller_fernandoorellana")

router.post("/login",logincontroller.login)

router.get("/crontask/fernandoorellana",getCronTasks.getCronTasks)

module.exports=router