import express from 'express'
import { env } from './config'

const app = express()

app.get("/", (_, res)=>{
    res.status(200).json({
        message:"Alrighty Let's start"
    })
})

app.listen(env.PORT, ()=>{
    console.log(`Server is running on port ${env.PORT}`)
})