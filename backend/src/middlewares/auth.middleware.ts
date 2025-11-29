import type { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import { env } from "../config";
import type { User } from "../types";
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if(!token) {
            return res.status(401).json({message: "Unauthorized"});
        }
        const user = jwt.verify(token, env.JWT_SECRET_KEY) as User;
        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({message: "Something went wrong"});
    }
}