const express=require("express")
const router=express.Router()
const logincontroller=require("../controller/login_controller")
const sistemascontroller=require("../controller/sistemas_controller")
const crontasksistemacontroller=require("../controller/crontask_sistema_controller")
const resetcontroller=require("../controller/reset_controller")

router.post("/login",logincontroller.login)

router.get("/sistemas",sistemascontroller.getSistemas)
router.post("/sistemas",sistemascontroller.crearSistema)
router.get("/sistemas/:id/crontask",crontasksistemacontroller.getCronTaskPorSistema)
router.patch("/sistemas/:id/crontask/:taskId",crontasksistemacontroller.actualizarStatusCronTask)
router.post("/sistemas/:id/reset",resetcontroller.ejecutarReset)

module.exports=router