import {program} from "../config";

export const getRoundDetailsFromChain = async(roundPDA: string) => {
    const roundDetails = await (program.account as any).roundSummaryAccount.fetch(roundPDA)
    console.log(roundDetails)
    const report_hash: number[] = roundDetails.reportHash
    console.log(Buffer.from(report_hash).toHex())
    return {
        round_timestamp: roundDetails.roundTimestamp.toNumber() * 1000,
        report_hash,
        uptime_percent: roundDetails.uptimePercent,
        median_latency_ms: roundDetails.medianLatencyMs
    }
}