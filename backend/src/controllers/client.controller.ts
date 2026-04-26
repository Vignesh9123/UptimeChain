import { prisma } from "@uptime-chain/database";
import type {Request, Response} from "express";
import * as z from "zod";
import { connection, txParser, instructionCoder, PROGRAM_ID, program , authority} from "../config";

const amountAddedToWalletSchema = z.object({
    signature: z.string().min(1),
})

async function getAmountAddedToWallet(txSig: string) {
    const parsedTxn = await connection.getParsedTransaction(txSig, {
      maxSupportedTransactionVersion: 0  
    })
    console.log("Parsed txn", parsedTxn) // TODO: To be completed
    return BigInt(0)
}

export async function verifyAmountAddedToWallet(req: Request, res: Response){
    try {
        const userId = req.user.id
        const user = await prisma.user.findFirst({
            where:{
                id: userId,
                role:"CLIENT"
            }
        })
        if(!user) return res.status(401).json({message: "Unauthorized"})
        const cleanedBody = amountAddedToWalletSchema.parse(req.body)
        const amount = await getAmountAddedToWallet(cleanedBody.signature)
        const wallet_balance = user.wallet_balance
        const updated_wallet_balance = wallet_balance + amount
        const updatedUser = await prisma.user.update({
            where:{
                id: userId
            },
            data:{
                wallet_balance: updated_wallet_balance
            }
        })
        return res.status(200).json({message: "Amount verified successfully", data: user})
    } catch (error) {
        console.error(error)
        return res.status(500).json({message: "Internal server error"})
    }
}