import type { Request, Response } from "express";
import z from "zod";
import { prisma } from "../lib/prisma";
import { CheckStatus, type UserWebsite, type Website } from "../generated/prisma/client";

const addWebsiteSchema = z.object({
    name: z.string().min(3).max(20),
    url: z.url("Invalid URL"),
    check_interval: z.number().min(1).max(60),
    is_active: z.boolean().default(true),
})

export const addWebsite = async (req: Request, res: Response) => {
    try {
        const cleanedBody = addWebsiteSchema.parse(req.body);
        let website: Website;
        const existingWebsite = await prisma.website.findFirst({
            where: {
                url: cleanedBody.url,
            }
        })
        if(!existingWebsite) {
            website = await prisma.website.create({
                data: {
                    name: cleanedBody.name,
                    url: cleanedBody.url,
                }
            })
        }
        else {
            website = existingWebsite;
        }
        const existingUserWebsite = await prisma.userWebsite.findFirst({
            where: {
                userId: req.user.id,
                websiteId: website.id,
            }
        })
        if(existingUserWebsite) {
            return res.status(400).json({message: "Website already added to user"})
        }
        const userWebsite = await prisma.userWebsite.create({
            data: {
                userId: req.user.id,
                websiteId: website.id,
                check_interval: cleanedBody.check_interval,
                is_active: cleanedBody.is_active,
                current_status: CheckStatus.UNKNOWN,
            }
        })
        return res.status(201).json({message: "Website added to user", data: userWebsite})
    } catch (error) {
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}

export const getUserWebsites = async (req: Request, res: Response) => {
    try {
        const userWebsites = await prisma.userWebsite.findMany({
            where: {
                userId: req.user.id,
            }
        })
        return res.status(200).json({message: "User websites fetched", data: userWebsites})
    } catch (error) {
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}

export const getUserWebsite = async (req: Request, res: Response) => {
    try {
        const userWebsiteId = req.params.id;
        const userWebsite = await prisma.userWebsite.findFirst({
            where: {
                id: userWebsiteId,
                userId: req.user.id
            }
        })
        if(!userWebsite) {
            return res.status(404).json({message: "User website not found"})
        }
        return res.status(200).json({message: "User website fetched", data: userWebsite})
    } catch (error) {
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}