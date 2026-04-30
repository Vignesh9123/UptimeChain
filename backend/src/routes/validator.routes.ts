import { Router } from "express";
import { getValidator, getValidatorsByRegion, registerValidatorPubkey, registerValidatorRegion, stakeValidator } from "../controllers";
import { authMiddleware } from "../middlewares";
const router = Router()
router.post('/register-pubkey',authMiddleware, registerValidatorPubkey)
router.post('/register-region', registerValidatorRegion)
router.get('/get-by-region', getValidatorsByRegion)
router.post('/stake',authMiddleware, stakeValidator)
router.get('/get-validator',authMiddleware, getValidator)
export {router as validatorRouter}