# UptimeChain

**Decentralized website uptime monitoring on Solana.**

UptimeChain replaces centralized monitoring services with a trustless network of independent validator nodes. Validators collectively check websites, reach consensus on the result, and publish tamper-proof round summaries on the Solana blockchain. Website owners get verifiable uptime records — not just a dashboard they have to trust.

---

## How It Works

1. A client registers a website and a check interval (5, 15, 30, or 60 minutes)
2. The **hub** schedules monitoring rounds and dispatches tasks to a Redis queue
3. **Validator nodes** around the world pull tasks, perform HTTP and SSL checks, sign their results with Ed25519, and submit them
4. The **verifier** collects submissions, applies a 2/3 quorum check, and finalizes the round
5. The full report is uploaded to **IPFS** and its SHA-256 hash is written to the **Solana blockchain**
6. Validators are paid in SOL; clients are billed per round; downtime triggers email alerts

Anyone can independently verify a round by fetching the report from IPFS and comparing its hash to what is on-chain.

---

## Architecture

---

## Services


| Service               | Description                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ |
| `backend`             | REST API for clients and validators. Auth, website management, dashboards.           |
| `hub`                 | Scheduler. Polls due websites every 20s, pushes tasks, starts verifier rounds.       |
| `queue-api`           | Task queue over Redis. Validators pull work and submit results through here.         |
| `verifier`            | Consensus engine. Collects signed submissions, checks quorum, finalizes on-chain.    |
| `validator-container` | Dockerized validator node. Runs HTTP + SSL checks, signs and submits results.        |
| `frontend`            | React dashboard for clients and validators. Solana wallet integration included.      |
| `contract`            | Anchor/Rust smart contract on Solana. Handles staking, rewards, and round summaries. |
| `packages/database`   | Shared Prisma schema and generated client used by all backend services.              |


---

## On-Chain Design

The Solana program manages five PDA account types:

- **StakePool** — holds validator stakes
- **RewardVault** — holds SOL for paying validators
- **ValidatorAccount** — tracks each validator's stake and active status
- **TargetAccount** — represents a monitored website (keyed by SHA-256 of URL)
- **RoundSummaryAccount** — stores uptime %, median latency, and report hash per round

Round summaries are keyed by `(target_id, round_timestamp)` making them independently derivable and verifiable by anyone.

---

## Consensus

- Minimum **3 validator submissions** required to finalize a round
- Submissions must represent at least **2/3 of expected validators** (Byzantine fault threshold)
- Each submission is verified against the validator's **Ed25519 signature** before acceptance
- Round status (UP/DOWN) is determined by majority vote across valid submissions
- Rounds timeout after **120 seconds**; quorum rounds close after **60 seconds post-quorum**

---

## Tech Stack


| Layer             | Technology                            |
| ----------------- | ------------------------------------- |
| Smart contract    | Rust, Anchor framework                |
| Backend services  | TypeScript, Bun                       |
| Database          | PostgreSQL, Prisma ORM                |
| Task queue        | Redis                                 |
| Frontend          | React 18, Vite, Tailwind CSS, Zustand |
| Blockchain        | Solana (devnet)                       |
| IPFS              | Pinata                                |
| Cryptography      | Ed25519 (Tweetnacl), SHA-256          |
| Validator runtime | Docker, Bun, OpenSSL                  |


---

## Getting Started

See [setup.md](./setup.md) for the full setup and run guide, including:

- Prerequisites and installation
- Redis and PostgreSQL setup
- Pinata (IPFS) configuration
- Solana contract deployment
- Environment variables for every service
- Running each service in a separate terminal
- Running a validator node via Docker or terminal

---

## Project Status

This is a research and final-year project implementation. The core monitoring, consensus, and on-chain anchoring pipeline is fully functional. The following are planned for future work:

- Slashing mechanism for dishonest validators
- Merkle tree compression for cheaper on-chain storage
- Decentralized verifier (removes the current centralized trust assumption)
- ZK proofs for private validator verification
- Reputation-based validator selection
- Multi-chain support
- On-chain governance

---

This project was developed in collaboration with:

- **[M Samudhyatha](https://github.com/Samudhyatha)**
- **[Adithi HR](https://github.com/adithihr125)**
- **[Sanath PM](https://github.com/SANATHPM)**

