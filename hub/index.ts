import { prisma } from "@uptime-chain/database";
const QUEUE_API = 'http://localhost:3000/api' // TODO: This will change from ngrok to domain when we deploy queue api
const VERIFIER_API = 'http://localhost:8080'
import axios from "axios";
const queueAxios = axios.create({
    baseURL: QUEUE_API,
})
const verifierAxios = axios.create({
    baseURL: VERIFIER_API,
})
async function checkWebsiteAndPushToQueue(){
    try {
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
            console.log("Pushing task to queue", dataToPush)
            await queueAxios.post("/push-task", dataToPush)
            const activeValidatorEntries = await prisma.validator.findMany({
                where: {
                    is_active: true
                },
                select: {
                    user: {
                        select: {
                            wallet_pubkey: true
                        }
                    }
                }
            })
            const activeValidators = activeValidatorEntries.map(entry => {
                if(entry.user.wallet_pubkey){
                    return entry.user.wallet_pubkey
                }
            }).filter(Boolean) as string[]
            await verifierAxios.post('/start-round', {
                targetUrl: website.url,
                roundTimestamp: now,
                activeValidators
            })
            const new_next_run = new Date(now + subscription.interval_seconds * 1000)
            console.log("New next run", new_next_run)
            await prisma.websiteSchedule.update({
                where: {
                    id: subscription.id
                },
                data: {
                    next_run: new_next_run
                }
            })
        }
    } catch (error) {
        console.log("Error in checkWebsiteAndPushToQueue", error)
    }
}
checkWebsiteAndPushToQueue()
setInterval(checkWebsiteAndPushToQueue, 20 * 1000)