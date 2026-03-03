import axios from "axios"
import { $ } from "bun"
import bs58 from 'bs58'
import { decodeUTF8 } from "tweetnacl-util"
import nacl from "tweetnacl"
import { config } from "dotenv"
config()
const QUEUE_API = 'https://db08-2406-7400-9a-2610-bd9a-4535-9a2b-4543.ngrok-free.app/api' // TODO: This will change from ngrok to domain when we deploy queue api
const PRIVATE_KEY = process.env.PRIVATE_KEY
const PUBLIC_KEY = process.env.PUBLIC_KEY

const queueAxios = axios.create({
    baseURL: QUEUE_API,
    headers:{
        "X-Public-Key": PUBLIC_KEY
    }
})

async function latencyAndUptimeCheck(targetUrl: string){
    const promise1 = new Promise<{status: string, latency: number}>((resolve, reject) => {
      setTimeout(() => {
        resolve({status:"DOWN", latency: 0})
      }, 10000);  
    })
    const promise2 = new Promise<{status: string, latency: number}>((resolve, reject) => {
        const startTime = Date.now()
        fetch(targetUrl, {method:"HEAD"})
        .then(async (response) => {
            if(response.status !== 200){
                resolve({status:"DOWN", latency: 0})
            }
            const endTime = Date.now()
            const latency = endTime - startTime;
            console.log("Time taken to ping", targetUrl,"is ", latency, "ms")
            resolve({status:"UP", latency})
        })
        .catch((error) => {
            console.log("Error in latencyAndUptimeCheck", error)
            resolve({status:"DOWN", latency: 0})
        })
    })
    const result = await Promise.race([promise1, promise2]) as {status: string, latency: number}
    return result
}

async function sslCertExpiryCheck(targetUrl: string){
    const { hostname } = new URL(targetUrl)
    const output = await $`echo | openssl s_client -servername ${hostname} -connect ${hostname}:443 2>/dev/null | openssl x509 -noout -enddate`.text()
    const expiryTs = new Date(output.split('=')[1] as string).getTime()
    console.log("SSL Cert Expiry", expiryTs)
    return expiryTs;
}
async function main(){
    console.log("PRIVATE_KEY", PRIVATE_KEY)
    console.log("PUBLIC_KEY", PUBLIC_KEY)
    console.log("Starting to pull task")
    try {
        if(!PRIVATE_KEY) return
        if(!PUBLIC_KEY) return
        const {data} = await queueAxios.get("/fetch-task");
        if(!data.task) return
        const {task} = data
        console.log("Task fetched successfully", task)
        const {targetUrl, roundTimestamp} = task;
        // const targetUrl = process.argv[2]
        if(!targetUrl) return
        const {status, latency} = await latencyAndUptimeCheck(targetUrl)
        const expiryTs = await sslCertExpiryCheck(targetUrl)
    
        const dataToSign = {
            targetUrl,
            latency,
            certificateExpiryTs: expiryTs,
            roundTimestamp,
            status
        }
        const secretKey = bs58.decode(PRIVATE_KEY);
        const message = JSON.stringify(dataToSign);
    
        const messageBytes = decodeUTF8(message);
    
        const signature = nacl.sign.detached(messageBytes, secretKey);
    
        const signatureBase58 = bs58.encode(signature);
        const dataToSend = {
            data: dataToSign,
            signature: signatureBase58,
            validatorPubkey: PUBLIC_KEY
        }
        await queueAxios.post("/result-submit", dataToSend);
    } catch (error) {
        console.log("Error in main", error)
    }
}
main()
setInterval(main, 20 * 1000)
