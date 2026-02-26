import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    ArrowLeft,
    Activity,
    Clock,
    CheckCircle,
    XCircle,
    HelpCircle,
    Globe,
    Gauge,
    BarChart3,
    Timer,
    ExternalLink,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { getWebsiteById, getWebsiteResults, type UserWebsite, type RoundResult } from '@/services/website.service';

const WebsiteDetailPage = () => {
    const { websiteId } = useParams<{ websiteId: string }>();
    const [website, setWebsite] = useState<UserWebsite | null>(null);
    const [rounds, setRounds] = useState<RoundResult[]>([]);
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
            const results = await getWebsiteResults(sub.websiteId);
            setRounds(results);
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

    const formatInterval = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

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
                                    className={`h-8 w-3 rounded-sm transition-all duration-200 hover:scale-y-125 cursor-default ${round.status === 'UP'
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

            <Card>
                <CardHeader>
                    <CardTitle>Round Details</CardTitle>
                    <CardDescription>Recent monitoring round results with detailed timestamps.</CardDescription>
                </CardHeader>
                <CardContent>
                    {rounds.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No rounds recorded yet.</p>
                    ) : (
                        <div className="max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Response Time</TableHead>
                                        <TableHead className="text-right">Uptime %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rounds.slice(0, 50).map((round) => (
                                        <TableRow key={round.id}>
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
                                        </TableRow>
                                    ))}
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
