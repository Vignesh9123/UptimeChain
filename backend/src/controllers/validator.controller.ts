import { prisma } from "@uptime-chain/database";
import type {Request, Response} from "express";
import * as z from "zod";
import { connection, txParser, instructionCoder, PROGRAM_ID, program , authority} from "../config";

type ValidatorDashboardItem = {
    websiteId: string
    websiteUrl: string
    roundTimestamp: string
    status: string
    responseTimeMs: number
    isFinalized: boolean
    earningSol: number
}

const stakeValidatorSchema = z.object({
    signature: z.string().min(1),
})

const registerValidatorPubkeySchema = z.object({
    pubkey: z.string().min(1),
})

const registerValidatorRegionSchema = z.object({
    continent: z.string().min(1),
    pubkey: z.string().min(1),
})
const registerValidatorOnChain = async (validatorPubkey: string) => {
    try {
        if(!program.methods.initializeValidator){
            return
        }

        const txn = await program.methods.initializeValidator()
            .accounts({
                authority: authority.publicKey,
                validator: validatorPubkey,
                payer: authority.publicKey
            })
            .signers([authority])
            .rpc()
        console.log("Initialize validator: ", txn)
    } catch (error) {
        console.log(error)
        return
    }
}

async function verifyStake(txSig: string) {
    const parsed = await txParser.parseTransaction(connection, txSig);
    if(!parsed){
        console.error("Transaction not found")
        return
    }
    const instruction = parsed.at(-1);
    if(!instruction?.name){
        console.error("Instruction not found")
        return
    }
    console.log(instruction.programId.toBase58())
    if(instruction.programId.toBase58() !== PROGRAM_ID.toBase58() && instruction.programId.toBase58()!= "ComputeBudget111111111111111111111111111111"){
        console.error("Instruction not from this program")
        return
    }
    const instructionData = (instruction?.args as any)[instruction?.name] as Buffer;
    
    const decoded = instructionCoder.decode(instructionData);
    console.log(decoded)
    if(!decoded){
        console.log("Instruction not decoded")
        return
    }
    if(decoded.name !== "validator_stake"){
        console.log("Instruction not from the expected function")
        return
    }
    return (decoded.data as any).amount.toNumber()
}

export const getValidator = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                role:"VALIDATOR"
            },
            include: {
                validator: true
            }
        })
        console.log(user)
        if(!user) {
            return res.status(401).json({message: "Unauthorized"})
        }
        if(!user.validator) {
            return res.status(401).json({message: "Unauthorized"})
        }
        return res.status(200).json({message: "Validator found", data: {...user.validator, stake_amount: user.validator.stake_amount.toString()}})
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Internal server error"})
    }
}

export const getValidatorDashboard = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                role: "VALIDATOR"
            },
            include: {
                validator: true
            }
        })
        if (!user || !user.validator) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const validator = user.validator

        const distinctRounds = await prisma.validatorSubmissions.findMany({
            where: { validatorId: validator.id },
            distinct: ["websiteId", "roundTimestamp"],
            select: { websiteId: true, roundTimestamp: true },
            orderBy: { roundTimestamp: "desc" },
            take: 2000,
        })

        const roundKeys = distinctRounds.map((r) => ({
            websiteId: r.websiteId,
            roundTimestamp: r.roundTimestamp,
        }))

        const finalized = roundKeys.length === 0
            ? []
            : await prisma.roundResult.findMany({
                where: {
                    OR: roundKeys.map((rk) => ({
                        websiteId: rk.websiteId,
                        roundTimestamp: rk.roundTimestamp,
                    }))
                },
                select: { websiteId: true, roundTimestamp: true },
            })

        const finalizedSet = new Set(finalized.map((r) => `${r.websiteId}:${r.roundTimestamp.toISOString()}`))
        const finalizedRoundsCount = distinctRounds.filter((r) => finalizedSet.has(`${r.websiteId}:${r.roundTimestamp.toISOString()}`)).length

        const totalEarningsSol = 0.001 * finalizedRoundsCount

        const recent = await prisma.validatorSubmissions.findMany({
            where: { validatorId: validator.id },
            include: {
                website: { select: { url: true } }
            },
            orderBy: { roundTimestamp: "desc" },
            take: 25,
        })

        const recentItems: ValidatorDashboardItem[] = recent.map((s) => {
            const key = `${s.websiteId}:${s.roundTimestamp.toISOString()}`
            const isFinalized = finalizedSet.has(key)
            return {
                websiteId: s.websiteId,
                websiteUrl: s.website.url,
                roundTimestamp: s.roundTimestamp.toISOString(),
                status: s.status,
                responseTimeMs: s.responseTime,
                isFinalized,
                earningSol: isFinalized ? 0.001 : 0,
            }
        })

        return res.status(200).json({
            data: {
                nodeId: user.wallet_pubkey ?? validator.id,
                region: validator.continent || "Unknown",
                isActive: validator.is_active,
                roundsParticipated: distinctRounds.length,
                finalizedRounds: finalizedRoundsCount,
                totalEarningsSol,
                recentActivity: recentItems,
            }
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export const registerValidatorPubkey = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                role:"VALIDATOR"
            },
            include: {
                validator: true
            }
        })
        if(!user) {
            return res.status(401).json({message: "Unauthorized"})
        }
        if(!user.validator) {
            return res.status(401).json({message: "Unauthorized"})
        }
        const cleanedBody = registerValidatorPubkeySchema.parse(req.body);
        const validator = await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                wallet_pubkey: cleanedBody.pubkey
            }
        })
        await registerValidatorOnChain(cleanedBody.pubkey)
        return res.status(200).json({message: "Validator registered successfully", data: {
            ...validator,
            wallet_balance: validator.wallet_balance.toString()
            
        }})
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Internal server error"})
    }
}


export const stakeValidator = async (req: Request, res: Response) => {
    try {
        const cleanedBody = stakeValidatorSchema.parse(req.body);
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                role:"VALIDATOR"
            },
            include: {
                validator: true
            }
        })
        if(!user) {
            return res.status(401).json({message: "Unauthorized"})
        }
        if(!user.validator) {
            return res.status(401).json({message: "Unauthorized"})
        }
        const amount = await verifyStake(cleanedBody.signature)
        if(!amount){
            return res.status(400).json({message: "Invalid transaction"})
        }
        const validator = await prisma.validator.update({
            where: {
                user_id: userId
            },
            data: {
                stake_amount: {
                    increment: amount
                }
            }
        })
        if(validator.stake_amount >= 500_000_000){
            await prisma.validator.update({
                where: {
                    user_id: userId
                },
                data: {
                    is_active: true
                }
            })
        }
        else {
            await prisma.validator.update({
                where: {
                    user_id: userId
                },
                data: {
                    is_active: false
                }
            })
        }
        return res.status(200).json({message: "Validator staked successfully", amount: validator.stake_amount.toString()})
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Internal server error"})
    }
}

export const registerValidatorRegion = async(req: Request, res: Response) => {
    try {
        const cleanedBody = registerValidatorRegionSchema.parse(req.body);
        const user = await prisma.user.findUnique({
            where: {
                wallet_pubkey: cleanedBody.pubkey,
                role:"VALIDATOR"
            }
        })
        if(!user) {
            return res.status(404).json({message: "Validator not found"})
        }
        await prisma.validator.update({
            where: {
                user_id: user.id
            },
            data: {
                continent: cleanedBody.continent
            }
        })
        return res.status(200).json({message: "Validator region registered successfully"})
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Internal server error"})
    }
}

export const getValidatorsByRegion = async (req: Request, res: Response) => {
    try {
        const validators = await prisma.validator.findMany()
        const continentGroupedValidatorsCount: Record<string, number> = {}
        validators.forEach((validator) => {
            const continent = validator.continent
            if (!continent) return
            continentGroupedValidatorsCount[continent] =
              (continentGroupedValidatorsCount[continent] ?? 0) + 1
        })
        return res.status(200).json({message: "Validators found", data: continentGroupedValidatorsCount})
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Internal server error"})
    }
}
