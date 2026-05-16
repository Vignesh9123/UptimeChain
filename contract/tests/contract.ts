import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";
import {PublicKey} from '@solana/web3.js'
import { expect } from "chai";
import { createHash } from "crypto";

describe("uptime_contract", () => {
  // Configure the client to use the local cluster.
  const provider  = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.contract as Program<Contract>;

  it("Is validator initialized!", async () => {
    const validator = anchor.web3.Keypair.generate()
    const authority = anchor.web3.Keypair.generate()
    const airdropTxn = await provider.connection.requestAirdrop(authority.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL) 
    await provider.connection.confirmTransaction(airdropTxn)
    const txn = await program.methods.initializeValidator()
    .accounts({
      authority: authority.publicKey,
      validator: validator.publicKey
    })
    .signers([authority])
    .rpc()
    console.log("Transaction: ", txn);
    const validatorSeeds = [Buffer.from("validator"), validator.publicKey.toBuffer()]
    const [validatorPDA] = PublicKey.findProgramAddressSync(validatorSeeds, program.programId)
    const validatorAccount = await program.account.validatorAccount.fetch(validatorPDA)
    expect(validatorAccount.validatorPubkey.toBase58()).to.be.equal(validator.publicKey.toBase58())
    expect(validatorAccount.isActive).to.be.equal(false)
    expect(validatorAccount.stakeAmount.toNumber()).to.be.equal(0)
  });

  it("Is target initialized!", async () => {
    const authority = anchor.web3.Keypair.generate()
    const airdropTxn = await provider.connection.requestAirdrop(authority.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL) 
    await provider.connection.confirmTransaction(airdropTxn)
    const normalizedUrl = "https://example.com/api"
    const bytes = Buffer.from(normalizedUrl, "utf8");
    const target_id = Array.from(
      createHash("sha256").update(bytes).digest()
    );    
    const txn = await program.methods.initializeTarget(target_id)
    .accounts({
      authority: authority.publicKey
    })
    .signers([authority])
    .rpc()
    console.log("Transaction: ", txn);
    const targetSeeds = [
      Buffer.from("target"),
      Uint8Array.from(target_id),
    ];
    const [targetPDA] = PublicKey.findProgramAddressSync(targetSeeds, program.programId)
    const targetAccount = await program.account.targetAccount.fetch(targetPDA)
    expect(targetAccount.targetId).to.deep.equal(target_id)
  });
  
  it("Is round submitted!", async () => {
    const verifier = anchor.web3.Keypair.generate()
    const airdropTxn = await provider.connection.requestAirdrop(verifier.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL) 
    await provider.connection.confirmTransaction(airdropTxn)
    const normalizedUrl = "https://example.com/api"
    const bytes = Buffer.from(normalizedUrl, "utf8");
    const target_id = Array.from(
      createHash("sha256").update(bytes).digest()
    );
    const uptime_percent = 10000
    const median_latency_ms = 10
    const report_hash = Array.from(
      createHash("sha256").update(Buffer.from("report_hash")).digest()
    )
    const reward_per_validator = new anchor.BN(0.001 * anchor.web3.LAMPORTS_PER_SOL)
    const validator = anchor.web3.Keypair.generate()
    const airdropTxn2 = await provider.connection.requestAirdrop(validator.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL) 
    await provider.connection.confirmTransaction(airdropTxn2)
    const txn = await program.methods.initializeValidator()
    .accounts({
      authority: verifier.publicKey,
      validator: validator.publicKey
    })
    .signers([verifier])
    .rpc()
    await program.methods.initializeStakePool()
    .accounts({
      authority: verifier.publicKey
    })
    .signers([verifier])
    .rpc()
    await program.methods.initializeRewardVault()
    .accounts({
      authority: verifier.publicKey
    })
    .signers([verifier])
    .rpc()
    const stakeAmount = new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL)
    const stakeTxn = await program.methods.validatorStake(stakeAmount)
    .accounts({
      validator: validator.publicKey
    })
    .signers([validator])
    .rpc()
    console.log("Validator staked", stakeTxn)
    const round_timestamp =  new anchor.BN(Math.floor(Date.now()/1000))
    const rewardSeeds = [
      Buffer.from("reward_vault")
    ]
    const [rewardPDA] = PublicKey.findProgramAddressSync(rewardSeeds, program.programId)
    const airdropTxn3 = await provider.connection.requestAirdrop(rewardPDA,1 * anchor.web3.LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(airdropTxn3)
    const txn2 = await program.methods.submitRound(target_id,round_timestamp, uptime_percent, median_latency_ms, report_hash, reward_per_validator)
    .accounts({
      verifier: verifier.publicKey
    })
    .signers([verifier])
    .remainingAccounts([{
      pubkey: validator.publicKey,
      isWritable: true,
      isSigner: false
    }])
    .rpc()
    console.log("Transaction",txn2)
    const roundSeeds = [
      Buffer.from("round"),
      Uint8Array.from(target_id),
      round_timestamp.toArrayLike(Buffer, "le", 8)
    ];
    const [roundPDA] = PublicKey.findProgramAddressSync(roundSeeds, program.programId)
    const round_account = await program.account.roundSummaryAccount.fetch(roundPDA)
    expect(round_account.medianLatencyMs).to.be.equal(median_latency_ms)
    expect(round_account.uptimePercent).to.be.equal(uptime_percent)
    expect(round_account.roundTimestamp.toNumber()).to.be.equal(round_timestamp.toNumber())
    expect(round_account.targetId).to.deep.equal(target_id)
    const validator_balance = await provider.connection.getBalance(validator.publicKey)
    expect(validator_balance).to.be.equal(1 * anchor.web3.LAMPORTS_PER_SOL - stakeAmount.toNumber() + reward_per_validator.toNumber())
    const stakeSeeds = [
      Buffer.from("stake_pool")
    ]
    const [stakePDA] = PublicKey.findProgramAddressSync(stakeSeeds, program.programId)
    const stake_balance = await provider.connection.getBalance(stakePDA)
    expect(stake_balance).to.be.greaterThan(stakeAmount.toNumber())
    const verifier_balance = await provider.connection.getBalance(verifier.publicKey)
    console.log("Verifier balance after all", verifier_balance)
  });
  it("Is validator staked!", async () => {
    const validator = anchor.web3.Keypair.generate()
    const airdropTxn = await provider.connection.requestAirdrop(validator.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL) 
    await provider.connection.confirmTransaction(airdropTxn)

    const authority = anchor.web3.Keypair.generate()
    const airdropTxn2 = await provider.connection.requestAirdrop(authority.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL) 
    await provider.connection.confirmTransaction(airdropTxn2)
    const txn1 = await program.methods.initializeValidator()
    .accounts({
      authority: authority.publicKey,
      validator: validator.publicKey
    })
    .signers([authority])
    .rpc()
    console.log("Init val Transaction: ", txn1);
    const txn = await program.methods.validatorStake(new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL))
    .accounts({
      validator: validator.publicKey
    })
    .signers([validator])
    .rpc()
    console.log("Validator stake Transaction: ", txn);
    const validatorSeeds = [Buffer.from("validator"), validator.publicKey.toBuffer()]
    const [validatorPDA] = PublicKey.findProgramAddressSync(validatorSeeds, program.programId)
    const validatorAccount = await program.account.validatorAccount.fetch(validatorPDA)
    expect(validatorAccount.stakeAmount.toNumber()).to.be.equal(0.5 * anchor.web3.LAMPORTS_PER_SOL)

    const validatorBalance = await provider.connection.getBalance(validator.publicKey)
    expect(validatorBalance).to.be.lessThanOrEqual(0.5 * anchor.web3.LAMPORTS_PER_SOL)
  });
  it("Is validator staked!", async () => {
    const validator = anchor.web3.Keypair.generate()
    const airdropTxn = await provider.connection.requestAirdrop(validator.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL) 
    await provider.connection.confirmTransaction(airdropTxn)

    const authority = anchor.web3.Keypair.generate()
    const airdropTxn2 = await provider.connection.requestAirdrop(authority.publicKey, 50 * anchor.web3.LAMPORTS_PER_SOL) 
    await provider.connection.confirmTransaction(airdropTxn2)
    const txn1 = await program.methods.initializeValidator()
    .accounts({
      authority: authority.publicKey,
      validator: validator.publicKey
    })
    .signers([authority])
    .rpc()
    console.log("Init val Transaction: ", txn1);
    const txn = await program.methods.validatorStake(new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL))
    .accounts({
      validator: validator.publicKey
    })
    .signers([validator])
    .rpc()
    console.log("Validator stake Transaction: ", txn);
    
    const txn2 = await program.methods
    .validatorUnstake()
    .accounts({
      validator: validator.publicKey
    })
    .signers([validator])
    .rpc()
    console.log("Validator unstake Transaction: ", txn2);

    const validatorSeeds = [Buffer.from("validator"), validator.publicKey.toBuffer()]
    const [validatorPDA] = PublicKey.findProgramAddressSync(validatorSeeds, program.programId)
    const validatorAccount = await program.account.validatorAccount.fetch(validatorPDA)
    expect(validatorAccount.stakeAmount.toNumber()).to.be.equal(0)
    expect(validatorAccount.isActive).to.be.equal(false)
    const validatorBalance = await provider.connection.getBalance(validator.publicKey)
    console.log("Validator balance", validatorBalance)
    expect(validatorBalance).to.be.lessThanOrEqual(1 * anchor.web3.LAMPORTS_PER_SOL)
  });
  
});
