import type { Request, Response } from "express"
import {prisma} from '@uptime-chain/database'
import * as z from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { env } from "../config"
import { UserRole } from "@uptime-chain/database/"
import { sendEmail } from "../utils/sendMail"


const loginSchema = z.object({
    email: z
        .email(),
    password: z
        .string()
        .min(8, "Password should be at least 8 characters long")
        .max(20, "Password should be at most 50 characters long")
    
})

const registerSchema = z.object({
    email: z
        .email(),
    name: z
        .string()
        .min(3, "Name should be at least 3 characters long")
        .max(20, "Name should be at most 50 characters long"),
    password: z
        .string()
        .min(8, "Password should be at least 8 characters long")
        .max(20, "Password should be at most 50 characters long"),
    role: z.enum(UserRole).default(UserRole.CLIENT)
    
})

const verifyOtpSchema = z.object({
    email: z.email(),
    token: z.string().regex(/^\d{6}$/, "Token must be a 6 digit code"),
})

const sendOtpSchema = z.object({
    email: z.email(),
})

const forgotPasswordSchema = z.object({
    email: z.email(),
})

const resetPasswordSchema = z.object({
    email: z.email(),
    token: z.string().regex(/^\d{6}$/, "Token must be a 6 digit code"),
    newPassword: z
        .string()
        .min(8, "Password should be at least 8 characters long")
        .max(20, "Password should be at most 50 characters long"),
})

function generateSixDigitToken() {
    const token = Math.floor(100000 + Math.random() * 900000).toString()
    console.log("Token is", token)
    return token
}

async function sendVerificationOtpEmail(email: string, token: string) {
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; line-height: 1.6">
        <h2 style="margin: 0 0 12px 0">Verify your email</h2>
        <p style="margin: 0 0 12px 0">Use this code to verify your UptimeChain account:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 10px 0 16px 0">${token}</div>
        <p style="margin: 0; color: #666">If you didn’t request this, you can ignore this email.</p>
      </div>
    `
    await sendEmail({
        email,
        subject: "UptimeChain verification code",
        message: html,
    })
}

export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            omit:{
                password: true
            }
        });
        if(!user) {
            return res.status(404).json({message: "User not found"})
        }
        return res.status(200).json({
            message: "User found",
            data: {
                ...user,
                wallet_balance : user.wallet_balance.toString()
            }
        })
    } catch (error) {
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}

export const loginUser = async (req: Request, res: Response) => {
    try {
        const cleanedBody = loginSchema.parse(req.body);
        const user = await prisma.user.findFirst({
            where: {
                email: cleanedBody.email
            }
        })
        if(!user) {
            return res.status(404).json({message: "User not found"})
        }
        if(!user.password) {
            return res.status(404).json({message: "User not found"})
        }
        const isPasswordMatching = await bcrypt.compare(cleanedBody.password, user.password);
        if(!isPasswordMatching) {
            return res.status(401).json({message: "Invalid credentials"})
        }

        if (!user.is_verified) {
            const token = generateSixDigitToken()
            await prisma.user.update({
                where: { id: user.id },
                data: { token },
            })
            try {
                await sendVerificationOtpEmail(user.email, token)
            } catch (e) {
                console.error("Failed to send verification email", e)
            }
            return res.status(403).json({
                message: "Email not verified. OTP sent to your email.",
                requires_verification: true,
                email: user.email,
            })
        }

        const token = jwt.sign({id: user.id}, env.JWT_SECRET_KEY, {expiresIn: "1d"});
        user.password = null;
        return res.status(200).json({message: "Login successful", token, user:{
            ...user,
            wallet_balance : user.wallet_balance.toString()
        }});   
    } catch (error) {
        console.log(error)
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}

export const registerUser = async (req: Request, res: Response) => {
    try {
        const cleanedBody = registerSchema.parse(req.body);
        const existingUser = await prisma.user.findFirst({
            where: {
                email: cleanedBody.email
            }
        })
        if(existingUser) {
            return res.status(409).json({message: "User already exists"})
        }
        const hashedPassword = await bcrypt.hash(cleanedBody.password, 10);
        const otp = generateSixDigitToken()
        const user = await prisma.user.create({
            data: {
                email: cleanedBody.email,
                name: cleanedBody.name,
                password: hashedPassword,
                role: cleanedBody.role,
                token: otp
            }
        })
        if(cleanedBody.role === UserRole.VALIDATOR){
            await prisma.validator.create({
                data: {
                    user_id: user.id
                }
            })
        }
        try {
            await sendVerificationOtpEmail(user.email, otp)
        } catch (e) {
            console.error("Failed to send verification email", e)
        }
        user.password = null;
        return res.status(201).json({
            message: "User created. Verification OTP sent to your email.",
            requires_verification: true,
            email: user.email,
            user:{
                ...user,
                wallet_balance : user.wallet_balance.toString()
            }
        })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const cleanedBody = verifyOtpSchema.parse(req.body)
        const user = await prisma.user.findUnique({
            where: { email: cleanedBody.email },
        })
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        if (user.is_verified) {
            const jwtToken = jwt.sign({ id: user.id }, env.JWT_SECRET_KEY, { expiresIn: "1d" })
            user.password = null
            return res.status(200).json({
                message: "Already verified",
                token: jwtToken,
                user: {
                    ...user,
                    wallet_balance: user.wallet_balance.toString(),
                },
            })
        }
        if (user.token !== cleanedBody.token) {
            return res.status(400).json({ message: "Invalid token" })
        }
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { is_verified: true, token: "" },
        })
        const jwtToken = jwt.sign({ id: updated.id }, env.JWT_SECRET_KEY, { expiresIn: "1d" })
        updated.password = null
        return res.status(200).json({
            message: "Email verified",
            token: jwtToken,
            user: {
                ...updated,
                wallet_balance: updated.wallet_balance.toString(),
            },
        })
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" })
    }
}

export const sendOtp = async (req: Request, res: Response) => {
    try {
        const cleanedBody = sendOtpSchema.parse(req.body)
        const user = await prisma.user.findUnique({
            where: { email: cleanedBody.email },
        })
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        if (user.is_verified) {
            return res.status(200).json({ message: "User already verified" })
        }
        const otp = generateSixDigitToken()
        await prisma.user.update({
            where: { id: user.id },
            data: { token: otp },
        })
        try {
            await sendVerificationOtpEmail(user.email, otp)
        } catch (e) {
            console.error("Failed to send verification email", e)
        }
        return res.status(200).json({ message: "OTP sent" })
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" })
    }
}

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const cleanedBody = forgotPasswordSchema.parse(req.body)
        const user = await prisma.user.findUnique({
            where: { email: cleanedBody.email },
        })
        if (!user) {
            // To prevent email enumeration, we return success even if the user doesn't exist.
            return res.status(200).json({ message: "If your email is registered, you will receive an OTP." })
        }

        const otp = generateSixDigitToken()
        await prisma.user.update({
            where: { id: user.id },
            data: { is_verified: false, token: otp },
        })

        try {
            await sendVerificationOtpEmail(user.email, otp)
        } catch (e) {
            console.error("Failed to send verification email", e)
        }

        return res.status(200).json({ message: "OTP sent. Please verify to reset your password." })
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" })
    }
}

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const cleanedBody = resetPasswordSchema.parse(req.body)
        const user = await prisma.user.findUnique({
            where: { email: cleanedBody.email },
        })

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (user.token !== cleanedBody.token) {
            return res.status(400).json({ message: "Invalid token" })
        }

        const hashedPassword = await bcrypt.hash(cleanedBody.newPassword, 10)

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, is_verified: true, token: "" },
        })

        const jwtToken = jwt.sign({ id: updated.id }, env.JWT_SECRET_KEY, { expiresIn: "1d" })
        updated.password = null

        return res.status(200).json({
            message: "Password reset successful",
            token: jwtToken,
            user: {
                ...updated,
                wallet_balance: updated.wallet_balance.toString(),
            },
        })
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" })
    }
}