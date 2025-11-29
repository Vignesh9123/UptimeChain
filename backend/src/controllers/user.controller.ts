import type { Request, Response } from "express"
import {prisma} from '../lib/prisma'

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
        
    } catch (error) {
        
    }
}