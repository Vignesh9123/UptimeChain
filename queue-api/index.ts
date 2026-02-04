import express from 'express';
import { createClient } from 'redis';
import * as z from 'zod'
import { config } from 'dotenv'
config()
const app = express()

const QUEUE_URL = process.env.QUEUE_URL
const VERIFIER_URL = process.env.VERIFIER_URL
if(!VERIFIER_URL || !QUEUE_URL) throw new Error("Missing environment variables")
app.use(express.json())
app.set("trust proxy", true)
const client = await createClient({
    url: QUEUE_URL
})
  .on("error", (err) => console.log("Redis Client Error", err))
  .connect();
const taskSchema = z.object({
    targetUrl: z.url(),
    roundTimestamp: z.number().int().min(0).optional() // TODO: Remove optional afterwards
})

const resultSchema = z.object({
    data: z.object({
        targetUrl: z.url(),
        latency: z.number().int().min(0),
        certificateExpiryTs: z.number().int().min(0),
        roundTimestamp: z.number().int().min(0),
        status: z.enum(["UP", "DOWN", "UNKNOWN"]),
    }),
    signature: z.string(),
    validatorPubkey: z.string()
})

app.post("/api/push-task", async (req, res)=>{
    try {
        const {body} = req
        const cleanedBody = taskSchema.parse(body)
        await client.rPush("task-queue", JSON.stringify(cleanedBody))
        console.log("Task pushed successfully", cleanedBody)
        return res
        .status(200)
        .json({
            message:"Task pushed successfully"
        })
    }
    catch(e){
        return res
        .status(500)
        .json({
            message:"Task push failed"
        })
    }
})

app.get("/api/fetch-task", async (req, res) => {
    try {
      const now = Date.now()
      const TWO_MINUTES = 2 * 60 * 1000
      let index = 0;
      while (true) {
        const taskStr = await client.lIndex("task-queue", index)
  
        if (!taskStr) {
          return res.status(200).json({
            task: null,
            message: "Queue is empty"
          })
        }
  
        let task
        try {
          task = taskSchema.parse(JSON.parse(taskStr))
        } catch {
          await client.lPop("task-queue")
          continue
        }
  
        if (!task.roundTimestamp) {
          await client.lPop("task-queue")
          continue
        }
  
        const age = now - task.roundTimestamp
  
        if (age > TWO_MINUTES) {
          await client.lPop("task-queue")
          continue
        }
        const checkValidatorHasSubmitted = await client.get(`result:${task.targetUrl + req.headers["x-public-key"]}`)
        if(checkValidatorHasSubmitted){
          index++;
          continue
        }
        return res.status(200).json({
        task
        })
      }
    } catch (e) {
      return res.status(500).json({
        message: "Failed to fetch task"
      })
    }
})

app.post("/api/result-submit", async (req, res) => {
    try {
      const {body} = req
      const validatorIp = req.ip?.endsWith("127.0.0.1") ? undefined : req.ip
      console.log("Val", validatorIp)
      const resp = await fetch(validatorIp ? `http://ip-api.com/json/${validatorIp}?fields=3207167` : `http://ip-api.com/json?fields=3207167`)
      const data = await resp.json() as any
      console.log("Validator IP", data)
      const continent = data.continent
      console.log("Continent", continent)
      const cleanedBody = resultSchema.parse(body)
      console.log("Result submitted successfully", cleanedBody)
      await client.setEx(`result:${cleanedBody.data.targetUrl + req.headers["x-public-key"]}`, 2 * 60, JSON.stringify(cleanedBody))
      const resultToSend = {
        ...cleanedBody,
        submittedAt: Date.now(),
        continent
      }
      await fetch(`${VERIFIER_URL}/submit-round`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resultToSend),
      });
      return res
      .status(200)
      .json({
        message:"Result submitted successfully"
      })
    }
    catch(e){
      return res
      .status(500)
      .json({
        message:"Result submission failed"
      })
    }
})
  

app.listen(3000, ()=>{
    console.log("Queue API running")
})
