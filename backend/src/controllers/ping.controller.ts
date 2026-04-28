import { prisma } from "@uptime-chain/database";
import type { Request, Response } from "express";

export const getLatestResultsForUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id
        const websites = await prisma.subscription.findMany({
            where: {
                userId
            },
            distinct:['websiteId']
        })
        const websiteIds = websites.map((website) => website.websiteId)
        const roundResults = await prisma.roundResult.findMany({
            where: {
                websiteId: {
                    in: websiteIds
                }
            },
            include:{
                website: true
            },
            orderBy:{
                createdAt: 'desc'
            }
        })
        let latestResults: typeof roundResults = [] 
        websiteIds.forEach((websiteId) => {
            const websiteResult = roundResults.find((result) => result.websiteId === websiteId)
            if(websiteResult && latestResults.find((result) => result.websiteId === websiteId) === undefined) {
                latestResults.push(websiteResult)
            }
        })
        return res.status(200).json({
            data:latestResults
        })
    } catch (error) {
        return res.status(500).json({
            error
        })
    }
}

export const getWebsiteResults = async (req: Request, res: Response) => {
    try {
        const websiteId = req.params.websiteId
        if(!websiteId) {
            return res.status(400).json({
                error: 'Website ID is required'
            })
        }
        if(typeof websiteId !== 'string') {
            return res.status(400).json({
                error: 'Website ID must be a string'
            })
        }
        const userId = req.user.id
        const subscription = await prisma.subscription.findFirst({
            where: {
                websiteId,
                userId
            }
        })
        if(!subscription) {
            return res.status(404).json({
                error: 'Subscription not found'
            })
        }
        const websiteSchedule = await prisma.websiteSchedule.findFirst({
            where: {
                websiteId
            }
        })
        if(!websiteSchedule) {
            return res.status(404).json({
                error: 'Website schedule not found'
            })
        }
        const results = await prisma.roundResult.findMany({
            where: {
                websiteId
            },
            include:{
                website: true
            },
            orderBy:{
                createdAt: 'desc'
            }
        })
        const filteredResults = results.filter((result) => {
            const checkInterval = subscription.check_interval
            const roundTimestamp = result.roundTimestamp
            const tolerance = 60000; // a min of tolerance is fine since the interval cannot be less than 5 min
            const intervalMs = checkInterval * 1000;
            const offset = subscription.createdAt.getTime();
            const mod = (roundTimestamp.getTime() - offset) % intervalMs;
            const diff = Math.min(mod, intervalMs - mod);
            return diff <= tolerance;
        })
        return res.status(200).json({
            data:filteredResults
        })
    } catch (error) {
        return res.status(500).json({
            error
        })
    }
}

export const getWebsiteSubmissions = async (req: Request, res: Response) => {
    try {
        const websiteId = req.params.websiteId
        if (!websiteId || typeof websiteId !== 'string') {
            return res.status(400).json({ error: 'Website ID is required' })
        }
        const userId = req.user.id
        const subscription = await prisma.subscription.findFirst({
            where: { websiteId, userId }
        })
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' })
        }
        const submissions = await prisma.validatorSubmissions.findMany({
            where: { websiteId },
            orderBy: { roundTimestamp: 'desc' },
            take: 500,
        })
        const filteredSubmissions = submissions.filter((submission) => submission.roundTimestamp.getTime() > subscription.createdAt.getTime())
        return res.status(200).json({ data: filteredSubmissions })
    } catch (error) {
        return res.status(500).json({ error })
    }
}