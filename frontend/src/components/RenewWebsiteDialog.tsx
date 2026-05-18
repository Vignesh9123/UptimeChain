import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMemo, useState } from 'react';
import { axiosClient } from '@/config';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import idl from '@/idl/contract.json';

interface RenewWebsiteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    websiteName: string;
    subscriptionId: string;
    checkInterval: number;
}

const MONTHLY_FEE_SOL_BY_INTERVAL_MIN: Record<number, number> = {
    5: 0.5,
    15: 0.175,
    30: 0.1,
    60: 0.06,
};

export function RenewWebsiteDialog({ open, onOpenChange, onSuccess, websiteName, subscriptionId, checkInterval }: RenewWebsiteDialogProps) {
    const [isPaying, setIsPaying] = useState(false);
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const programId = useMemo(() => new PublicKey((idl as any).address), []);
    const rewardVaultPda = useMemo(() => {
        const [pda] = PublicKey.findProgramAddressSync([Buffer.from("reward_vault")], programId);
        return pda;
    }, [programId]);

    const intervalMinNumber = useMemo(() => {
        const n = Math.round(checkInterval / 60);
        return Number.isFinite(n) && n > 0 ? n : 5;
    }, [checkInterval]);

    const requiredSol = useMemo(() => {
        return MONTHLY_FEE_SOL_BY_INTERVAL_MIN[intervalMinNumber] ?? MONTHLY_FEE_SOL_BY_INTERVAL_MIN[5];
    }, [intervalMinNumber]);

    const requiredLamports = useMemo(() => {
        return Math.round(requiredSol * LAMPORTS_PER_SOL);
    }, [requiredSol]);

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
            await axiosClient.post(`/websites/${subscriptionId}/renew`);

            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Payment failed", error);
            alert("Payment failed. Please check your wallet and try again.");
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Renew subscription for {websiteName}</DialogTitle>
                    <DialogDescription>
                        Your subscription has been paused. Add the monthly fee to reactivate it.
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

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPaying}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePayRequiredFee}
                        disabled={!wallet || isPaying}
                    >
                        {isPaying ? 'Processing…' : `Pay ${requiredSol.toFixed(3)} SOL`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
