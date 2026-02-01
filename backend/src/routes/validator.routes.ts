import { Router } from "express";
import { registerValidator, stakeValidator } from "../controllers/validator.controller";
const router = Router()
router.post('/register', registerValidator)
router.post('/stake', stakeValidator)
export {router as validatorRouter}