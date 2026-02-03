import { prisma } from "@uptime-chain/database";
import type {Request, Response} from "express";
import * as z from "zod";
import { connection, txParser, instructionCoder, PROGRAM_ID, program , env} from "../config";
import { Keypair } from "@solana/web3.js";

const stakeValidatorSchema = z.object({
    signature: z.string().min(1),
})

const registerValidatorPubkeySchema = z.object({
    pubkey: z.string().min(1),
})
const registerValidatorOnChain = async (validatorPubkey: string) => {
    try {
        if(!program.methods.initializeValidator){
            return
        }

        const authority = Keypair.fromSecretKey(env.VALIDATOR_AUTHORITY_PRIVATE_KEY);
        
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

export async function verifyStake(txSig: string) {
    const parsed = await txParser.parseTransaction(connection, txSig);
    if(!parsed){
        console.error("Transaction not found")
        return
    }
    const instruction = parsed[0];
    if(!instruction?.name){
        console.error("Instruction not found")
        return
    }
    console.log(instruction.programId.toBase58())
    if(instruction.programId.toBase58() !== PROGRAM_ID.toBase58()){
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
        return res.status(200).json({message: "Validator found", data: user.validator})
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Internal server error"})
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
        console.log(user)
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
        return res.status(200).json({message: "Validator registered successfully", data: validator})
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
        return res.status(200).json({message: "Validator staked successfully", amount: validator.stake_amount})
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Internal server error"})
    }
}
