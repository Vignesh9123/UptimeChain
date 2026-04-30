import { prisma } from "@uptime-chain/database";
import type { Request, Response } from "express";
import * as z from "zod";

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
            const tolerance = 120000; // 2 min of tolerance is fine since the interval cannot be less than 5 min
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

const roundTimestampQuerySchema = z.object({
    roundTimestamp: z.string().min(1),
})

const parseRoundTimestamp = (value: string) => {
    const asNumber = Number(value)
    if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
        return new Date(asNumber)
    }
    return new Date(value)
}

export const getWebsiteContinentStatusForRound = async (req: Request, res: Response) => {
    try {
        const websiteId = req.params.websiteId
        if (!websiteId || typeof websiteId !== 'string') {
            return res.status(400).json({ error: 'Website ID is required' })
        }

        const { roundTimestamp } = roundTimestampQuerySchema.parse(req.query)
        const ts = parseRoundTimestamp(roundTimestamp)
        if (Number.isNaN(ts.getTime())) {
            return res.status(400).json({ error: 'roundTimestamp must be a valid timestamp (ms) or ISO string' })
        }

        const userId = req.user.id
        const subscription = await prisma.subscription.findFirst({
            where: { websiteId, userId }
        })
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' })
        }

        const submissions = await prisma.validatorSubmissions.findMany({
            where: { websiteId, roundTimestamp: ts },
            select: { continent: true, status: true },
        })

        const continentMap: Record<string, { continent: string; up: number; down: number; unknown: number; total: number; status: 'UP' | 'DOWN' | 'UNKNOWN' }> = {}
        for (const s of submissions) {
            const continent = s.continent || 'Unknown'
            if (!continentMap[continent]) {
                continentMap[continent] = { continent, up: 0, down: 0, unknown: 0, total: 0, status: 'UNKNOWN' }
            }
            const entry = continentMap[continent]
            entry.total += 1
            if (s.status === 'UP') entry.up += 1
            else if (s.status === 'DOWN') entry.down += 1
            else entry.unknown += 1
        }

        const continents = Object.values(continentMap).map((c) => {
            const status: 'UP' | 'DOWN' | 'UNKNOWN' =
                c.down > 0 ? 'DOWN' : c.up > 0 ? 'UP' : 'UNKNOWN'
            return { ...c, status }
        })

        return res.status(200).json({
            data: {
                websiteId,
                roundTimestamp: ts.toISOString(),
                continents,
            }
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues?.[0]?.message ?? 'Invalid request' })
        }
        return res.status(500).json({ error })
    }
}