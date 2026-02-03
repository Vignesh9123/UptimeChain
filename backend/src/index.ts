import express from 'express'
import { env, program } from './config'
import indexRouter from './routes'
import cors from 'cors'
import { prisma } from '@uptime-chain/database'
import { Keypair } from '@solana/web3.js'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
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
