import { prisma } from "@uptime-chain/database";
import type { Request, Response } from "express";
import * as z from "zod";

type UptimeHistoryPoint = { name: string; uptime: number | null }
type DashboardAlert = {
    type: "DOWNTIME" | "HIGH_LATENCY" | "UNKNOWN"
    severity: "critical" | "warning" | "info"
    websiteId: string
    websiteUrl: string
    message: string
    responseTimeMs?: number
    createdAt: string
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

const addDays = (d: Date, days: number) => {
    const copy = new Date(d)
    copy.setDate(copy.getDate() + days)
    return copy
}

const weekdayShort = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" })

const computeUptimePct = (rows: Array<{ status: string }>) => {
    const considered = rows.filter((r) => r.status === "UP" || r.status === "DOWN")
    if (considered.length === 0) return null
    const up = considered.filter((r) => r.status === "UP").length
    return (up / considered.length) * 100
}

export const getDashboardOverviewForUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id
        const subs = await prisma.subscription.findMany({
            where: { userId, is_active: true },
            distinct: ["websiteId"],
            select: { websiteId: true }
        })
        const websiteIds = subs.map((s) => s.websiteId)

        if (websiteIds.length === 0) {
            return res.status(200).json({
                data: {
                    overallUptimePct: null,
                    overallUptimeDeltaPct: null,
                    globalLatencyMs: null,
                    uptimeHistory7d: [] as UptimeHistoryPoint[],
                    alerts: [] as DashboardAlert[],
                    websitesCount: 0,
                }
            })
        }

        const now = new Date()
        const since60d = addDays(now, -60)
        const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const results60d = await prisma.roundResult.findMany({
            where: {
                websiteId: { in: websiteIds },
                createdAt: { gte: since60d },
            },
            select: {
                status: true,
                responseTime: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" }
        })

        const since30d = addDays(now, -30)
        const prev60to30 = addDays(now, -60)

        const current30 = results60d.filter((r) => r.createdAt >= since30d)
        const previous30 = results60d.filter((r) => r.createdAt >= prev60to30 && r.createdAt < since30d)

        const overallUptimePct = computeUptimePct(current30)
        const previousUptimePct = computeUptimePct(previous30)
        const overallUptimeDeltaPct =
            overallUptimePct === null || previousUptimePct === null ? null : overallUptimePct - previousUptimePct

        const latencyRows = results60d.filter((r) => r.createdAt >= since24h && r.status === "UP")
        const globalLatencyMs =
            latencyRows.length === 0 ? null : latencyRows.reduce((acc, r) => acc + (r.responseTime ?? 0), 0) / latencyRows.length

        const todayStart = startOfDay(now)
        const start7d = addDays(todayStart, -6) // include today
        const historyRows = results60d.filter((r) => r.createdAt >= start7d)

        const uptimeHistory7d: UptimeHistoryPoint[] = []
        for (let i = 0; i < 7; i++) {
            const dayStart = addDays(start7d, i)
            const dayEnd = addDays(dayStart, 1)
            const dayRows = historyRows.filter((r) => r.createdAt >= dayStart && r.createdAt < dayEnd)
            uptimeHistory7d.push({
                name: weekdayShort(dayStart),
                uptime: computeUptimePct(dayRows),
            })
        }

        const roundResults = await prisma.roundResult.findMany({
            where: { websiteId: { in: websiteIds } },
            include: { website: true },
            orderBy: { createdAt: "desc" },
            take: Math.min(websiteIds.length * 5, 500),
        })

        const latestByWebsite = new Map<string, (typeof roundResults)[number]>()
        for (const r of roundResults) {
            if (!latestByWebsite.has(r.websiteId)) latestByWebsite.set(r.websiteId, r)
            if (latestByWebsite.size === websiteIds.length) break
        }

        const HIGH_LATENCY_MS = 1000
        const alerts: DashboardAlert[] = []
        for (const websiteId of websiteIds) {
            const r = latestByWebsite.get(websiteId)
            if (!r) continue

            if (r.status === "DOWN") {
                alerts.push({
                    type: "DOWNTIME",
                    severity: "critical",
                    websiteId,
                    websiteUrl: r.website.url,
                    message: "Website is currently down.",
                    createdAt: r.createdAt.toISOString(),
                })
            } else if (r.status === "UNKNOWN") {
                alerts.push({
                    type: "UNKNOWN",
                    severity: "info",
                    websiteId,
                    websiteUrl: r.website.url,
                    message: "Website status is unknown (no recent successful check).",
                    createdAt: r.createdAt.toISOString(),
                })
            } else if (r.status === "UP" && typeof r.responseTime === "number" && r.responseTime > HIGH_LATENCY_MS) {
                alerts.push({
                    type: "HIGH_LATENCY",
                    severity: "warning",
                    websiteId,
                    websiteUrl: r.website.url,
                    message: `High latency detected (${Math.round(r.responseTime)}ms).`,
                    responseTimeMs: r.responseTime,
                    createdAt: r.createdAt.toISOString(),
                })
            }
        }

        alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return res.status(200).json({
            data: {
                overallUptimePct,
                overallUptimeDeltaPct,
                globalLatencyMs,
                uptimeHistory7d,
                alerts: alerts.slice(0, 5),
                websitesCount: websiteIds.length,
            }
        })
    } catch (error) {
        return res.status(500).json({ error })
    }
}

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
        const toleranceMs = 120000 // 2 min tolerance (interval cannot be < 5 min)
        const intervalMs = subscription.check_interval * 1000

        if (intervalMs <= 0 || results.length === 0) {
            return res.status(200).json({ data: [] })
        }

        const resultsAsc = [...results].sort(
            (a, b) => a.roundTimestamp.getTime() - b.roundTimestamp.getTime()
        )

        const firstIdx = resultsAsc.findIndex(
            (r) => r.roundTimestamp.getTime() > subscription.createdAt.getTime()
        )
        if (firstIdx === -1) {
            return res.status(200).json({ data: [] })
        }

        const firstRound = resultsAsc[firstIdx]
        const lastRound = resultsAsc[resultsAsc.length - 1]
        if (!firstRound || !lastRound) {
            return res.status(200).json({ data: [] })
        }

        const firstRoundTs = firstRound.roundTimestamp.getTime()
        const lastRoundTs = lastRound.roundTimestamp.getTime()

        const filteredResults: typeof results = []
        let i = firstIdx
        for (
            let expectedTs = firstRoundTs;
            expectedTs <= lastRoundTs + toleranceMs;
            expectedTs += intervalMs
        ) {
            while (i < resultsAsc.length) {
                const current = resultsAsc[i]
                if (!current) break
                if (current.roundTimestamp.getTime() >= expectedTs - toleranceMs) break
                i++
            }

            if (i >= resultsAsc.length) break

            let bestIdx = -1
            let bestDiff = Number.POSITIVE_INFINITY
            for (let j = i; j < resultsAsc.length; j++) {
                const candidate = resultsAsc[j]
                if (!candidate) break
                const ts = candidate.roundTimestamp.getTime()
                if (ts > expectedTs + toleranceMs) break
                const diff = Math.abs(ts - expectedTs)
                if (diff < bestDiff) {
                    bestDiff = diff
                    bestIdx = j
                }
            }

            if (bestIdx !== -1) {
                const matched = resultsAsc[bestIdx]
                if (!matched) break
                filteredResults.push(matched)
                i = bestIdx + 1
            }
        }
        return res.status(200).json({
            data:filteredResults.reverse()
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

export const verifyRoundDetails = async (req: Request, res: Response) => {
    try {
        const { ipfs_cid, round_pda } = req.query;

        if (!ipfs_cid || typeof ipfs_cid !== "string") {
            return res.status(400).json({ error: "ipfs_cid is required" });
        }
        if (!round_pda || typeof round_pda !== "string") {
            return res.status(400).json({ error: "round_pda is required" });
        }

        const { getIPFSReport } = await import("../utils/ipfs");
        const { getRoundDetailsFromChain } = await import("../utils/blockchain");

        const ipfsDetails = await getIPFSReport(ipfs_cid);
        const blockchainDetails = await getRoundDetailsFromChain(round_pda);

        return res.status(200).json({
            data: {
                ipfsDetails,
                blockchainDetails,
            },
        });
    } catch (error) {
        console.error("verifyRoundDetails error", error);
        return res.status(500).json({ error: "Failed to verify round details" });
    }
};