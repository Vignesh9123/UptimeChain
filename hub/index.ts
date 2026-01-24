import { prisma } from "@uptime-chain/database";
const QUEUE_API = 'http://localhost:3000/api'
import axios from "axios";
const queueAxios = axios.create({
    baseURL: QUEUE_API,
})
async function checkWebsiteAndPushToQueue(){
    console.log("subscriptions pull start")
    const now = Date.now()
    const subscriptions = await prisma.websiteSchedule.findMany({
        where: {
            next_run: {
                lte: new Date(now)
            }
        },
        include: {
            website: true
        }
    })
    console.log("subscriptions", subscriptions)
    for(const subscription of subscriptions){
        const website = subscription.website
        const dataToPush = {
            targetUrl: website.url,
            roundTimestamp: now
        }
        await queueAxios.post("/push-task", dataToPush)
        const activeValidatorEntries = await prisma.user.findMany({
            where: {
                role: "VALIDATOR"
            },
            select: {
                wallet_pubkey: true
            }
        })
        const activeValidators = activeValidatorEntries.map(entry => {
            if(entry.wallet_pubkey){
                return entry.wallet_pubkey
            }
        }) as string[]
        await axios.post("http://localhost:8080/start-round", {
            targetUrl: website.url,
            roundTimestamp: now,
            activeValidators
        })
        const new_next_run = new Date(now + subscription.interval_seconds * 1000)
        await prisma.websiteSchedule.update({
            where: {
                id: subscription.id
            },
            data: {
                next_run: new_next_run
            }
        })
    }
}
checkWebsiteAndPushToQueue()
setInterval(checkWebsiteAndPushToQueue, 20 * 1000)