import { Router } from "express";
import { authMiddleware } from "../middlewares";
import { verifyAmountAddedToWallet } from "../controllers";

const router = Router()
router.post('/verify-amount',authMiddleware, verifyAmountAddedToWallet)

export {router as clientRouter}