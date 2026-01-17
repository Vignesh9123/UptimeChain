import type { Request, Response } from "express";
import z from "zod";
import { prisma } from "@uptime-chain/database";
import { CheckStatus, type Subscription, type Website } from "@uptime-chain/database";

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
                    url: cleanedBody.url,
                }
            })
        }
        else {
            website = existingWebsite;
        }
        const existingUserSubscription = await prisma.subscription.findFirst({
            where: {
                userId: req.user.id,
                websiteId: website.id,
            }
        })
        if(existingUserSubscription) {
            return res.status(400).json({message: "Website already added to user"})
        }
        const userSubscription = await prisma.subscription.create({
            data: {
                userId: req.user.id,
                name: cleanedBody.name,
                websiteId: website.id,
                check_interval: cleanedBody.check_interval * 60,
                is_active: cleanedBody.is_active,
                current_status: CheckStatus.UNKNOWN,
            }
        })
        const existingSchedule = await prisma.websiteSchedule.findFirst({
            where: {
                websiteId: website.id,
            }
        })
        if(!existingSchedule) {
            await prisma.websiteSchedule.create({
                data: {
                    websiteId: website.id,
                    interval_seconds: cleanedBody.check_interval * 60,
                    next_run: new Date(Date.now() + cleanedBody.check_interval * 60 * 1000),
                }
            })
        }
        else {
            if(cleanedBody.check_interval < existingSchedule.interval_seconds) {
                await prisma.websiteSchedule.update({
                    where: {
                        id: existingSchedule.id,
                    },
                    data: {
                        interval_seconds: cleanedBody.check_interval * 60,
                        next_run: new Date(Date.now() + cleanedBody.check_interval * 60 * 1000),
                    }
                })
            }
        }
        return res.status(201).json({message: "Website added to user", data: userSubscription})
    } catch (error) {
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}

export const getUserWebsites = async (req: Request, res: Response) => {
    const { take, skip } = req.query;
    try {
        const userWebsites = await prisma.subscription.findMany({
            where: {
                userId: req.user.id,
            },
            take: Number(take),
            skip: Number(skip),
        })
        return res.status(200).json({message: "User websites fetched", data: userWebsites})
    } catch (error) {
        return res.status(500).json({message: (error as any)?.message || "Something went wrong"})
    }
}

export const getUserWebsite = async (req: Request, res: Response) => {
    try {
        const userWebsiteId = req.params.id as string;
        const userWebsite = await prisma.subscription.findFirst({
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