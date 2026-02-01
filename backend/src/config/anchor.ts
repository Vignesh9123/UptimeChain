import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import type { Contract } from "../idl/contract";
import idl from "../idl/contract.json";
import { SolanaParser } from "@shyft.to/solana-transaction-parser";
import { env } from ".";
import { BorshInstructionCoder } from "@coral-xyz/anchor";
 
export const connection = new Connection(env.RPC_URL, "confirmed");
export const PROGRAM_ID = new PublicKey(idl.address);
const provider = new AnchorProvider(connection, {} as any);

export const program = new Program(idl as Contract,provider);


export const txParser = new SolanaParser([{ idl: idl as any, programId: idl.address }]);


export const instructionCoder = new BorshInstructionCoder(idl as Idl);