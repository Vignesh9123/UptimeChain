import type { Request, Response } from "express"
import {prisma} from '../lib/prisma'
import * as z from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { env } from "../config"
import { UserRole } from "../generated/prisma/enums"

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
            data: user
        })
    } catch (error) {
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}

export const loginUser = async (req: Request, res: Response) => {
    try {
        const cleanedBody = loginSchema.parse(req.body);
        console.log('fjd',cleanedBody)
        const user = await prisma.user.findFirst({
            where: {
                email: cleanedBody.email
            }
        })
        console.log(user)
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
        const token = jwt.sign({id: user.id}, env.JWT_SECRET_KEY, {expiresIn: "1d"});
        return res.status(200).json({message: "Login successful", token});   
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
        const user = await prisma.user.create({
            data: {
                email: cleanedBody.email,
                name: cleanedBody.name,
                password: hashedPassword,
                role: cleanedBody.role
            }
        })
        return res.status(201).json({message: "User created", data: user})   
    }
    catch (error) {
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}