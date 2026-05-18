import {createHash} from 'crypto'
export const getIPFSReport = async (cid: string) => {
    const response = await fetch(`https://indigo-eligible-gamefowl-203.mypinata.cloud/ipfs/${cid}`)
    const data:any = await response.json()
    console.log(data)
    const json = JSON.stringify(data);
    const report_hash = createHash('sha256').update(Buffer.from(json)).digest('hex');
    console.log("Report hash", report_hash)
    return {
        round_timestamp: data.roundTimestamp, // already in ms,
        report_hash,
        uptime_percent: data.uptimePercent,
        median_latency_ms: data.medianLatency
    }
}
