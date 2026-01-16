import axios from "axios"
import { $ } from "bun"
import bs58 from 'bs58'
import { decodeUTF8 } from "tweetnacl-util"
import nacl from "tweetnacl"
import { config } from "dotenv"
config()
const QUEUE_API = 'http://localhost:3000/api'
const PRIVATE_KEY = process.env.PRIVATE_KEY
const PUBLIC_KEY = process.env.PUBLIC_KEY

const queueAxios = axios.create({
    baseURL: QUEUE_API,
    headers:{
        "X-Public-Key": PUBLIC_KEY
    }
})

async function latencyAndUptimeCheck(targetUrl: string){
    const startTime = Date.now()
    const response = await fetch(targetUrl, {method:"HEAD"});
    // console.log("response is", response)
    const endTime = Date.now()
    const latency = endTime - startTime;
    console.log("Time taken to ping", targetUrl,"is ", latency, "ms")
    return latency
}

async function sslCertExpiryCheck(targetUrl: string){
    const { hostname } = new URL(targetUrl)
    const output = await $`echo | openssl s_client -servername ${hostname} -connect ${hostname}:443 2>/dev/null | openssl x509 -noout -enddate`.text()
    const expiryTs = new Date(output.split('=')[1] as string).getTime()
    console.log("SSL Cert Expiry", expiryTs)
    return expiryTs;
}
async function main(){
    if(!PRIVATE_KEY) return
    if(!PUBLIC_KEY) return
    const {data} = await queueAxios.get("/get-task");
    const {task} = data
    const {targetUrl} = task;
    // const targetUrl = process.argv[2]
    if(!targetUrl) return
    const latency = await latencyAndUptimeCheck(targetUrl)
    const expiryTs = await sslCertExpiryCheck(targetUrl)

    const dataToSign = {
        targetUrl,
        latency,
        certificateExpiryTs: expiryTs
    }
    const secretKey = bs58.decode(PRIVATE_KEY);
    const message = JSON.stringify(dataToSign);

    const messageBytes = decodeUTF8(message);

    const signature = nacl.sign.detached(messageBytes, secretKey);

    const signatureBase58 = bs58.encode(signature);
    const dataToSend = {
        data: dataToSign,
        signature: signatureBase58,
        publicKey: PUBLIC_KEY
    }
    await queueAxios.post("/result-submit", {
        result: dataToSend
    });    
}

main()