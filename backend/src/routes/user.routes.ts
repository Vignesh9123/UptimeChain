import { Router } from "express";
import { authMiddleware } from "../middlewares";
import { getCurrentUser } from "../controllers";

const router = Router()

router.route('/current').get(authMiddleware, getCurrentUser)

export {router as userRouter}