import { config } from "dotenv";
import bs58 from "bs58";
config()

export const env = {
    PINATA_JWT: String(process.env.PINATA_JWT),
    PINATA_GATEWAY: String(process.env.PINATA_GATEWAY),
    RPC_URL: String(process.env.RPC_URL || "http://localhost:8899"),
    VALIDATOR_AUTHORITY_PRIVATE_KEY: bs58.decode(String(process.env.VALIDATOR_AUTHORITY_PRIVATE_KEY)),
}
