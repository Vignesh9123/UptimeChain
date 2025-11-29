import { Router } from "express";
import { authMiddleware } from "../middlewares";
import { getCurrentUser, loginUser, registerUser } from "../controllers";

const router = Router()

router.route('/current').get(authMiddleware, getCurrentUser)
router.route('/login').post(loginUser)
router.route('/register').post(registerUser)

export {router as userRouter}