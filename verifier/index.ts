import express from 'express';
import { config } from 'dotenv'
config()
import {CheckStatus, prisma} from '@uptime-chain/database'
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PinataSDK } from "pinata";
import { decodeUTF8 } from 'tweetnacl-util';
import { PublicKey } from '@solana/web3.js';
import { createHash } from "crypto";
import { program, authority } from './anchor';
import { BN } from '@coral-xyz/anchor';
import { web3 } from '@coral-xyz/anchor';
import { websiteDownEmailTemplate } from './email_templates';
import { sendEmail } from './sendMail';

const app = express();
app.use(express.json())
const ROUND_TIMEOUT_MS = 120_000;
const AFTER_QUORUM_TIMEOUT_MS = 60_000;
const MIN_QUORUM_RATIO = 2 / 3;
const MIN_VALIDATORS = 3;

const MONTH_SECONDS = 2_592_000;

function monthlyPriceSolForCheckIntervalSeconds(checkIntervalSeconds: number): number {
  if (checkIntervalSeconds === 300) return 0.5;
  if (checkIntervalSeconds === 900) return 0.175;
  if (checkIntervalSeconds === 1800) return 0.1;
  if (checkIntervalSeconds === 3600) return 0.075;
  return 0;
}

function solToLamportsBigint(sol: number): bigint {
  const lamportsNumber = Math.round(sol * web3.LAMPORTS_PER_SOL);
  return BigInt(lamportsNumber);
}

async function deductClientBalancesForRound(params: {
  websiteId: string;
  roundTimestampMs: number;
  scheduleIntervalSeconds: number;
}) {
  const { websiteId, roundTimestampMs, scheduleIntervalSeconds } = params;
  const roundDate = new Date(roundTimestampMs);
  const monthlyRounds =
    scheduleIntervalSeconds > 0 ? Math.max(1, Math.floor(MONTH_SECONDS / scheduleIntervalSeconds)) : 1;
  const monthlyRoundsBig = BigInt(monthlyRounds);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      websiteId,
      is_active: true,
    },
    select: {
      id: true,
      userId: true,
      check_interval: true,
      last_checked: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const sub of subscriptions) {

      if (sub.last_checked && sub.last_checked >= roundDate) continue;

      const monthlySol = monthlyPriceSolForCheckIntervalSeconds(sub.check_interval);
      if (monthlySol <= 0) continue;

      const monthlyLamports = solToLamportsBigint(monthlySol);
      const perRoundLamports = monthlyLamports / monthlyRoundsBig; // floor division
      if (perRoundLamports <= 0n) continue;

      const updatedUsers = await tx.user.updateMany({
        where: {
          id: sub.userId,
          wallet_balance: {
            gte: perRoundLamports,
          },
        },
        data: {
          wallet_balance: {
            decrement: perRoundLamports,
          },
        },
      });

      if (updatedUsers.count !== 1) {
        continue;
      }

      await tx.subscription.updateMany({
        where: {
          id: sub.id,
          is_active: true,
          OR: [{ last_checked: null }, { last_checked: { lt: roundDate } }],
        },
        data: {
          last_checked: roundDate,
        },
      });
    }
  });
}


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
    hasQuorumReached: boolean
  };
  
  const rounds = new Map<RoundKey, RoundCollector>();

  function roundKey(targetUrl: String, ts: number): RoundKey {
    return `${targetUrl}:${ts}`;
  }
  
  function checkQuorum(round: RoundCollector) {
    if(round.submissions.size >= MIN_VALIDATORS){
      if((round.submissions.size / round.expectedValidators.size) >= MIN_QUORUM_RATIO){
        round.hasQuorumReached = true
        return
      }
    }
    round.hasQuorumReached = false
    
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
      hasQuorumReached: false
    });
  }

  async function onValidatorSubmit(
    targetUrl: string,
    roundTimestamp: number,
    submission: ValidatorSubmission
  ) {
    console.log("Received submission", submission)
    const key = roundKey(targetUrl, roundTimestamp);
    const round = rounds.get(key);
    console.log("Round for submission", round)
    if (!round || round.finalized) return;
  
    // if (!round.expectedValidators.has(submission.validatorPubkey)) return; // TODO: Uncomment this
  
    if (round.submissions.has(submission.validatorPubkey)) return;
  
    if (!verifySignature(submission)) return;
    const user = await prisma.user.findUnique({
      where: {
        wallet_pubkey: submission.validatorPubkey
      },
      include: {
        validator: true
      }
    });
    const website = await prisma.website.findUnique({
      where: {
        url: targetUrl
      },
    });
    console.log("User", user)
    console.log("Website", website)
    if (!user) return;
    if(!website) return;
    const validator = user.validator;
    console.log("Validator", validator)
    if(!validator) return;
    // if(validator.is_active === false) return; // TODO: Handle this
    await submitValidatorSubmissionsOffChain({
      validatorId: validator.id,
      websiteId: website.id,
      roundTimestamp,
      status: submission.data.status,
      responseTime: submission.data.latency,
      continent: submission.continent,
    })
    round.submissions.set(submission.validatorPubkey, submission);
  
    maybeFinalizeRound(round);
  }
  function maybeFinalizeRound(round: RoundCollector) {
    if (round.finalized) return;
  
    checkQuorum(round);
    console.log("After Quorum check",{
      round
    })
  
    const now = Date.now();
    const timedOut = now - round.startedAt >= ROUND_TIMEOUT_MS;
    const afterQuorumTimeout = now - round.startedAt >= AFTER_QUORUM_TIMEOUT_MS;
    console.log("Times",{
      timedOut,
      afterQuorumTimeout
    })
    if ( (round.hasQuorumReached && afterQuorumTimeout) || timedOut) {
      console.log("Finalizing round")
      finalizeRound(round);
    }
  }
  async function finalizeRound(round: RoundCollector) {
    round.finalized = true;
    console.log("Finalizing round", round)
    const submissions = Array.from(round.submissions.values());
    if(!submissions){
      console.log("No submissions found for round", round)
      return;
    }
  
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
    const status = uptimePercent > 5000 ? "UP" : "DOWN";
    const report = {
      targetUrl: round.targetUrl,
      roundTimestamp: round.roundTimestamp,
      submissions,
      uptimePercent,
      medianLatency,
      status: status
    };
    console.log("Report", report)
    const ipfsCid = await uploadToIpfs(report);
    console.log("Ipfs cid", ipfsCid)
    const reportJson = JSON.stringify(report)
    const reportHash = createHash("sha256").update(Buffer.from(reportJson)).digest()
    const roundPDA = await submitRoundOnChain({
      targetUrl: round.targetUrl as string,
      roundTimestamp: round.roundTimestamp,
      uptimePercent,
      medianLatency: medianLatency!,
      reportHash,
      submissions
    })
    try {
      const website = await prisma.website.findUnique({
        where: { url: String(round.targetUrl) },
        include: { schedules: true },
      });
      const scheduleIntervalSeconds = website?.schedules?.[0]?.interval_seconds ?? 0;
      if (website && scheduleIntervalSeconds > 0) {
        await deductClientBalancesForRound({
          websiteId: website.id,
          roundTimestampMs: round.roundTimestamp,
          scheduleIntervalSeconds,
        });
      }
    } catch (error) {
      console.log("Error deducting client balances", error);
    }
    await submitRoundOffChain({
      targetUrl: round.targetUrl as string,
      roundTimestamp: round.roundTimestamp,
      uptimePercent,
      medianLatency: medianLatency!,
      reportHash,
      ipfsCid: ipfsCid,
      status: status,
      roundPDA
    });
    console.log("Submitted on chain")
    if(status === "DOWN"){
      try {
        const website = await prisma.website.findUnique({
          where: {
            url: String(round.targetUrl),
          },
        })
        if(!website) {
          console.log("Website not found")
          return;
        }
        const users = await prisma.user.findMany({
          where: {
            subscriptions: {
              some: {
                websiteId: website.id
              },
            }
          },
          include: {
            subscriptions: {
              where: {
                websiteId: website.id
              }
            }
          }
        })
        console.log("Users to send mail",users)
        for(const user of users){
          const email = user.email
          const subscription = user.subscriptions[0]
          if(!subscription){
            console.log("Subscription not found")
            continue;
          }
          if(!email){
            console.log("Email not found")
            continue;
          }
          const body = websiteDownEmailTemplate(user.name, subscription.name, new Date(round.roundTimestamp))
          await sendEmail({
            email,
            subject: `Website ${subscription.name} is down`,
            message: body
          })
        }
      } catch (error) {
        console.log("Error sending email", error)
      } 
    }
    else{
      const continentWiseStatus: Record<string, "UP" | "DOWN"> = {};

      const continentSubmissions: Record<string, string[]> = {};
      for (const submission of round.submissions?.values() ?? []) {
        const continent = submission?.continent ?? "";
        const status = submission?.data?.status ?? "";
        if (!continentSubmissions[continent]) {
          continentSubmissions[continent] = [];
        }
        continentSubmissions[continent]!.push(status);
      }

      for (const [continent, statuses] of Object.entries(continentSubmissions)) {
        const downCount = statuses.filter(status => status?.toLowerCase() === "down").length;
        const upCount = statuses.filter(status => status?.toLowerCase() === "up").length;
        if (downCount > upCount) {
          continentWiseStatus[continent] = "DOWN";
        } else {
          continentWiseStatus[continent] = "UP";
        }
      }
      
      const downContinents = Object.keys(continentWiseStatus).filter(continent => continentWiseStatus[continent] === "DOWN");
      if (downContinents.length > 0) {
        console.log("Down continents", downContinents)
        try{
          const website = await prisma.website.findUnique({
            where: {
              url: String(round.targetUrl),
            },
          })
          if(!website) {
            console.log("Website not found")
            return;
          }
          const users = await prisma.user.findMany({
            where: {
              subscriptions: {
                some: {
                  websiteId: website.id
                },
              }
            },
            include: {
              subscriptions: {
                where: {
                  websiteId: website.id
                }
              }
            }
          })
          console.log("Users to send mail",users)
          for(const user of users){
            const email = user.email
            const subscription = user.subscriptions[0]
            if(!subscription){
              console.log("Subscription not found")
              continue;
            }
            if(!email){
              console.log("Email not found")
              continue;
            }
            const body = websiteDownEmailTemplate(user.name, subscription.name, new Date(round.roundTimestamp), downContinents)
            await sendEmail({
              email,
              subject: `Website ${subscription.name} is down`,
              message: body
            })
          }
        }
        catch(error){
          console.log("Error sending email", error)
        }
      }
    }
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

  app.post("/submit-round", async(req, res)=>{
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
    await onValidatorSubmit(roundData.data.targetUrl, roundData.data.roundTimestamp, roundData)
    res.status(200).json({message:"Round submitted successfully"})
  })

async function submitValidatorSubmissionsOffChain({
    validatorId,
    websiteId,
    roundTimestamp,
    status,
    responseTime,
    continent
  }: {
    validatorId: string;
    websiteId: string;
    roundTimestamp: number;
    status: string;
    responseTime: number;
    continent: string;
  }) {
    const validatorSubmission = await prisma.validatorSubmissions.create({
      data: {
        validatorId,
        websiteId,
        roundTimestamp: new Date(roundTimestamp),
        status: status as CheckStatus,
        responseTime,
        continent
      },
    });
    console.log("Validator submission submitted to db:", validatorSubmission);
  }
  
async function submitRoundOffChain({
    targetUrl,
    roundTimestamp,
    uptimePercent,
    medianLatency,
    reportHash,
    ipfsCid,
    status,
    roundPDA
  }: {
    targetUrl: string;
    roundTimestamp: number;
    uptimePercent: number;
    medianLatency: number;
    reportHash: Uint8Array<ArrayBuffer>;
    ipfsCid: string;
    status: string;
    roundPDA: string;
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
        solana_address: roundPDA,
        uptime_percentage: uptimePercent,
        responseTime: medianLatency,
        ipfs_cid: ipfsCid,
        roundTimestamp: new Date(roundTimestamp),
        report_hash: reportHash,
        status: status as CheckStatus,
      },
    });
    console.log("Round submitted to chain:", roundResult);
}

async function submitRoundOnChain({
  targetUrl,
  roundTimestamp,
  uptimePercent,
  medianLatency,
  reportHash,
  submissions
}: {
  targetUrl: string;
  roundTimestamp: number;
  uptimePercent: number;
  medianLatency: number;
  reportHash: Uint8Array;
  submissions: ValidatorSubmission[];
}){
  const website = await prisma.website.findUnique({
    where: {
      url: targetUrl,
    },
  });
  if (!website) {
    throw new Error(`Website not found for URL: ${targetUrl}`);
  }
  const websiteSchedule = await prisma.websiteSchedule.findFirst({
    where: {
      websiteId: website.id
    }
  })
  if(!websiteSchedule) {
    throw new Error(`Website schedule not found for URL: ${targetUrl}`);
  }
  const subscriptions = await prisma.subscription.findMany({
    where: {
      websiteId: website.id,
      is_active: true
    }
  })
  if(!subscriptions) {
    throw new Error(`Subscriptions not found for URL: ${targetUrl}`);
  }
  let monthly_cost = 0
  for(const subscription of subscriptions){
    if(subscription.check_interval === 300){
      monthly_cost += 0.5
    } else if(subscription.check_interval === 900){
      monthly_cost += 0.175
    } else if(subscription.check_interval === 1800){
      monthly_cost += 0.1
    } else if(subscription.check_interval === 3600){
      monthly_cost += 0.075
    }
  }
  const monthly_number_of_rounds = Math.floor(MONTH_SECONDS / websiteSchedule.interval_seconds)
  const cost_per_round = monthly_cost / monthly_number_of_rounds
  const rewardLamports = Math.round(cost_per_round * web3.LAMPORTS_PER_SOL);
  const reward_per_validator = new BN(rewardLamports.toString());
  
  const bytes = Buffer.from(targetUrl, "utf8");
  const target_id = Array.from(
    createHash("sha256").update(bytes).digest()
  );
  const round_timestamp = new BN(Math.floor(roundTimestamp / 1000));
  const validators = submissions.map((submission) => {
    return {
      pubkey: new PublicKey(submission.validatorPubkey),
      isWritable: true,
      isSigner: false
    }
  })
  const reportHashBytes = Array.from(
    reportHash
  )
  console.log("Args for submit round", {
    target_id,
    round_timestamp,
    uptimePercent,
    medianLatency,
    reportHashBytes,
    reward_per_validator
  })
  const txn = await program?.methods
    ?.submitRound?.(
      target_id,
      round_timestamp,
      uptimePercent,
      medianLatency,
      reportHashBytes,
      reward_per_validator
    )
    .accounts({
      verifier: authority.publicKey,
    })
    .signers([authority])
    .remainingAccounts(validators)
    .rpc();

  console.log("Round submitted to with transaction hash:", txn);
  const roundSeeds = [
      Buffer.from("round"),
      Uint8Array.from(target_id),
      round_timestamp.toArrayLike(Buffer, "le", 8)
    ];
  const [roundPDA] = PublicKey.findProgramAddressSync(roundSeeds, program.programId)
  console.log("Round PDA", roundPDA.toBase58())
  return roundPDA.toBase58()
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
    console.log("Signature verified", isVerified)
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
        (!round.finalized && round.hasQuorumReached && 
        now - round.startedAt >= AFTER_QUORUM_TIMEOUT_MS) ||
        (!round.finalized &&
        now - round.startedAt >= ROUND_TIMEOUT_MS)
      ) {
        console.log("Finalizing round at", new Date(now).getTime())
        finalizeRound(round);
      }
    }
  }, 5_000);
  
app.listen(8080, ()=>{
    console.log("Verifier API is running")
})