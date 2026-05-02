import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Coins, Cpu, CheckCircle, Activity, Wallet, AlertCircle, Copy } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useUserStore } from '@/store/userStore';
import { useNavigate } from 'react-router-dom';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, AnchorProvider, BN, type Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import idl from '../idl/contract.json';
import { axiosClient } from '@/config';

const VALIDATOR_DOCKER_RUN_COMMAND =
  'sudo docker run -e PRIVATE_KEY=YOUR_PRIVATE_KEY -e PUBLIC_KEY=YOUR_PUBLIC_KEY -e QUEUE_API=QUEUE_API_URL --network host vignesh9123/validator-container';

const ValidatorDashboard = () => {
  const { isLoading, isAuthenticated, user } = useUserStore();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [validator, setValidator] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [stakeSuccessDialogOpen, setStakeSuccessDialogOpen] = useState(false);
  const [dockerCommandCopied, setDockerCommandCopied] = useState(false);
  const [isStoppingNode, setIsStoppingNode] = useState(false);
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
      if (user && user.role.toLowerCase() === 'validator') {
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
    const getDashboard = async () => {
      if(user && user.role.toLowerCase() === 'validator'){
        try {
          const response = await axiosClient.get('/validators/dashboard');
          setDashboard(response.data.data);
        } catch (error) {
          console.error("Failed to get validator dashboard", error);
        }
    }
  }
    registerPubkey();
    getValidator();
    getDashboard();
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

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        const response = await axiosClient.get('/validators/dashboard');
        setDashboard(response.data.data);
      } catch (e) {
        // ignore periodic errors
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const nodeIdShort = useMemo(() => {
    const id = dashboard?.nodeId as string | undefined;
    if (!id) return '--';
    if (id.length <= 10) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  }, [dashboard]);

  const regionText = useMemo(() => {
    return (dashboard?.region as string | undefined) ?? 'Unknown';
  }, [dashboard]);

  const isNodeActive = useMemo(() => {
    return Boolean(dashboard?.isActive);
  }, [dashboard]);

  const totalEarningsSol = useMemo(() => {
    const v = dashboard?.totalEarningsSol;
    if (typeof v !== 'number') return '--';
    return `${v.toFixed(9)} SOL`;
  }, [dashboard]);

  const perFinalizedRoundRewardText = useMemo(() => {
    const items = (dashboard?.recentActivity as any[] | undefined) ?? [];
    const finalized = items.filter((i) => i?.isFinalized && typeof i?.earningSol === 'number');
    if (finalized.length === 0) return '--';
    const avg = finalized.reduce((s, i) => s + i.earningSol, 0) / finalized.length;
    if (!Number.isFinite(avg)) return '--';
    return `${avg.toFixed(6)} SOL per finalized round`;
  }, [dashboard]);

  const tasksCompleted = useMemo(() => {
    const v = dashboard?.finalizedRounds;
    if (typeof v !== 'number') return '--';
    return v.toLocaleString();
  }, [dashboard]);

  const recentActivity = useMemo(() => {
    return (dashboard?.recentActivity as any[] | undefined) ?? [];
  }, [dashboard]);

  const copyDockerCommand = async () => {
    try {
      await navigator.clipboard.writeText(VALIDATOR_DOCKER_RUN_COMMAND);
      setDockerCommandCopied(true);
      window.setTimeout(() => setDockerCommandCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const handleStake = async () => {
    if (!program || !wallet || !stakeAmount) return;
    if(parseFloat(stakeAmount) < 0.5 && validator?.stake_amount == 0) {
      alert("Minimum stake amount is 0.5 SOL.");
      return;
    }
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
      setStakeSuccessDialogOpen(true);
    } catch (error) {
      console.error("Staking failed", error);
      alert("Staking failed. See console for details.");
    } finally {
      setIsStaking(false);
    }
  };

  const handleStopNode = async () => {
    if (!isNodeActive) return;
    if (!window.confirm('Stop your validator node? It will stop receiving tasks until you run the container again and meet stake requirements.')) {
      return;
    }
    setIsStoppingNode(true);
    try {
      await axiosClient.post('/validators/deactivate');
      const response = await axiosClient.get('/validators/dashboard');
      setDashboard(response.data.data);
    } catch (error) {
      console.error('Failed to deactivate validator', error);
      alert('Failed to stop node. See console for details.');
    } finally {
      setIsStoppingNode(false);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog
        open={stakeSuccessDialogOpen}
        onOpenChange={(open) => {
          setStakeSuccessDialogOpen(open);
          if (!open) setDockerCommandCopied(false);
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Staking successful</DialogTitle>
            <DialogDescription>
              Run the validator container on your machine. Replace YOUR_PRIVATE_KEY, YOUR_PUBLIC_KEY, and QUEUE_API_URL
              with your values before running.
            </DialogDescription>
          </DialogHeader>
          <div className="relative rounded-md border bg-muted/50 p-3 pr-12">
            <pre className="max-h-[200px] overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
              {VALIDATOR_DOCKER_RUN_COMMAND}
            </pre>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 shrink-0"
              onClick={copyDockerCommand}
              title="Copy command"
              aria-label="Copy Docker command"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {dockerCommandCopied ? (
            <p className="text-sm text-muted-foreground">Copied to clipboard.</p>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setStakeSuccessDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Validator Node</h2>
          <p className="text-muted-foreground">Node ID: {nodeIdShort} • Region: {regionText}</p>
        </div>
        <div className="flex gap-2 items-center">
          <WalletMultiButton className="!bg-primary !h-10" />
          {isNodeActive ? (
            <Badge variant="outline" className="text-green-600 border-green-600 px-4 py-1">Node Active</Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600 px-4 py-1">Node Inactive</Badge>
          )}
          <Button
            variant="destructive"
            disabled={!isNodeActive || isStoppingNode}
            onClick={handleStopNode}
          >
            {isStoppingNode ? 'Stopping…' : 'Stop Node'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Stake SOL
          </CardTitle>
          <CardDescription>Stake SOL to activate your validator node and earn rewards.<br />Minimum stake amount is 0.5 SOL.</CardDescription>
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
            <div className="text-2xl font-bold">{totalEarningsSol}</div>
            <p className="text-xs text-slate-400">{perFinalizedRoundRewardText}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasksCompleted}</div>
            <p className="text-xs text-muted-foreground">Finalized rounds</p>
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
            {recentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                No recent activity yet.
              </div>
            ) : recentActivity.map((a) => {
              const ts = new Date(a.roundTimestamp);
              const timeText = Number.isNaN(ts.getTime()) ? '' : ts.toLocaleString();
              const earningText = a.isFinalized ? `+${a.earningSol.toFixed(9)} SOL` : 'Pending';
              const earningClass = a.isFinalized ? 'text-green-600' : 'text-muted-foreground';
              const statusBadge =
                a.status === 'UP'
                  ? <Badge className="bg-green-500 hover:bg-green-600">UP</Badge>
                  : a.status === 'DOWN'
                  ? <Badge variant="destructive">DOWN</Badge>
                  : <Badge className="bg-amber-500 hover:bg-amber-600">UNKNOWN</Badge>

              return (
                <div key={`${a.websiteId}-${a.roundTimestamp}`} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-full">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">Validated: {a.websiteUrl}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {statusBadge} <span className="ml-2">Latency: {Math.round(a.responseTimeMs)}ms</span> <span className="ml-2">•</span> <span className="ml-2">{timeText}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${earningClass}`}>{earningText}</span>
                    <p className="text-xs text-muted-foreground">{a.isFinalized ? 'Finalized' : 'Awaiting RoundResult'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidatorDashboard;