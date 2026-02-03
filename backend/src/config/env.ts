import {config} from 'dotenv'
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

config()

export const env = {
    CLIENT_URL: String(process.env.CLIENT_URL),
    PORT: Number(process.env.PORT || 5050),
    JWT_SECRET_KEY: String(process.env.JWT_SECRET_KEY),
    RPC_URL: String(process.env.RPC_URL || "http://localhost:8899"),
    VALIDATOR_AUTHORITY_PRIVATE_KEY: bs58.decode(String(process.env.VALIDATOR_AUTHORITY_PRIVATE_KEY)),
}