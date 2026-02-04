import express from 'express';
import { config } from 'dotenv'
config()
import {CheckStatus, prisma} from '@uptime-chain/database'
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PinataSDK } from "pinata";
import { decodeUTF8 } from 'tweetnacl-util';
import { PublicKey } from '@solana/web3.js';

const app = express();
app.use(express.json())
const ROUND_TIMEOUT_MS = 120_000;
const MIN_QUORUM_RATIO = 2 / 3;
const MIN_VALIDATORS = 3;


const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

type ValidatorSubmission = {
    validatorPubkey: string;
    signature: string;
    data:{
        targetUrl: string;
        latency: number;
        status: string;
        certificateExpiryTs: number;
    };
    submittedAt: number;
    continent: string
  };
  
  type RoundKey = string; // `${targetUrl}:${roundTimestamp}`
  
  type RoundCollector = {
    targetUrl: String;
    roundTimestamp: number;
    expectedValidators: Set<string>;
    submissions: Map<string, ValidatorSubmission>;
    startedAt: number;
    finalized: boolean;
  };
  
  const rounds = new Map<RoundKey, RoundCollector>();

  function roundKey(targetUrl: String, ts: number): RoundKey {
    return `${targetUrl}:${ts}`;
  }
  
  function requiredQuorum(expectedCount: number): number {
    return Math.max(
      MIN_VALIDATORS,
      Math.ceil(expectedCount * MIN_QUORUM_RATIO)
    );
  }
  function startRound(
    targetUrl: String,
    roundTimestamp: number,
    activeValidators: string[]
  ) {
    const key = roundKey(targetUrl, roundTimestamp);
  
    if (rounds.has(key)) return;
  
    rounds.set(key, {
      targetUrl,
      roundTimestamp,
      expectedValidators: new Set(activeValidators),
      submissions: new Map(),
      startedAt: Date.now(),
      finalized: false,
    });
  }

  function onValidatorSubmit(
    targetUrl: String,
    roundTimestamp: number,
    submission: ValidatorSubmission
  ) {
    console.log("Received submission", submission)
    const key = roundKey(targetUrl, roundTimestamp);
    const round = rounds.get(key);
    if (!round || round.finalized) return;
  
    // if (!round.expectedValidators.has(submission.validatorPubkey)) return;
  
    // if (round.submissions.has(submission.validatorPubkey)) return;
  
    if (!verifySignature(submission)) return;
  
    round.submissions.set(submission.validatorPubkey, submission);
  
    maybeFinalizeRound(round);
  }
  function maybeFinalizeRound(round: RoundCollector) {
    if (round.finalized) return;
  
    const submissionCount = round.submissions.size;
    const quorum = requiredQuorum(round.expectedValidators.size);
  
    const now = Date.now();
    const timedOut = now - round.startedAt >= ROUND_TIMEOUT_MS;
  
    if (submissionCount >= quorum || timedOut) {
      console.log("Finalizing round")
      finalizeRound(round);
    }
  }
  async function finalizeRound(round: RoundCollector) {
    round.finalized = true;
  
    const submissions = Array.from(round.submissions.values());
  
    const upCount = submissions.filter(s => s.data.latency).length;
    const uptimePercent = Math.round(
      (upCount / submissions.length) * 10000
    ); 
    const latencies = submissions
      .filter(s => s.data.latency)
      .map(s => s.data.latency)
      .sort((a, b) => a - b);
  
    const medianLatency =
      latencies.length === 0
        ? 0
        : latencies[Math.floor(latencies.length / 2)];
  
    const report = {
      targetUrl: round.targetUrl,
      roundTimestamp: round.roundTimestamp,
      submissions,
      uptimePercent,
      medianLatency,
      status: submissions[0]?.data.status // TODO: Handle this
    };
    console.log("Report", report)
    const report_hash = await uploadToIpfs(report);
    console.log("Report Hash", report_hash)
    await submitRoundOffChain({
      targetUrl: round.targetUrl as string,
      roundTimestamp: round.roundTimestamp,
      uptimePercent,
      medianLatency: medianLatency!,
      report_hash,
      status: submissions[0]?.data.status!
    });
    console.log("Submitted on chain")
    const website = await prisma.website.findUnique({
      where:{
        url:round.targetUrl as string
      }
    })
    rounds.delete(roundKey(round.targetUrl, round.roundTimestamp));
  }    

  app.post("/start-round", (req, res)=>{
    console.log("Req body", req.body)
    const {body }: {body:{
      targetUrl: String,
    roundTimestamp: number,
    activeValidators: string[]
    }} = req 
    const roundData:{
      targetUrl: String,
    roundTimestamp: number,
    activeValidators: string[]
    } = body
    console.log("Starting round")
    startRound(roundData.targetUrl, roundData.roundTimestamp, roundData.activeValidators)
    res.status(200).json({message:"Round started successfully"})
  })

  app.post("/submit-round", (req, res)=>{
    const {body }: {body:{
    validatorPubkey: string,
    signature: string,
    data:{
      targetUrl: string;
      latency: number;
      certificateExpiryTs: number;
      roundTimestamp: number,
      status: string,
    };
    submittedAt: number;
    continent: string
    }} = req 
    const roundData:{
    validatorPubkey: string,
    signature: string,
    data:{
      targetUrl: string;
      latency: number;
      certificateExpiryTs: number;
      roundTimestamp: number,
      status: string,
    };
    submittedAt: number;
    continent: string
    } = body
    onValidatorSubmit(roundData.data.targetUrl, roundData.data.roundTimestamp, roundData)
    res.status(200).json({message:"Round submitted successfully"})
  })
  
async function submitRoundOffChain({
    targetUrl,
    roundTimestamp,
    uptimePercent,
    medianLatency,
    report_hash,
    status
  }: {
    targetUrl: string;
    roundTimestamp: number;
    uptimePercent: number;
    medianLatency: number;
    report_hash: string;
    status: string
  }) {
    const website = await prisma.website.findUnique({
      where: {
        url: targetUrl,
      },
    });
    if (!website) {
      throw new Error(`Website not found for URL: ${targetUrl}`);
    }
    const roundResult = await prisma.roundResult.create({
      data: {
        websiteId: website.id,
        solana_address: "",
        uptime_percentage: uptimePercent,
        responseTime: medianLatency,
        roundTimestamp: new Date(roundTimestamp),
        report_hash,
        status: status as CheckStatus,
      },
    });
    console.log("Round submitted to chain:", roundResult);
}

async function verifySignature(submission: ValidatorSubmission){
    const {signature, data, validatorPubkey} = submission
    const messageBytesToVerify = decodeUTF8(JSON.stringify(data))
    const signatureBytesToVerify = bs58.decode(signature)
    const publicKey = new PublicKey(validatorPubkey).toBytes()
    const isVerified = nacl.sign.detached.verify(
        messageBytesToVerify,
        signatureBytesToVerify,
        publicKey
    );
    return isVerified
}

async function uploadToIpfs(report: any){
  const file = new File([JSON.stringify(report)], "report.json", { type: "application/json" });
  const upload = await pinata.upload.public.file(file);
  console.log(upload)
  return upload.cid
}
setInterval(() => {
    const now = Date.now();
    for (const round of rounds.values()) {
      if (
        !round.finalized &&
        now - round.startedAt >= ROUND_TIMEOUT_MS
      ) {
        finalizeRound(round);
      }
    }
  }, 5_000);
  
app.listen(8080, ()=>{
    console.log("Verifier API is running")
})