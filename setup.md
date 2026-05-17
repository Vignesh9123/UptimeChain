# UptimeChain — Setup & Run Guide

## Prerequisites

Install these before anything else.

- [Node.js + npm](https://nodejs.org) — used by the frontend and to install bun which is used to run all backend services
- [Docker](https://www.docker.com) — for Redis and the validator container
- [PostgreSQL](https://www.postgresql.org) — running locally or via a cloud provider
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) — to manage wallets and deploy the contract
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) — to build and deploy the Solana program

---

## Step 1 — Clone and Install Dependencies

```bash
git clone https://github.com/Vignesh9123/UptimeChain.git
cd UptimeChain

npm i -g bun # if not already installed

bun install

cd frontend && npm install && cd ..
```

---

## Step 2 — Start Redis and Postgres (If not setup in a cloud instance)

```bash
docker run -d -p 6379:6379 redis
docker run -d -p 5432:5432 -e POSTGRES_USER=myusername -e POSTGRES_PASSWORD=mypassword postgres
```

---

## Step 3 — Set Up the Database URL

```bash
cp packages/database/.env.example packages/database/.env
```

Edit `packages/database/.env`:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>"
```

Run migrations:

```bash
cd packages/database
bunx prisma migrate deploy
cd ../..
```

---

## Step 4 — Set Up Pinata (IPFS Storage)

The verifier uploads monitoring reports to IPFS using Pinata.

1. Go to [https://app.pinata.cloud](https://app.pinata.cloud) and create a free account
2. After logging in, go to **API Keys** from the left sidebar
3. Click **New Key**
  - Enable **Admin** permissions (or at minimum enable `pinFileToIPFS`)
  - Give it a name like `uptime-chain`
  - Click **Create Key**
4. Copy the **JWT** token shown — this is your `PINATA_JWT`
5. Go to **Gateways** from the left sidebar
6. Copy your dedicated gateway URL — it looks like `<your-name>.mypinata.cloud`
  - This is your `PINATA_GATEWAY`

You will use these two values in `verifier/.env` in Step 6.

---

## Step 5 — Deploy the Solana Contract

> Skip this if using the already-deployed contract on devnet (`3tezpLbcXZEZmiRjMMWfb2zSgnR39DpsCK8MC2BkFeAH`).

```bash
solana config set --url devnet (or) localhost
solana airdrop 2

cd contract
anchor build
anchor deploy
cd ..
```

---

## Step 6 — Generate a Verifier Keypair

```bash
node -e "
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const kp = Keypair.generate();
console.log('Private key (Base58):', bs58.encode(kp.secretKey));
console.log('Public key:', kp.publicKey.toBase58());
"
```

Fund it on devnet:

```bash
solana airdrop 2 <verifier-public-key> --url devnet
```

---

## Step 7 — Create .env Files

### `backend/.env`

```bash
cp backend/.env.example backend/.env
```

```env
PORT=8000
JWT_SECRET_KEY=any-random-secret
CLIENT_URL=http://localhost:5173
VALIDATOR_AUTHORITY_PRIVATE_KEY=<verifier-base58-private-key>
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>"
SENDER_EMAIL=SENDER_EMAIL
MAIL_APP_PASSWORD=MAIL_APP_PASSWORD
```

### `verifier/.env`

```env
PINATA_JWT=<jwt-from-pinata-api-keys>
PINATA_GATEWAY=<your-name>.mypinata.cloud
RPC_URL=https://api.devnet.solana.com
VALIDATOR_AUTHORITY_PRIVATE_KEY=<verifier-base58-private-key>
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>"
SENDER_EMAIL=SENDER_EMAIL
MAIL_APP_PASSWORD=MAIL_APP_PASSWORD
```

### `queue-api/.env`

```env
QUEUE_URL=redis://localhost:6379
VERIFIER_URL=http://localhost:8080
BACKEND_URL=http://localhost:8000
```

### `hub/.env`

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>"
```

### `frontend/.env`

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_IPFS_GATEWAY=https://<your-name>.mypinata.cloud
```

---

## Step 8 — Run Each Service in a Separate Terminal

Open 5 terminals from the repo root. Start them in this order.

**Terminal 1 — queue-api** (start this first)

```bash
cd queue-api
bun run dev
```

**Terminal 2 — backend**

```bash
cd backend
bun run dev
```

**Terminal 3 — verifier**

```bash
cd verifier
bun run dev
```

**Terminal 4 — hub** (start after queue-api and verifier are up)

```bash
cd hub
bun run dev
```

**Terminal 5 — frontend**

```bash
cd frontend
npm run dev
```



| Service   | Port |
| --------- | ---- |
| queue-api | 3000 |
| backend   | 8000 |
| verifier  | 8080 |
| frontend  | 5173 |
| hub       | —    |


---

## Step 9 — Run a Validator Node

Generate a keypair for the validator:

```bash
node -e "
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const kp = Keypair.generate();
console.log('PRIVATE_KEY=' + bs58.encode(kp.secretKey));
console.log('PUBLIC_KEY=' + kp.publicKey.toBase58());
"
```

Fund it on devnet:

```bash
solana airdrop 2 <validator-public-key> --url devnet
```

**Option A — Docker (recommended)**

```bash
cd validator-container

docker build -t uptime-validator .

docker run -d \
  -e PRIVATE_KEY=<validator-base58-private-key> \
  -e PUBLIC_KEY=<validator-base58-public-key> \
  -e QUEUE_API=http://host.docker.internal:3000/api \
  uptime-validator
```

> On Linux replace `host.docker.internal` with your host machine's actual IP.

**Option B — Terminal (without Docker)**

Create `validator-container/.env`:

```env
PRIVATE_KEY=<validator-base58-private-key>
PUBLIC_KEY=<validator-base58-public-key>
QUEUE_API=http://localhost:3000/api
```

Then in a new terminal:

```bash
cd validator-container
bun run dev
```

---

## Step 10 — Activate the Validator

The validator must be staked to be picked up by the hub. Go to the validator dashboard at `http://localhost:5173`, connect the validator's wallet, and click Stake.

---

You can now access the project at `http://localhost:5173`.