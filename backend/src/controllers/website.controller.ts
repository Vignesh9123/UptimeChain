import type { Request, Response } from "express";
import z from "zod";
import { prisma } from "@uptime-chain/database";
import { CheckStatus, type Website } from "@uptime-chain/database";
import { createHash } from "crypto";
import { program, authority } from "../config";
import { sendEmail } from "../utils/sendMail";
const addWebsiteSchema = z.object({
    name: z.string().min(3).max(20),
    url: z.url({
        normalize: true,
        error:"Invalid URL"
    }),
    check_interval: z.number().min(1).max(60),
    is_active: z.boolean().default(true),
    regions: z.array(z.enum([
        "Asia",
        "North America",
        "South America",
        "Europe",
        "Africa",
        "Oceania",
        "Antarctica",
    ])).min(1, "Select at least one continent"),
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
        if (!existingWebsite) {
            const bytes = Buffer.from(cleanedBody.url, "utf8");
            const target_id = Array.from(
                createHash("sha256").update(bytes).digest()
            );
            try {
            const txn1 = await program?.methods?.initializeTarget?.(target_id)
                .accounts({
                authority: authority.publicKey
                })
                .signers([authority])
                .rpc()
            console.log("Initialize target transaction: ", txn1);
            }catch(error){
                console.log("Initialize target transaction failed: ", error);
            }
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
        if (existingUserSubscription) {
            return res.status(400).json({ message: "Website already added to user" })
        }
        const userSubscription = await prisma.subscription.create({
            data: {
                userId: req.user.id,
                name: cleanedBody.name,
                websiteId: website.id,
                check_interval: cleanedBody.check_interval * 60,
                is_active: cleanedBody.is_active,
                regions: cleanedBody.regions,
                current_status: CheckStatus.UNKNOWN,
                billed_till: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        })
        const existingSchedule = await prisma.websiteSchedule.findFirst({
            where: {
                websiteId: website.id,
            }
        })
        if (!existingSchedule) {
            await prisma.websiteSchedule.create({
                data: {
                    websiteId: website.id,
                    interval_seconds: cleanedBody.check_interval * 60,
                    next_run: new Date(Date.now() + 5000),
                }
            })
        }
        else {
            if (cleanedBody.check_interval * 60 < existingSchedule.interval_seconds) {
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
        return res.status(201).json({ message: "Website added to user", data: userSubscription })
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" })
    }
}

export const getUserWebsites = async (req: Request, res: Response) => {
    const { take, skip } = req.query;
    try {
        const userWebsites = await prisma.subscription.findMany({
            where: {
                userId: req.user.id,
            },
            include: {
                website: true,
            },
            orderBy: {
                createdAt: "desc"
            },
            take: Number(take),
            skip: Number(skip),
        })
        return res.status(200).json({ message: "User websites fetched", data: userWebsites })
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" })
    }
}

export const getUserWebsite = async (req: Request, res: Response) => {
    try {
        const userWebsiteId = req.params.id as string;
        const userWebsite = await prisma.subscription.findFirst({
            where: {
                id: userWebsiteId,
                userId: req.user.id
            },
            include: {
                website: true,
            }
        })
        if (!userWebsite) {
            return res.status(404).json({ message: "User website not found" })
        }
        return res.status(200).json({ message: "User website fetched", data: userWebsite })
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" })
    }
}

export const deactivateSubscription = async (req: Request, res: Response) => {
    try {
        const subscriptionId = req.params.id as string;

        const updated = await prisma.$transaction(async (tx) => {
            const subscription = await tx.subscription.findFirst({
                where: {
                    id: subscriptionId,
                    userId: req.user.id,
                },
                select: {
                    id: true,
                    websiteId: true,
                    is_active: true,
                },
            });

            if (!subscription) {
                return null;
            }

            if (subscription.is_active) {
                await tx.subscription.update({
                    where: { id: subscription.id },
                    data: { is_active: false },
                });
            }

            const activeSubs = await tx.subscription.findMany({
                where: {
                    websiteId: subscription.websiteId,
                    is_active: true,
                },
                select: { check_interval: true },
            });

            if (activeSubs.length === 0) {
                await tx.websiteSchedule.deleteMany({
                    where: { websiteId: subscription.websiteId },
                });
                return { websiteId: subscription.websiteId, schedule: null };
            }

            const minIntervalSeconds = Math.min(...activeSubs.map((s) => s.check_interval));

            const schedule = await tx.websiteSchedule.findFirst({
                where: { websiteId: subscription.websiteId },
                select: { id: true, interval_seconds: true },
            });

            if (schedule && minIntervalSeconds < schedule.interval_seconds) {
                await tx.websiteSchedule.update({
                    where: { id: schedule.id },
                    data: {
                        interval_seconds: minIntervalSeconds,
                        next_run: new Date(Date.now() + minIntervalSeconds * 1000),
                    },
                });
            }

            return { websiteId: subscription.websiteId, schedule: { minIntervalSeconds } };
        });

        if (!updated) {
            return res.status(404).json({ message: "User website not found" });
        }

        return res.status(200).json({ message: "Subscription deactivated", data: updated });
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" });
    }
}

export const activateSubscription = async (req: Request, res: Response) => {
    try {
        const subscriptionId = req.params.id as string;

        const updated = await prisma.$transaction(async (tx) => {
            const subscription = await tx.subscription.findFirst({
                where: {
                    id: subscriptionId,
                    userId: req.user.id,
                },
                select: {
                    id: true,
                    websiteId: true,
                    is_active: true,
                },
            });

            if (!subscription) {
                return null;
            }

            if (!subscription.is_active) {
                await tx.subscription.update({
                    where: { id: subscription.id },
                    data: { is_active: true },
                });
            }

            const activeSubs = await tx.subscription.findMany({
                where: {
                    websiteId: subscription.websiteId,
                    is_active: true,
                },
                select: { check_interval: true },
            });

            if (activeSubs.length === 0) {
                await tx.websiteSchedule.deleteMany({
                    where: { websiteId: subscription.websiteId },
                });
                return { websiteId: subscription.websiteId, schedule: null };
            }

            const minIntervalSeconds = Math.min(...activeSubs.map((s) => s.check_interval));

            const schedule = await tx.websiteSchedule.findFirst({
                where: { websiteId: subscription.websiteId },
                select: { id: true, interval_seconds: true },
            });

            if (!schedule) {
                await tx.websiteSchedule.create({
                    data: {
                        websiteId: subscription.websiteId,
                        interval_seconds: minIntervalSeconds,
                        next_run: new Date(Date.now() + 5000),
                    },
                });
            } else if (minIntervalSeconds < schedule.interval_seconds) {
                await tx.websiteSchedule.update({
                    where: { id: schedule.id },
                    data: {
                        interval_seconds: minIntervalSeconds,
                        next_run: new Date(Date.now() + minIntervalSeconds * 1000),
                    },
                });
            }

            return { websiteId: subscription.websiteId, schedule: { minIntervalSeconds } };
        });

        if (!updated) {
            return res.status(404).json({ message: "User website not found" });
        }

        return res.status(200).json({ message: "Subscription activated", data: updated });
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" });
    }
}

export const processDailyRenewals = async (req: Request, res: Response) => {
    try {
        const cronSecret = req.headers["x-cron-secret"];
        if (cronSecret !== process.env.CRON_SECRET) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const now = new Date();

        const subscriptions = await prisma.subscription.findMany({
            where: {
                is_cancelled: false,
                billed_till: {
                    lte: now
                }
            },
            include: {
                user: true,
                website: true
            }
        });

        const toCancel = subscriptions;

        let cancelledCount = 0;
        for (const sub of toCancel) {
            await prisma.subscription.update({
                where: { id: sub.id },
                data: {
                    is_cancelled: true,
                    is_active: false
                }
            });

            const activeSubs = await prisma.subscription.findMany({
                where: { websiteId: sub.websiteId, is_active: true },
                select: { check_interval: true }
            });

            if (activeSubs.length === 0) {
                await prisma.websiteSchedule.deleteMany({
                    where: { websiteId: sub.websiteId }
                });
            } else {
                const minIntervalSeconds = Math.min(...activeSubs.map((s) => s.check_interval));
                const schedule = await prisma.websiteSchedule.findFirst({
                    where: { websiteId: sub.websiteId }
                });
                if (schedule && minIntervalSeconds < schedule.interval_seconds) {
                    await prisma.websiteSchedule.update({
                        where: { id: schedule.id },
                        data: {
                            interval_seconds: minIntervalSeconds,
                            next_run: new Date(Date.now() + minIntervalSeconds * 1000)
                        }
                    });
                }
            }

            await sendEmail({
                email: sub.user.email,
                subject: `Subscription Renewal Required for ${sub.name}`,
                message: `<!doctype html> <html lang="en"> <head> <meta charset="utf-8" /> <meta name="viewport" content="width=device-width, initial-scale=1" /> <meta name="x-apple-disable-message-reformatting" /> <title>UptimeChain Subscription Paused</title> </head> <body style="margin:0;padding:0;background:#0b1220;"> <!-- Preheader --> <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;"> Your subscription has been paused due to missed renewal payment. </div> <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0b1220;" > <tr> <td align="center" style="padding:32px 16px;"> <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;" > <tr> <td style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#e6e9ef;" > <!-- Logo/Header --> <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;" > <div style="width:12px;height:12px;border-radius:999px;background:#7c3aed;" ></div> <div style="font-size:16px;font-weight:700;letter-spacing:.2px;" > UptimeChain </div> </div> <!-- Card --> <div style="background:#0f1a33;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px;" > <div style="font-size:13px;color:#a7b0c2;margin-bottom:8px;" > Subscription notice </div> <div style="font-size:22px;line-height:1.25;font-weight:800;margin:0 0 12px 0;color:#ffffff;" > Monitoring paused for ${sub.website.url} </div> <div style="font-size:14px;line-height:1.6;color:#d6dbe6;margin-bottom:14px;" > Hi ${sub.user.name}, your monitoring subscription for <strong style="color:#ffffff;"> ${sub.website.url} </strong> has reached its monthly renewal date and has been paused. </div> <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:14px 0 18px 0;" > <tr> <td style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;" > <div style="font-size:12px;color:#a7b0c2;margin-bottom:6px;" > Current status </div> <div style="font-size:14px;color:#ffffff;font-weight:700;" > Subscription paused awaiting renewal payment </div> </td> </tr> </table> <div style="font-size:13px;line-height:1.6;color:#a7b0c2;margin-bottom:18px;" > To continue uptime monitoring and receive alerts, please renew your subscription from your UptimeChain dashboard. </div> <!-- CTA --> <table role="presentation" cellpadding="0" cellspacing="0" border="0" > <tr> <td align="center" style="border-radius:12px;background:#7c3aed;" > <a href="http://localhost:5173/client" style="display:inline-block;padding:12px 16px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:14px;color:#ffffff;text-decoration:none;font-weight:700;" > Renew Subscription </a> </td> </tr> </table> </div> <!-- Footer --> <div style="margin-top:14px;font-size:12px;line-height:1.6;color:#7f8aa3;" > You’re receiving this email because you have an active monitoring subscription on UptimeChain. </div> <div style="margin-top:8px;font-size:12px;line-height:1.6;color:#7f8aa3;" > © ${new Date().getFullYear()} UptimeChain </div> </td> </tr> </table> </td> </tr> </table> </body> </html>`
            });
            cancelledCount++;
        }

        return res.status(200).json({ message: `Processed ${cancelledCount} renewals.` });
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" });
    }
}

export const renewSubscription = async (req: Request, res: Response) => {
    try {
        const subscriptionId = req.params.id as string;
        
        const updated = await prisma.$transaction(async (tx) => {
            const subscription = await tx.subscription.findFirst({
                where: {
                    id: subscriptionId,
                    userId: req.user.id,
                },
                select: {
                    id: true,
                    websiteId: true,
                    is_cancelled: true,
                    is_active: true
                },
            });

            if (!subscription) {
                return null;
            }

            if (subscription.is_cancelled) {
                await tx.subscription.update({
                    where: { id: subscription.id },
                    data: { 
                        is_cancelled: false, 
                        is_active: true, 
                        billed_till: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
                    },
                });
            }

            const activeSubs = await tx.subscription.findMany({
                where: {
                    websiteId: subscription.websiteId,
                    is_active: true,
                },
                select: { check_interval: true },
            });

            if (activeSubs.length === 0) {
                return { websiteId: subscription.websiteId, schedule: null };
            }

            const minIntervalSeconds = Math.min(...activeSubs.map((s) => s.check_interval));

            const schedule = await tx.websiteSchedule.findFirst({
                where: { websiteId: subscription.websiteId },
                select: { id: true, interval_seconds: true },
            });

            if (!schedule) {
                await tx.websiteSchedule.create({
                    data: {
                        websiteId: subscription.websiteId,
                        interval_seconds: minIntervalSeconds,
                        next_run: new Date(Date.now() + 5000),
                    },
                });
            } else if (minIntervalSeconds < schedule.interval_seconds) {
                await tx.websiteSchedule.update({
                    where: { id: schedule.id },
                    data: {
                        interval_seconds: minIntervalSeconds,
                        next_run: new Date(Date.now() + minIntervalSeconds * 1000),
                    },
                });
            }

            return { websiteId: subscription.websiteId, schedule: { minIntervalSeconds } };
        });

        if (!updated) {
            return res.status(404).json({ message: "User website not found" });
        }

        return res.status(200).json({ message: "Subscription renewed successfully", data: updated });
    } catch (error) {
        return res.status(500).json({ message: (error as any)?.message || "Something went wrong" });
    }
}