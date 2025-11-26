import {config} from 'dotenv'
config()

export const env = {
    PORT: Number(process.env.PORT || 5050),
}