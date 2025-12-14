import express from 'express'
import { env } from './config'
import indexRouter from './routes'
import cors from 'cors'
const app = express()

app.use(express.json())
app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true
}))

app.use("/api/v1", indexRouter)
app.get("/", (_, res)=>{
    res.status(200).json({
        message:"Alrighty Let's start"
    })
})

app.listen(env.PORT, ()=>{
    console.log(`Server is running on port ${env.PORT}`)
})