import { Router } from "express";
import { authMiddleware } from "../middlewares";
import { getCurrentUser, loginUser, registerUser, sendOtp, verifyOtp, forgotPassword, resetPassword } from "../controllers";
import { otpRateLimitter } from "../middlewares/rate-limit.middleware";

const router = Router()

router.route('/current').get(authMiddleware, getCurrentUser)
router.route('/login').post(loginUser)
router.route('/register').post(registerUser)
router.route('/verify-otp').post(otpRateLimitter, verifyOtp)
router.route('/send-otp').post(otpRateLimitter, sendOtp)
router.route('/forgot-password').post(otpRateLimitter, forgotPassword)
router.route('/reset-password').post(otpRateLimitter, resetPassword)

export {router as userRouter}