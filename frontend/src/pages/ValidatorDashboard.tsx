import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, Server, Cpu, CheckCircle, Activity, Wallet } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useUserStore } from '@/store/userStore';
import { useNavigate } from 'react-router-dom';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, AnchorProvider, BN, type Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import idl from '../idl/contract.json';
import { axiosClient } from '@/config';

const ValidatorDashboard = () => {
  const { isLoading, isAuthenticated, user } = useUserStore();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [validator, setValidator] = useState<any>(null);
  useEffect(() => {
    const registerPubkey = async () => {
      if (wallet && user && !user.wallet_pubkey && user.role.toLowerCase() === 'validator') {
        try {
          await axiosClient.post('/validators/register-pubkey', {
            pubkey: wallet.publicKey.toBase58()
          });
        } catch (error) {
          console.error("Failed to register validator pubkey", error);
        }
      }
    };
    const getValidator = async () => {
      if (wallet && user && user.role.toLowerCase() === 'validator') {
        try {
          const response = await axiosClient.get('/validators/get-validator');
          setValidator({
            ...response.data.data,
            stake_amount: Number(response.data.data.stake_amount)
          });
        } catch (error) {
          console.error("Failed to get validator", error);
        }
      }
    };
    registerPubkey();
    getValidator();
  }, [wallet, user]);

  const programId = useMemo(() => new PublicKey(idl.address), []);

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as Idl, provider);
  }, [provider]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated]);

  const handleStake = async () => {
    if (!program || !wallet || !stakeAmount) return;
    setIsStaking(true);
    try {
      const amount = new BN(parseFloat(stakeAmount) * 1e9);

      const [validatorAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("validator"), wallet.publicKey.toBuffer()],
        programId
      );

      const [stakePool] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_pool")],
        programId
      );

      const tx = await program.methods
        .validatorStake(amount)
        .accounts({
          validatorAccount,
          validator: wallet.publicKey,
          stakePool,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Transaction signature", tx);

      const res = await axiosClient.post('/validators/stake', { signature: tx });
      setValidator({
        ...validator,
        stake_amount: Number(res.data.amount)
      });

      setStakeAmount('');
      alert("Staking successful!");
    } catch (error) {
      console.error("Staking failed", error);
      alert("Staking failed. See console for details.");
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Validator Node</h2>
          <p className="text-muted-foreground">Node ID: 0x71...3A9 • Region: Asia/Kolkata</p>
        </div>
        <div className="flex gap-2 items-center">
          <WalletMultiButton className="!bg-primary !h-10" />
          <Badge variant="outline" className="text-green-600 border-green-600 px-4 py-1">Node Active</Badge>
          <Button variant="destructive">Stop Node</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Stake SOL
          </CardTitle>
          <CardDescription>Stake SOL to activate your validator node and earn rewards.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Amount in SOL"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                disabled={isStaking}
              />
            </div>
            <Button
              onClick={handleStake}
              disabled={isStaking || !wallet || !stakeAmount}
              className="w-32"
            >
              {isStaking ? "Staking..." : "Stake"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Earnings</CardTitle>
            <Coins className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14.2 SOL</div>
            <p className="text-xs text-slate-400">≈ $2,400 USD</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,432</div>
            <p className="text-xs text-muted-foreground">Successful validations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reputation Score</CardTitle>
            <Server className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98/100</div>
            <p className="text-xs text-muted-foreground">High reliability tier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staked Amount</CardTitle>
            <Cpu className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validator?.stake_amount / 1e9} SOL</div>
            <p className="text-xs text-muted-foreground">≈ ${validator?.stake_amount / 1e9 * 100.77} USD</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Logs */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Live Validation Feed</CardTitle>
          <CardDescription>Real-time tasks processed by your node.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="bg-muted p-2 rounded-full">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">Validated: example-service-{i}.com</p>
                    <p className="text-xs text-muted-foreground mt-1">Task ID: #882{i} • Type: SSL_CHECK</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-600">+0.002 SOL</span>
                  <p className="text-xs text-muted-foreground">2s ago</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidatorDashboard;