import express from 'express'
import { env, program, provider } from './config'
import indexRouter from './routes'
import cors from 'cors'
import { prisma } from '@uptime-chain/database'
import { Keypair, PublicKey } from '@solana/web3.js'
import { web3 } from '@coral-xyz/anchor'
import { registerValidatorOnChain } from './controllers/validator.controller'
const app = express()

app.use(express.json())
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true
}))
app.use("/api/v1", indexRouter)
app.get("/", (_, res) => {
  res.status(200).json({
    message: "Alrighty Let's start"
  })
})

app.post("/initialize-pre-accs", async (req, res) => { // TODO: This should not be a route eventually will change this to something else
  try {
    if(!program.methods.initializeStakePool){
      throw new Error("Program methods not initialized")
    }
    if(!program.methods.initializeRewardVault){
      throw new Error("Program methods not initialized")
    }
    const authority = Keypair.fromSecretKey(env.VALIDATOR_AUTHORITY_PRIVATE_KEY);
    await program.methods.initializeStakePool()
    .accounts({
      authority: authority.publicKey
    })
    .signers([authority])
    .rpc()
    await program.methods.initializeRewardVault()
    .accounts({
      authority: authority.publicKey
    })
    .signers([authority])
    .rpc()
    const rewardSeeds = [
      Buffer.from("reward_vault")
    ]
    const [rewardPDA] = PublicKey.findProgramAddressSync(rewardSeeds, program.programId)
    const airdropTxn3 = await provider.connection.requestAirdrop(rewardPDA,1 * web3.LAMPORTS_PER_SOL) // TODO: Move this somewhere else
    await provider.connection.confirmTransaction(airdropTxn3)
    console.log("Reward PDA: ", rewardPDA.toBase58())

    const stake_seeds = [
      Buffer.from("stake_pool")
    ]
    const [stakePDA] = PublicKey.findProgramAddressSync(stake_seeds, program.programId)
    console.log("Stake PDA: ", stakePDA.toBase58())

    res.status(200).json({
      message: "Pre-accounts initialized successfully"
    })
  } catch (error) {
    console.error("Failed to initialize pre-accounts", error)
    res.status(500).json({
      message: "Failed to initialize pre-accounts"
    })
  }
})

app.post("/register-validator-on-chain", async (req, res) => {
  try {
    const validatorPubkey = req.body.validatorPubkey
    await registerValidatorOnChain(validatorPubkey)
    res.status(200).json({
      message: "Validator registered on chain successfully"
    })
  }
  catch (error) {
    console.error("Failed to register validator on chain", error)
    res.status(200).json({
      message: "Failed to register validator on chain"
    })
  }
})

try {
  await prisma.$connect()
  await prisma.$queryRaw`SELECT 1`
  console.log("Database is reachable")
  app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`)
  })
} catch (err) {
  console.error("Database connection failed", err)
  process.exit(1)
}
