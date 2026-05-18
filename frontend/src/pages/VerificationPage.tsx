import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, Database, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { verifyRoundDetails } from '@/services/website.service';

interface VerificationData {
    ipfsDetails: {
        round_timestamp: number;
        report_hash: string;
        uptime_percent: number;
        median_latency_ms: number;
    };
    blockchainDetails: {
        round_timestamp: number;
        report_hash: number[];
        uptime_percent: number;
        median_latency_ms: number;
    };
}

export default function VerificationPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const ipfs_cid = searchParams.get('ipfs_cid');
    const round_pda = searchParams.get('round_pda');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<VerificationData | null>(null);

    useEffect(() => {
        if (!ipfs_cid || !round_pda) {
            setError("Missing IPFS CID or Round PDA parameters.");
            setLoading(false);
            return;
        }

        const fetchDetails = async () => {
            try {
                const res = await verifyRoundDetails(ipfs_cid, round_pda);
                setData(res);
            } catch (err: any) {
                console.error(err);
                setError(err?.response?.data?.error || "Failed to fetch verification details");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [ipfs_cid, round_pda]);

    if (!ipfs_cid || !round_pda) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold mb-1">Error</h4>
                        <p className="text-sm">Missing IPFS CID or Round PDA.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="h-8 bg-muted rounded w-48 animate-pulse" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-6 bg-muted rounded w-1/3" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="h-4 bg-muted rounded w-full" />
                            <div className="h-4 bg-muted rounded w-3/4" />
                        </CardContent>
                    </Card>
                    <Card className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="h-6 bg-muted rounded w-1/3" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="h-4 bg-muted rounded w-full" />
                            <div className="h-4 bg-muted rounded w-3/4" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold mb-1">Verification Error</h4>
                        <p className="text-sm">{error || "An unknown error occurred"}</p>
                    </div>
                </div>
            </div>
        );
    }

    const { ipfsDetails, blockchainDetails } = data;

 
    const blockchainHashHex = Array.isArray(blockchainDetails.report_hash) 
        ? Array.from(blockchainDetails.report_hash)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        : blockchainDetails.report_hash;

    const isMatch = (
        ipfsDetails.report_hash === blockchainHashHex
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Round Verification</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            Comparing data from IPFS and Solana Blockchain
                        </p>
                    </div>
                </div>
                {isMatch ? (
                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold text-sm">Data matches</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20">
                        <XCircle className="h-5 w-5" />
                        <span className="font-semibold text-sm">Mismatch detected</span>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-blue-500" />
                            IPFS Data
                        </CardTitle>
                        <CardDescription className="truncate" title={ipfs_cid}>
                            CID: {ipfs_cid}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Round Timestamp</p>
                            <p className="font-mono text-sm">{ipfsDetails.round_timestamp} ({new Date(ipfsDetails.round_timestamp).toLocaleString()})</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Uptime Percent</p>
                            <p className="font-mono text-sm">{ipfsDetails.uptime_percent}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Median Latency (ms)</p>
                            <p className="font-mono text-sm">{ipfsDetails.median_latency_ms}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Report Hash</p>
                            <p className="font-mono text-xs break-all bg-muted p-2 rounded-md">{ipfsDetails.report_hash}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5 text-purple-500" />
                            Blockchain Data
                        </CardTitle>
                        <CardDescription className="truncate" title={round_pda}>
                            PDA: {round_pda}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Round Timestamp</p>
                            <div className="flex items-center gap-2">
                                <p className="font-mono text-sm">{blockchainDetails.round_timestamp} ({new Date(blockchainDetails.round_timestamp).toLocaleString()})</p>
                                {ipfsDetails.round_timestamp !== blockchainDetails.round_timestamp && (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Uptime Percent</p>
                            <div className="flex items-center gap-2">
                                <p className="font-mono text-sm">{blockchainDetails.uptime_percent}</p>
                                {ipfsDetails.uptime_percent !== blockchainDetails.uptime_percent && (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Median Latency (ms)</p>
                            <div className="flex items-center gap-2">
                                <p className="font-mono text-sm">{blockchainDetails.median_latency_ms}</p>
                                {ipfsDetails.median_latency_ms !== blockchainDetails.median_latency_ms && (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Report Hash</p>
                            <div className="flex items-start gap-2">
                                <p className="font-mono text-xs break-all bg-muted p-2 rounded-md flex-1">{blockchainHashHex}</p>
                                {ipfsDetails.report_hash !== blockchainHashHex && (
                                    <XCircle className="h-4 w-4 text-red-500 mt-1" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
