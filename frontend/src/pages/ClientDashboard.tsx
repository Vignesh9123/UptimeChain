import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Activity, ShieldCheck, Clock, CheckCircle, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AddWebsiteForm } from '@/components/AddWebsiteForm';
import { RenewWebsiteDialog } from '@/components/RenewWebsiteDialog';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { getDashboardOverviewForUser, getLatestResultsForUser, getUserWebsites, type DashboardOverview, type UserWebsite } from '@/services/website.service';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from '../idl/contract.json';
import { axiosClient } from '@/config';

const ClientDashboard = () => {
  const [addWebsiteDialogOpen, setAddWebsiteDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedRenewWebsite, setSelectedRenewWebsite] = useState<UserWebsite | null>(null);
  const [websites, setWebsites] = useState<UserWebsite[]>([]);
  const [latestResults, setLatestResults] = useState<any[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoadingWebsites, setIsLoadingWebsites] = useState(true);
  const { isAuthenticated, isLoading, user } = useUserStore();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const navigate = useNavigate();
  const [rewardAmountSol, setRewardAmountSol] = useState('');
  const [isFundingRewardVault, setIsFundingRewardVault] = useState(false);

  const programId = useMemo(() => new PublicKey((idl as any).address), []);
  const rewardVaultPda = useMemo(() => {
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from("reward_vault")], programId);
    return pda;
  }, [programId]);

  const handleAddSolToRewardVault = async () => {
    if (!wallet || !rewardAmountSol) return;
    const amount = Number(rewardAmountSol);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid SOL amount.");
      return;
    }

    setIsFundingRewardVault(true);
    try {
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);
      const ix = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: rewardVaultPda,
        lamports,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction().add(ix);
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = blockhash;

      const signed = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

      setRewardAmountSol('');
      const response = await axiosClient.post('/clients/verify-amount', {
        signature: signature
      })
      if(user)
        user.wallet_balance = response.data.data.wallet_balance;
      alert(`Transferred ${amount} SOL to Reward Vault.\nSignature: ${signature}`);
    } catch (error) {
      console.error("Failed to fund reward vault", error);
      alert("Transfer failed. See console for details.");
    } finally {
      setIsFundingRewardVault(false);
    }
  };

  const fetchWebsites = () => {
    setIsLoadingWebsites(true);
    getUserWebsites()
      .then(data => {
        setWebsites(data);
      })
      .catch(err => {
        console.error("Failed to fetch websites:", err);
      })
      .finally(() => {
        setIsLoadingWebsites(false);
      })
  }

  const fetchLatestResults = () => {
    // setIsLoadingWebsites(true);
    getLatestResultsForUser()
      .then(data => {
        // console.log(data)
        setLatestResults(data);
      })
      .catch(err => {
        console.error("Failed to fetch latest results:", err);
      })
      .finally(() => {
        // setIsLoadingWebsites(false);
      })
  }

  const fetchOverview = () => {
    getDashboardOverviewForUser()
      .then(setOverview)
      .catch((err) => {
        console.error("Failed to fetch dashboard overview:", err);
      })
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }

    if (isAuthenticated) {
      fetchWebsites();
      fetchOverview();
    }
  }, [isLoading, isAuthenticated]);

  useEffect(()=>{
    fetchLatestResults();
    const interval = setInterval(() => {
      fetchLatestResults();
    }, 5000);
    return () => clearInterval(interval);
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchOverview();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated])

  const overallUptimeText = useMemo(() => {
    if (!overview || overview.overallUptimePct === null) return '--'
    return `${overview.overallUptimePct.toFixed(2)}%`
  }, [overview])

  const overallUptimeDeltaText = useMemo(() => {
    if (!overview || overview.overallUptimeDeltaPct === null) return '—'
    const sign = overview.overallUptimeDeltaPct >= 0 ? '+' : ''
    return `${sign}${overview.overallUptimeDeltaPct.toFixed(2)}% from last 30 days`
  }, [overview])

  const globalLatencyText = useMemo(() => {
    if (!overview || overview.globalLatencyMs === null) return '--'
    return `${Math.round(overview.globalLatencyMs)}ms`
  }, [overview])

  const uptimeHistoryData = useMemo(() => {
    return (overview?.uptimeHistory7d ?? []).map((p) => ({
      name: p.name,
      uptime: p.uptime ?? 0,
      hasData: p.uptime !== null,
    }))
  }, [overview])

  const alerts = useMemo(() => {
    return overview?.alerts ?? []
  }, [overview])

  const walletBalanceLamportsText = useMemo(() => {
    const v = user?.wallet_balance;
    if (!v) return '--';
    return v;
  }, [user?.wallet_balance]);

  const walletBalanceSolText = useMemo(() => {
    const v = user?.wallet_balance;
    if (!v) return '--';
    const lamports = Number(v);
    if (!Number.isFinite(lamports)) return '--';
    return (lamports / LAMPORTS_PER_SOL).toFixed(4);
  }, [user?.wallet_balance]);

  if (!isLoading && isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Client Dashboard</h2>
            <p className="text-muted-foreground">Overview of your monitored endpoints and system health.</p>
          </div>
          <div className='flex gap-2'>
            <WalletMultiButton className="!bg-primary !h-10" />
            <div className="hidden items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.000000001"
                inputMode="decimal"
                placeholder="Amount (SOL)"
                value={rewardAmountSol}
                onChange={(e) => setRewardAmountSol(e.target.value)}
                disabled={!wallet || isFundingRewardVault}
                className="w-40"
              />
              <Button
                onClick={handleAddSolToRewardVault}
                disabled={!wallet || isFundingRewardVault || !rewardAmountSol}
              >
                Add SOL
              </Button>
            </div>

            <Button size="lg" className="gap-2 md:hidden" asChild>
              <Link to="/client/add-website">
                <Plus className="h-4 w-4" /> Add Website
              </Link>
            </Button>

          <Dialog open={addWebsiteDialogOpen} onOpenChange={setAddWebsiteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 hidden md:flex">
                <Plus className="h-4 w-4" /> Add New Website
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Website</DialogTitle>
                <DialogDescription>
                  Configure monitoring settings for your website.
                </DialogDescription>
              </DialogHeader>
              <AddWebsiteForm onClose={() => setAddWebsiteDialogOpen(false)} onSuccess={fetchWebsites} />
            </DialogContent>
          </Dialog>

          {selectedRenewWebsite && (
            <RenewWebsiteDialog
              open={renewDialogOpen}
              onOpenChange={(open) => {
                setRenewDialogOpen(open);
                if (!open) setSelectedRenewWebsite(null);
              }}
              onSuccess={() => {
                fetchWebsites();
                fetchOverview();
              }}
              websiteName={selectedRenewWebsite.name}
              subscriptionId={selectedRenewWebsite.id}
              checkInterval={selectedRenewWebsite.check_interval}
            />
          )}
        </div>
          </div>
          <Card className="hidden md:block">
              <CardHeader className="py-2">
                <CardTitle className="text-xs font-medium">Wallet balance</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-sm font-semibold">{walletBalanceSolText} SOL</div>
                <div className="text-[10px] text-muted-foreground">{walletBalanceLamportsText} lamports</div>
              </CardContent>
            </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Uptime</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallUptimeText}</div>
              <p className="text-xs text-muted-foreground">{overallUptimeDeltaText}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status Summary</CardTitle>
              <div className="flex gap-1">
                <span className="flex items-center text-xs text-green-500"><CheckCircle className="h-3 w-3 mr-1" /> {latestResults.filter((result) => result.status === 'UP').length}</span>
                <span className="flex items-center text-xs text-red-500"><XCircle className="h-3 w-3 mr-1" /> {latestResults.filter((result) => result.status !== 'UP').length}</span>
                <span className="flex items-center text-xs text-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" /> {latestResults.filter((result) => result.status === 'UNKNOWN').length}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mt-2">
                <div className="text-center">
                  <span className="text-xl font-bold text-green-600">{latestResults.filter((result) => result.status === 'UP').length}</span>
                  <p className="text-[10px] uppercase text-muted-foreground">Up</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-xl font-bold text-red-600">{latestResults.filter((result) => result.status !== 'UP').length}</span>
                  <p className="text-[10px] uppercase text-muted-foreground">Down</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-xl font-bold text-yellow-600">{latestResults.filter((result) => result.status === 'UNKNOWN').length}</span>
                  <p className="text-[10px] uppercase text-muted-foreground">Degraded</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No active alerts.</div>
                ) : (
                  alerts.map((a) => {
                    const Icon = a.type === 'DOWNTIME' ? AlertTriangle : a.type === 'HIGH_LATENCY' ? Clock : ShieldCheck
                    const iconColor =
                      a.severity === 'critical'
                        ? 'text-red-500'
                        : a.severity === 'warning'
                        ? 'text-yellow-500'
                        : 'text-blue-500'

                    return (
                      <div key={`${a.type}-${a.websiteId}-${a.createdAt}`} className="flex items-start gap-2 text-sm">
                        <Icon className={`h-4 w-4 ${iconColor} mt-0.5`} />
                        <span className="leading-tight">
                          <strong>{a.websiteUrl}</strong>: {a.message}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Latency</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalLatencyText}</div>
              <p className="text-xs text-muted-foreground">Average across all regions (last 24h)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Uptime History (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={uptimeHistoryData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', color: 'black' }}
                      formatter={(value: any, _name: any, props: any) => {
                        if (!props?.payload?.hasData) return ['--', 'Uptime']
                        return [`${Number(value).toFixed(2)}%`, 'Uptime']
                      }}
                    />
                    <Bar dataKey="uptime" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-[#00FF00]" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Monitored Websites</CardTitle>
              <CardDescription>Real-time status of your endpoints.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWebsites ? (
                <div className="flex justify-center p-4">Loading...</div>
              ) : websites.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-muted-foreground mb-4">No websites added yet.</p>
                  <Button size="sm" onClick={() => setAddWebsiteDialogOpen(true)}>Add your first website</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Renews On</TableHead>
                      <TableHead className="text-right">Latency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {websites.map((website) => {
                      const latestResultOfWebsite = latestResults.find((result) => result.websiteId === website.websiteId)
                      const isUp = latestResultOfWebsite?.status === 'UP';
                      const isUnknown = !latestResultOfWebsite || latestResultOfWebsite?.status === 'UNKNOWN';
                      const latency = latestResultOfWebsite?.responseTime;
                      const isCancelled = website.is_cancelled;
                      const isActive = website.is_active;
                      

                      return (
                        <TableRow className='cursor-pointer' key={website.id} onClick={() => {
                          if (isCancelled) {
                            setSelectedRenewWebsite(website);
                            setRenewDialogOpen(true);
                          } else {
                            navigate(`/client/websites/${website.id}`);
                          }
                        }}>
                          <TableCell className="font-medium">{website.name}</TableCell>
                          <TableCell>
                            {isCancelled ? (
                              <Badge className="bg-gray-500 hover:bg-gray-600">Cancelled</Badge>
                            ) : 
                            !isActive ? (
                              <Badge className="bg-gray-500 hover:bg-gray-600">Paused</Badge>
                            ) : 
                            isUp ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Operational</Badge>
                            ) : 
                            isUnknown ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600">Unknown</Badge>
                            ) : (
                              <Badge variant="destructive">Downtime</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(website.billed_till).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">{(!isCancelled && isUp) ? `${latency}ms` : '--'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
};

export default ClientDashboard;