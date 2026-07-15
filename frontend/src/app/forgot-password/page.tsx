"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { WashingMachine, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<"request" | "reset">("request");
  const [username, setUsername] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    try {
      const res = await api.post<{ detail: string }>("/api/auth/forgot-password", { username: username.trim() });
      toast.success(res.detail);
      setStep("reset");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { username: username.trim(), otp: otp.trim(), new_password: newPassword });
      toast.success("Password reset — you can log in now");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100 p-4 dark:from-background dark:via-background dark:to-background">
      <Card className="w-full max-w-sm shadow-lg border-sky-100 dark:border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <WashingMachine className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            {step === "request"
              ? "Enter your username — we'll text a code to the phone number on file."
              : `Enter the code sent to the phone number on file for "${username}".`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "request" ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send reset code
              </Button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">6-digit code</Label>
                <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" maxLength={6} placeholder="123456" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Reset password
              </Button>
              <button
                type="button"
                onClick={() => setStep("request")}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                Didn't get a code? Try again
              </button>
            </form>
          )}
          <Link href="/login" className="mt-4 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
