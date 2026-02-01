import {config} from 'dotenv'
config()

export const env = {
    CLIENT_URL: String(process.env.CLIENT_URL),
    PORT: Number(process.env.PORT || 5050),
    JWT_SECRET_KEY: String(process.env.JWT_SECRET_KEY),
    RPC_URL: String(process.env.RPC_URL || "http://localhost:8899"),
}