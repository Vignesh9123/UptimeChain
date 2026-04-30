import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    ArrowLeft,
    Activity,
    Clock,
    CheckCircle,
    Copy,
    XCircle,
    HelpCircle,
    Globe,
    Gauge,
    BarChart3,
    Timer,
    ExternalLink,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useEffect, useState, Fragment } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { getWebsiteById, getWebsiteContinentStatusForRound, getWebsiteResults, getWebsiteSubmissions, type ContinentRoundStatus, type UserWebsite, type RoundResult, type ValidatorSubmission } from '@/services/website.service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CONTINENT_LABELS: Record<string, string> = {
    'NA': 'North America',
    'EU': 'Europe',
    'AS': 'Asia',
    'SA': 'South America',
    'AF': 'Africa',
    'OC': 'Oceania',
    'AN': 'Antarctica',
};

const CONTINENT_COLORS: Record<string, string> = {
    'NA': '#6366f1',
    'EU': '#8b5cf6',
    'AS': '#ec4899',
    'SA': '#f59e0b',
    'AF': '#10b981',
    'OC': '#06b6d4',
    'AN': '#64748b',
};

const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY;

const WebsiteDetailPage = () => {
    const { websiteId } = useParams<{ websiteId: string }>();
    const [website, setWebsite] = useState<UserWebsite | null>(null);
    const [rounds, setRounds] = useState<RoundResult[]>([]);
    const [submissions, setSubmissions] = useState<ValidatorSubmission[]>([]);
    const [continentRoundStatus, setContinentRoundStatus] = useState<ContinentRoundStatus | null>(null);
    const [expandedRound, setExpandedRound] = useState<string | null>(null);
    const [tickDialogOpen, setTickDialogOpen] = useState(false);
    const [selectedTickRound, setSelectedTickRound] = useState<RoundResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isAuthenticated, isLoading: authLoading } = useUserStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login');
        }
    }, [authLoading, isAuthenticated]);

    const fetchData = async () => {
        try {
            if (!websiteId) return;
            const sub = await getWebsiteById(websiteId);
            setWebsite(sub);
            const [results, subs] = await Promise.all([
                getWebsiteResults(sub.websiteId),
                getWebsiteSubmissions(sub.websiteId),
            ]);
            setRounds(results);
            setSubmissions(subs);

            const latestRound = results[0]
            if (latestRound?.roundTimestamp) {
                try {
                    const crs = await getWebsiteContinentStatusForRound(sub.websiteId, latestRound.roundTimestamp)
                    setContinentRoundStatus(crs)
                } catch (e) {
                    console.error('Failed to fetch continent round status:', e)
                    setContinentRoundStatus(null)
                }
            } else {
                setContinentRoundStatus(null)
            }
        } catch (err) {
            console.error('Failed to fetch website data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!websiteId || !isAuthenticated) return;
        setIsLoading(true);
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [websiteId, isAuthenticated]);

    if (authLoading) return null;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="rounded-full">
                        <Link to="/client/websites">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="h-8 bg-muted rounded w-48 animate-pulse" />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="pb-2">
                                <div className="h-4 bg-muted rounded w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-muted rounded w-1/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!website) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">Website not found</h3>
                <p className="text-muted-foreground mb-6">This subscription doesn't exist or you don't have access.</p>
                <Button asChild>
                    <Link to="/client/websites">Go back</Link>
                </Button>
            </div>
        );
    }

    const totalRounds = rounds.length;
    const upRounds = rounds.filter((r) => r.status === 'UP').length;
    const downRounds = rounds.filter((r) => r.status === 'DOWN').length;
    const uptimePercent = totalRounds > 0 ? ((upRounds / totalRounds) * 100).toFixed(2) : '--';
    const avgResponseTime =
        totalRounds > 0
            ? (rounds.filter((r) => r.status === 'UP').reduce((acc, r) => acc + r.responseTime, 0) / Math.max(upRounds, 1)).toFixed(0)
            : '--';
    const currentStatus = rounds.length > 0 ? rounds[0].status : website.current_status;

    const chartData = rounds
        .slice(0, 30)
        .reverse()
        .map((r) => ({
            time: new Date(r.roundTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            responseTime: r.status === 'UP' ? Math.round(r.responseTime) : 0,
            status: r.status,
        }));

    const tickData = rounds.slice(0, 60).reverse();

    const copyToClipboard = async (text: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            alert('Failed to copy to clipboard');
        }
    };

    const openTickDialog = (round: RoundResult) => {
        setSelectedTickRound(round);
        setTickDialogOpen(true);
    };

    const formatInterval = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    const continentMap = new Map<string, ValidatorSubmission[]>();
    submissions.forEach((s) => {
        const key = s.continent || 'Unknown';
        if (!continentMap.has(key)) continentMap.set(key, []);
        continentMap.get(key)!.push(s);
    });

    const continentStats = Array.from(continentMap.entries()).map(([continent, subs]) => {
        const upSubs = subs.filter((s) => s.status === 'UP');
        const avgRt = upSubs.length > 0 ? upSubs.reduce((a, s) => a + s.responseTime, 0) / upSubs.length : 0;
        return {
            continent,
            label: CONTINENT_LABELS[continent] || continent,
            color: CONTINENT_COLORS[continent] || '#64748b',
            totalChecks: subs.length,
            upChecks: upSubs.length,
            uptimePercent: subs.length > 0 ? ((upSubs.length / subs.length) * 100).toFixed(1) : '--',
            avgResponseTime: Math.round(avgRt),
        };
    });

    const submissionsByRound = new Map<string, ValidatorSubmission[]>();
    submissions.forEach((s) => {
        const key = s.roundTimestamp;
        if (!submissionsByRound.has(key)) submissionsByRound.set(key, []);
        submissionsByRound.get(key)!.push(s);
    });

    const continentStatusByCode = new Map<string, 'UP' | 'DOWN' | 'UNKNOWN'>(
        (continentRoundStatus?.continents ?? []).map((c) => [c.continent, c.status])
    )
    const downContinents = (continentRoundStatus?.continents ?? []).filter((c) => c.status === 'DOWN')
    const hasAnyContinentDown = downContinents.length > 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="rounded-full">
                        <Link to="/client/websites">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-3xl font-bold tracking-tight">{website.name}</h2>
                            <div
                                className={`h-2.5 w-2.5 rounded-full ${currentStatus === 'UP'
                                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                    : currentStatus === 'DOWN'
                                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                        : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                                    }`}
                            />
                        </div>
                        <a
                            href={website.website?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground font-mono hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                            {website.website?.url}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1">
                        <Clock className="h-3 w-3 mr-1.5" />
                        Every {formatInterval(website.check_interval)}
                    </Badge>
                    <Badge variant="outline" className={website.is_active ? 'text-emerald-600 border-emerald-300' : 'text-muted-foreground'}>
                        <Activity className="h-3 w-3 mr-1.5" />
                        {website.is_active ? 'Active' : 'Paused'}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                        <Gauge className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{uptimePercent}%</div>
                        <p className="text-xs text-muted-foreground">{upRounds} of {totalRounds} checks passed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                        <Timer className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgResponseTime}ms</div>
                        <p className="text-xs text-muted-foreground">Average when operational</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
                        <BarChart3 className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRounds}</div>
                        <p className="text-xs text-muted-foreground">Monitoring rounds completed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Status</CardTitle>
                        {currentStatus === 'UP' ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : currentStatus === 'DOWN' ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                            <HelpCircle className="h-4 w-4 text-amber-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">
                            {currentStatus === 'UP' ? 'Operational' : currentStatus === 'DOWN' ? 'Down' : 'Unknown'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {downRounds > 0 ? `${downRounds} downtime event${downRounds > 1 ? 's' : ''} recorded` : 'No downtime recorded'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Round History</CardTitle>
                    <CardDescription>
                        Last {tickData.length} monitoring rounds — each block represents one check.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tickData.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No monitoring data yet.</p>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {tickData.map((round, index) => (
                                <div
                                    key={round.id || index}
                                    title={`${new Date(round.roundTimestamp).toLocaleString()} - ${round.status} ${round.status === 'UP' ? `(${Math.round(round.responseTime)}ms)` : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openTickDialog(round)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openTickDialog(round);
                                        }
                                    }}
                                    className={`h-8 w-3 rounded-sm transition-all duration-200 hover:scale-y-125 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${round.status === 'UP'
                                        ? 'bg-emerald-500/80 hover:bg-emerald-500'
                                        : round.status === 'DOWN'
                                            ? 'bg-red-500/80 hover:bg-red-500'
                                            : 'bg-amber-500/80 hover:bg-amber-500'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Up
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Down
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Unknown
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Dialog
                open={tickDialogOpen}
                onOpenChange={(open) => {
                    setTickDialogOpen(open);
                    if (!open) setSelectedTickRound(null);
                }}
            >
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Round details</DialogTitle>
                        <DialogDescription>
                            {selectedTickRound ? (
                                <span className="font-mono">
                                    {new Date(selectedTickRound.roundTimestamp).toLocaleString()}
                                </span>
                            ) : (
                                ' '
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTickRound && (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg border bg-muted/20 p-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                                    <div>
                                        {selectedTickRound.status === 'UP' ? (
                                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                                                <CheckCircle className="h-3 w-3" /> Up
                                            </Badge>
                                        ) : selectedTickRound.status === 'DOWN' ? (
                                            <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1">
                                                <XCircle className="h-3 w-3" /> Down
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
                                                <HelpCircle className="h-3 w-3" /> Unknown
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border bg-muted/20 p-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Latency</p>
                                    <p className="text-sm font-medium">
                                        {selectedTickRound.status === 'UP' ? (
                                            <span className="font-mono">{Math.round(selectedTickRound.responseTime)}ms</span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border p-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Solana address</p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Copy Solana address"
                                        aria-label="Copy Solana address"
                                        disabled={!selectedTickRound.solana_address}
                                        onClick={() => copyToClipboard(selectedTickRound.solana_address)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="font-mono text-sm break-all">{selectedTickRound.solana_address || '—'}</p>
                            </div>
                            <div className="rounded-lg border p-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">IPFS URL</p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Copy IPFS URL"
                                        aria-label="Copy IPFS URL"
                                        disabled={!selectedTickRound.ipfs_cid}
                                        onClick={() => copyToClipboard(`${IPFS_GATEWAY}/${selectedTickRound.ipfs_cid}`)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="font-mono text-sm break-all">
                                    {selectedTickRound.ipfs_cid ? `${IPFS_GATEWAY}/${selectedTickRound.ipfs_cid}` : '—'}
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {chartData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Response Time</CardTitle>
                        <CardDescription>Response times over the last {chartData.length} checks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f040" />
                                    <XAxis
                                        dataKey="time"
                                        stroke="#888888"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `${v}ms`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f030',
                                            background: '#1e1e2e',
                                            color: '#e2e8f0',
                                            fontSize: '12px',
                                        }}
                                        formatter={(value: number) => [`${value}ms`, 'Response Time']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="responseTime"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        fill="url(#responseGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {continentStats.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Continent Performance
                        </CardTitle>
                        <CardDescription>Aggregated validator results grouped by region.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {continentRoundStatus && (
                            <div className={`mb-4 rounded-lg border px-4 py-3 ${hasAnyContinentDown ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        {hasAnyContinentDown ? (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                        )}
                                        <p className="text-sm font-medium">
                                            {hasAnyContinentDown
                                                ? `Continent down detected (${downContinents.length})`
                                                : 'No continent down detected'}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-mono">
                                        Round: {new Date(continentRoundStatus.roundTimestamp).toLocaleString()}
                                    </p>
                                </div>
                                {hasAnyContinentDown && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {downContinents.map((c) => (
                                            <Badge
                                                key={c.continent}
                                                className="bg-red-500/15 text-red-600 border-red-500/30"
                                                variant="outline"
                                            >
                                                {CONTINENT_LABELS[c.continent] || c.continent}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {continentStats.map((cs) => (
                                (() => {
                                    const roundStatus = continentStatusByCode.get(cs.continent)
                                    const isDown = roundStatus === 'DOWN'
                                    const isUp = roundStatus === 'UP'
                                    return (
                                <div
                                    key={cs.continent}
                                    className={`rounded-lg border p-4 space-y-3 transition-colors hover:bg-muted/50 ${isDown ? 'border-red-500/30 bg-red-500/5' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: cs.color }}
                                            />
                                            <span className="font-medium text-sm">{cs.label}</span>
                                            {roundStatus && (
                                                <Badge
                                                    variant="outline"
                                                    className={`ml-1 text-[11px] ${isDown ? 'text-red-600 border-red-500/30 bg-red-500/10' : isUp ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-600 border-amber-500/30 bg-amber-500/10'}`}
                                                >
                                                    {isDown ? 'Down' : isUp ? 'Up' : 'Unknown'}
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{cs.totalChecks} checks</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Uptime</span>
                                            <p className="text-lg font-bold">{cs.uptimePercent}%</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-muted-foreground">Avg Latency</span>
                                            <p className="text-lg font-bold">{cs.avgResponseTime}ms</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${cs.uptimePercent === '--' ? 0 : cs.uptimePercent}%`,
                                                backgroundColor: cs.color,
                                                opacity: 0.8,
                                            }}
                                        />
                                    </div>
                                </div>
                                    )
                                })()
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Round Details</CardTitle>
                    <CardDescription>Click a row to see continent-wise validator submissions for that round.</CardDescription>
                </CardHeader>
                <CardContent>
                    {rounds.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No rounds recorded yet.</p>
                    ) : (
                        <div className="max-h-[500px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Response Time</TableHead>
                                        <TableHead className="text-right">Uptime %</TableHead>
                                        <TableHead className="text-right">Validators</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rounds.slice(0, 50).map((round) => {
                                        const roundSubs = submissionsByRound.get(round.roundTimestamp) || [];
                                        const isExpanded = expandedRound === round.roundTimestamp;

                                        return (
                                            <Fragment key={round.id}>
                                                <TableRow
                                                    key={round.id}
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => setExpandedRound(isExpanded ? null : round.roundTimestamp)}
                                                >
                                                    <TableCell className="font-mono text-sm">
                                                        {new Date(round.roundTimestamp).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {round.status === 'UP' ? (
                                                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                                                                <CheckCircle className="h-3 w-3" /> Up
                                                            </Badge>
                                                        ) : round.status === 'DOWN' ? (
                                                            <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1">
                                                                <XCircle className="h-3 w-3" /> Down
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
                                                                <HelpCircle className="h-3 w-3" /> Unknown
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {round.status === 'UP' ? `${Math.round(round.responseTime)}ms` : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">{(round.uptime_percentage / 100).toFixed(2)}%</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {roundSubs.length}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && roundSubs.length > 0 && (
                                                    <TableRow key={`${round.id}-detail`}>
                                                        <TableCell colSpan={5} className="p-0">
                                                            <div className="bg-muted/30 px-6 py-4 space-y-2">
                                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                                                                    Validator Submissions ({roundSubs.length})
                                                                </p>
                                                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                                    {roundSubs.map((sub) => (
                                                                        <div
                                                                            key={sub.id}
                                                                            className="flex items-center justify-between rounded-md border bg-background px-3 py-2"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <div
                                                                                    className="h-2 w-2 rounded-full"
                                                                                    style={{ backgroundColor: CONTINENT_COLORS[sub.continent] || '#64748b' }}
                                                                                />
                                                                                <span className="text-sm font-medium">
                                                                                    {CONTINENT_LABELS[sub.continent] || sub.continent}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                {sub.status === 'UP' ? (
                                                                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                                                                ) : sub.status === 'DOWN' ? (
                                                                                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                                                                                ) : (
                                                                                    <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                                                                                )}
                                                                                <span className="text-xs font-mono text-muted-foreground">
                                                                                    {sub.status === 'UP' ? `${Math.round(sub.responseTime)}ms` : '—'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WebsiteDetailPage;
