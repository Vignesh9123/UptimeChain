import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState } from 'react';
import { axiosClient } from '@/config';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import idl from '@/idl/contract.json';

interface AddWebsiteFormProps extends React.HTMLAttributes<HTMLDivElement> {
    onClose?: () => void;
    onSuccess?: () => void;
}

const MONTHLY_FEE_SOL_BY_INTERVAL_MIN: Record<number, number> = {
    5: 0.5,
    15: 0.175,
    30: 0.1,
    60: 0.06,
};

const CONTINENTS = [
    { id: 'Asia', label: 'Asia' },
    { id: 'North America', label: 'North America' },
    { id: 'South America', label: 'South America' },
    { id: 'Europe', label: 'Europe' },
    { id: 'Africa', label: 'Africa' },
    { id: 'Oceania', label: 'Oceania' },
    { id: 'Antarctica', label: 'Antarctica' },
] as const;

export function AddWebsiteForm({ className, onClose, onSuccess, ...props }: AddWebsiteFormProps) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [regions, setRegions] = useState<string[]>([]);
    const [interval, setInterval] = useState<string>('5');
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [isCreatingWebsite, setIsCreatingWebsite] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<null | {
        name: string;
        url: string;
        regions: string[];
        intervalMin: number;
    }>(null);

    const [validatorCountByRegion, setValidatorCountByRegion] = useState<Record<string, number> | null>(null);
    const [validatorsByRegionStatus, setValidatorsByRegionStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const programId = useMemo(() => new PublicKey((idl as any).address), []);
    const rewardVaultPda = useMemo(() => {
        const [pda] = PublicKey.findProgramAddressSync([Buffer.from("reward_vault")], programId);
        return pda;
    }, [programId]);

    const intervalMinNumber = useMemo(() => {
        const n = Number(interval);
        return Number.isFinite(n) ? n : 5;
    }, [interval]);

    const requiredSol = useMemo(() => {
        return MONTHLY_FEE_SOL_BY_INTERVAL_MIN[intervalMinNumber] ?? MONTHLY_FEE_SOL_BY_INTERVAL_MIN[5];
    }, [intervalMinNumber]);

    const requiredLamports = useMemo(() => {
        return Math.round(requiredSol * LAMPORTS_PER_SOL);
    }, [requiredSol]);

    useEffect(() => {
        axiosClient
            .get<{ data?: Record<string, number> }>('/validators/get-by-region')
            .then((response) => {
                setValidatorCountByRegion(response.data?.data ?? {});
                setValidatorsByRegionStatus('ready');
            })
            .catch((error) => {
                console.error(error);
                setValidatorCountByRegion(null);
                setValidatorsByRegionStatus('error');
            });
    }, []);

    useEffect(() => {
        if (validatorsByRegionStatus !== 'ready' || !validatorCountByRegion) return;
        setRegions((prev) => prev.filter((r) => (validatorCountByRegion[r] ?? 0) > 0));
    }, [validatorsByRegionStatus, validatorCountByRegion]);

    const isRegionSelectable = (continentId: string) => {
        if (validatorsByRegionStatus === 'loading') return false;
        if (validatorsByRegionStatus === 'error' || validatorCountByRegion === null) return true;
        return (validatorCountByRegion[continentId] ?? 0) > 0;
    };

    const createWebsite = async (payload: NonNullable<typeof pendingPayload>) => {
        setIsCreatingWebsite(true);
        try {
            const response = await axiosClient.post('/websites', {
                name: payload.name,
                url: payload.url,
                regions: payload.regions,
                check_interval: payload.intervalMin,
                is_active: true,
            });
            console.log(response.data);
            onSuccess?.();
            onClose?.();
        } catch (error) {
            console.error(error);
            alert('Failed to add website. Please try again.');
        } finally {
            setIsCreatingWebsite(false);
        }
    };

    const handlePayRequiredFee = async () => {
        if (!wallet) return;
        setIsPaying(true);
        try {
            const ix = SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: rewardVaultPda,
                lamports: requiredLamports,
            });

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            const tx = new Transaction().add(ix);
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = blockhash;

            const signed = await wallet.signTransaction(tx);
            const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

            await axiosClient.post('/clients/verify-amount', { signature });

            const payload = pendingPayload;
            setPaymentDialogOpen(false);
            setPendingPayload(null);

            if (payload) {
                await createWebsite(payload);
            }
        } catch (error) {
            console.error("Payment failed", error);
            alert("Payment failed. Please check your wallet and try again.");
        } finally {
            setIsPaying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !url) {
            return;
        }
        if (!regions.length) {
            return;
        }
        if (!interval) {
            return;
        }
        const intervalMin = Number(interval);
        setPendingPayload({
            name,
            url,
            regions,
            intervalMin,
        });
        setPaymentDialogOpen(true);
    }
    return (
        <div className={cn("grid gap-4 py-4", className)} {...props}>
            <div className="grid gap-2">
                <Label htmlFor="name">Website Name</Label>
                <Input id="name" placeholder="Website Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="url">Website URL</Label>
                <Input id="url" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <div className="flex flex-col gap-1">
                    <Label>Regions</Label>
                    {validatorsByRegionStatus === 'loading' ? (
                        <p className="text-xs text-muted-foreground">Checking where validators are available…</p>
                    ) : validatorsByRegionStatus === 'error' ? (
                        <p className="text-xs text-muted-foreground">
                            Could not load validator locations; all regions stay selectable.
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Only regions with at least one registered validator can be selected.
                        </p>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {CONTINENTS.map((c) => {
                        const selectable = isRegionSelectable(c.id);
                        const count =
                            validatorsByRegionStatus === 'ready' && validatorCountByRegion
                                ? validatorCountByRegion[c.id] ?? 0
                                : null;
                        return (
                            <div
                                key={c.id}
                                className={cn(
                                    'flex items-center space-x-2',
                                    !selectable && 'opacity-50',
                                )}
                            >
                                <Checkbox
                                    id={`continent-${c.id}`}
                                    disabled={!selectable}
                                    checked={regions.includes(c.id)}
                                    onCheckedChange={(checked) =>
                                        setRegions((prev) =>
                                            checked ? [...prev, c.id] : prev.filter((region) => region !== c.id),
                                        )
                                    }
                                />
                                <Label
                                    htmlFor={`continent-${c.id}`}
                                    className={cn(!selectable && 'cursor-not-allowed')}
                                >
                                    {c.label}
                                    {count !== null && count === 0 ? (
                                        <span className="ml-1 text-xs text-muted-foreground">(0)</span>
                                    ) : null}
                                </Label>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="interval">Monitoring Interval</Label>
                <Select value={interval} onValueChange={setInterval}>
                    <SelectTrigger id="interval">
                        <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button
                type="submit"
                onClick={handleSubmit}
                className="w-full mt-4"
                disabled={isPaying || isCreatingWebsite}
            >
                Add Website
            </Button>

            <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
                setPaymentDialogOpen(open);
                if (!open) setPendingPayload(null);
            }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Pay subscription fee</DialogTitle>
                        <DialogDescription>
                            To activate monitoring, add the exact monthly fee for your selected interval.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Monitoring interval</span>
                            <span className="font-medium">{intervalMinNumber} minutes</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Monthly fee</span>
                            <span className="font-medium">{requiredSol.toFixed(3)} SOL</span>
                        </div>
                    </div>

                    {!wallet ? (
                        <div className="grid gap-2 pt-2">
                            <div className="text-sm text-muted-foreground">
                                Connect your wallet to continue.
                            </div>
                            <div>
                                <WalletMultiButton className="!bg-primary !h-10" />
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setPaymentDialogOpen(false)}
                            disabled={isPaying || isCreatingWebsite}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePayRequiredFee}
                            disabled={!wallet || isPaying || isCreatingWebsite}
                        >
                            {isPaying ? 'Processing…' : `Pay ${requiredSol.toFixed(3)} SOL`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
