import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserStore } from "@/store/userStore";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function OtpPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { verifyOtp, sendOtp, isLoading, error, clearError } = useUserStore();

  const email = useMemo(() => params.get("email") || "", [params]);
  const after = useMemo(() => params.get("after") || "dashboard", [params]); // "dashboard" | "login"

  const [token, setToken] = useState("");
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMessage(null);
    clearError();

    const user = await verifyOtp({ email, token });
    if (after === "login") {
      navigate("/login");
      return;
    }
    navigate(user.role.toLowerCase() === "validator" ? "/validator" : "/client");
  };

  const onResend = async () => {
    setLocalMessage(null);
    clearError();
    await sendOtp(email);
    setLocalMessage("A new OTP has been sent to your email.");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] border border-border/60 rounded-xl p-6 bg-background">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Verify OTP</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the 6-digit code sent to <span className="font-medium text-foreground">{email || "your email"}</span>.
          </p>
        </div>

        <form onSubmit={onVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-12 tracking-[0.35em] text-center font-semibold"
              required
              disabled={!email}
            />
          </div>

          {(error || localMessage) && (
            <div
              className={`p-3 text-sm rounded-lg border ${
                error ? "text-red-400 bg-red-950/20 border-red-900/30" : "text-green-400 bg-green-950/20 border-green-900/30"
              }`}
            >
              {error || localMessage}
            </div>
          )}

          <Button type="submit" className="w-full h-12" disabled={isLoading || token.length !== 6 || !email}>
            {isLoading ? "Verifying..." : "Verify"}
          </Button>

          <Button type="button" variant="outline" className="w-full h-12" disabled={isLoading || !email} onClick={onResend}>
            Resend OTP
          </Button>
        </form>
      </div>
    </div>
  );
}

