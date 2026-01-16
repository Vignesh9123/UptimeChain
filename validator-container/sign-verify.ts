import nacl from 'tweetnacl';
import { decodeUTF8 } from 'tweetnacl-util';
import bs58 from 'bs58';
import { Keypair, PublicKey } from '@solana/web3.js';
import { config } from 'dotenv';
config()

// 1. Load your keypair from the private key
// The private key can be a 64-byte Uint8Array or a base58 string (often used by wallets)

// Example with a base58 encoded string (replace with your actual private key)
const privateKeyBase58 = process.env.PRIVATE_KEY!; 
const secretKey = bs58.decode(privateKeyBase58);
const pubKey = process.env.PUBLIC_KEY!

// The Keypair object is useful for accessing the public key easily
const keypair = Keypair.fromSecretKey(secretKey);
const publicKey = new PublicKey(pubKey).toBytes()
const now = Date.now()
// 2. Define the object you want to sign and serialize it
const dataToSign = {
  user: 'alice',
  action: 'vote',
  timestamp: now
};
// Convert the object to a JSON string
const message = JSON.stringify(dataToSign);

// Convert the message string to a Uint8Array (bytes)
const messageBytes = decodeUTF8(message);

// 3. Sign the message
const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

// The signature is a Uint8Array, often useful to encode as base58 for storage or transmission
const signatureBase58 = bs58.encode(signature);
console.log('Signature (Base58):', signatureBase58);

// 4. Verification (to be done by the recipient)
// The recipient needs the original message bytes, the signature bytes, and the signer's public key bytes.

const dataToVerify = {
    user: 'alice',
    action: 'vote',
    timestamp: now
};
const messageBytesToVerify = decodeUTF8(JSON.stringify(dataToVerify))
const signatureBytesToVerify = bs58.decode(signatureBase58)
const isVerified = nacl.sign.detached.verify(
    messageBytesToVerify,
    signatureBytesToVerify,
    publicKey
);

console.log('Signature Verified:', isVerified);
