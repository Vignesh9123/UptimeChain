import { Router } from "express";
import { deactivateValidator, getValidator, getValidatorDashboard, getValidatorsByRegion, registerValidatorPubkey, registerValidatorRegion, stakeValidator } from "../controllers";
import { authMiddleware } from "../middlewares";
const router = Router()
router.post('/register-pubkey',authMiddleware, registerValidatorPubkey)
router.post('/register-region', registerValidatorRegion)
router.get('/get-by-region', getValidatorsByRegion)
router.post('/stake',authMiddleware, stakeValidator)
router.post('/deactivate', authMiddleware, deactivateValidator)
router.get('/get-validator',authMiddleware, getValidator)
router.get('/dashboard', authMiddleware, getValidatorDashboard)
export {router as validatorRouter}