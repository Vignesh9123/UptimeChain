import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import type { Contract } from "./idl/contract";
import idl from "./idl/contract.json";
import { env } from "./env";

export const authority = Keypair.fromSecretKey(env.VALIDATOR_AUTHORITY_PRIVATE_KEY);
const wallet = new Wallet(authority)

export const connection = new Connection(env.RPC_URL, "confirmed");
export const PROGRAM_ID = new PublicKey(idl.address);
const provider = new AnchorProvider(connection, wallet);

export const program = new Program(idl as Contract,provider);