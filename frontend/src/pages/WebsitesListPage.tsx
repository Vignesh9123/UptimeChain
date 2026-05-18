import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Globe,
    Plus,
    Clock,
    Activity,
    ArrowRight,
    CheckCircle,
    XCircle,
    HelpCircle,
    ArrowLeft,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { getUserWebsites, getLatestResultsForUser, type UserWebsite } from '@/services/website.service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddWebsiteForm } from '@/components/AddWebsiteForm';
import { RenewWebsiteDialog } from '@/components/RenewWebsiteDialog';

const WebsitesListPage = () => {
    const [websites, setWebsites] = useState<UserWebsite[]>([]);
    const [latestResults, setLatestResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [addWebsiteDialogOpen, setAddWebsiteDialogOpen] = useState(false);
    const [renewDialogOpen, setRenewDialogOpen] = useState(false);
    const [selectedRenewWebsite, setSelectedRenewWebsite] = useState<UserWebsite | null>(null);
    const { isAuthenticated, isLoading: authLoading } = useUserStore();
    const navigate = useNavigate();

    const fetchWebsites = () => {
        setIsLoading(true);
        getUserWebsites()
            .then(setWebsites)
            .catch((err) => console.error('Failed to fetch websites:', err))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login');
        }
        if (isAuthenticated) {
            fetchWebsites();
        }
    }, [authLoading, isAuthenticated]);

    useEffect(() => {
        const fetchResults = () => {
            getLatestResultsForUser()
                .then(setLatestResults)
                .catch((err) => console.error('Failed to fetch results:', err));
        };
        fetchResults();
        const interval = setInterval(fetchResults, 5000);
        return () => clearInterval(interval);
    }, []);

    const getStatusInfo = (websiteId: string) => {
        const result = latestResults.find((r) => r.websiteId === websiteId);
        if (!result) return { status: 'UNKNOWN', latency: null };
        return { status: result.status, latency: result.responseTime };
    };

    const getStatusBadge = (status: string, isCancelled?: boolean) => {
        if (isCancelled) {
            return (
                <Badge className="bg-gray-500/15 text-gray-600 border-gray-500/30 hover:bg-gray-500/20 gap-1.5 px-2.5 py-1">
                    <XCircle className="h-3 w-3" />
                    Cancelled
                </Badge>
            );
        }
        switch (status) {
            case 'UP':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 gap-1.5 px-2.5 py-1">
                        <CheckCircle className="h-3 w-3" />
                        Operational
                    </Badge>
                );
            case 'DOWN':
                return (
                    <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20 gap-1.5 px-2.5 py-1">
                        <XCircle className="h-3 w-3" />
                        Down
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 gap-1.5 px-2.5 py-1">
                        <HelpCircle className="h-3 w-3" />
                        Unknown
                    </Badge>
                );
        }
    };

    const formatInterval = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    const upCount = latestResults.filter((r) => r.status === 'UP').length;
    const downCount = latestResults.filter((r) => r.status !== 'UP').length;

    if (authLoading) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="rounded-full">
                        <Link to="/client">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">My Websites</h2>
                        <p className="text-muted-foreground">
                            {websites.length} site{websites.length !== 1 ? 's' : ''} monitored •{' '}
                            <span className="text-emerald-600">{upCount} up</span>
                            {downCount > 0 && <span className="text-red-500"> • {downCount} down</span>}
                        </p>
                    </div>
                </div>
                <Dialog open={addWebsiteDialogOpen} onOpenChange={setAddWebsiteDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="gap-2">
                            <Plus className="h-4 w-4" /> Add Website
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Website</DialogTitle>
                            <DialogDescription>Configure monitoring settings for your website.</DialogDescription>
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
                        }}
                        websiteName={selectedRenewWebsite.name}
                        subscriptionId={selectedRenewWebsite.id}
                        checkInterval={selectedRenewWebsite.check_interval}
                    />
                )}
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="pb-3">
                                <div className="h-5 bg-muted rounded w-2/3" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="h-4 bg-muted rounded w-full" />
                                    <div className="h-4 bg-muted rounded w-1/2" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : websites.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <Globe className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">No websites yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            Start monitoring your websites by adding your first endpoint.
                        </p>
                        <Button onClick={() => setAddWebsiteDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" /> Add your first website
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {websites.map((website) => {
                        const { status, latency } = getStatusInfo(website.websiteId);
                        const isCancelled = website.is_cancelled;
                        return (
                            <Card
                                key={website.id}
                                className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20"
                                onClick={() => {
                                    if (isCancelled) {
                                        setSelectedRenewWebsite(website);
                                        setRenewDialogOpen(true);
                                    } else {
                                        navigate(`/client/websites/${website.id}`);
                                    }
                                }}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`shrink-0 h-2.5 w-2.5 rounded-full ${
                                                    isCancelled
                                                        ? 'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.6)]'
                                                        : status === 'UP'
                                                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                                            : status === 'DOWN'
                                                                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                                                : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                                                    }`}
                                            />
                                            <CardTitle className="text-base truncate">{website.name}</CardTitle>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground truncate font-mono">
                                        {website.website?.url || '—'}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        {getStatusBadge(status, isCancelled)}
                                        {latency !== null && status === 'UP' && !isCancelled && (
                                            <span className="text-sm text-muted-foreground font-medium">{Math.round(latency)}ms</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            Every {formatInterval(website.check_interval)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Activity className="h-3 w-3" />
                                            {website.is_active ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WebsitesListPage;
