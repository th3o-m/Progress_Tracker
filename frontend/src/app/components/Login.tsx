import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

interface LoginProps {
  onSignedIn: () => void;
  passwordRecovery?: boolean;
  onPasswordReset?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

type Mode = "login" | "signup" | "forgot" | "reset";

export function Login({ onSignedIn, passwordRecovery = false, onPasswordReset, theme, onToggleTheme }: LoginProps) {
  const [mode, setMode] = useState<Mode>(passwordRecovery ? "reset" : "login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (passwordRecovery) switchMode("reset");
  }, [passwordRecovery]);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      if (fullName.trim().length < 2) {
        setError("Enter your full name.");
        return;
      }
      if (password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    if (mode === "reset") {
      if (password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      });
      setSubmitting(false);
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setMessage("If an account exists for that email, a password reset link has been sent.");
      return;
    }

    if (mode === "reset") {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setSubmitting(false);
        setError(updateError.message);
        return;
      }
      await supabase.auth.signOut({ scope: "local" });
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      onPasswordReset?.();
      setSubmitting(false);
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setMessage("Password updated. Sign in with your new password.");
      return;
    }

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      setSubmitting(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      onSignedIn();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        },
      },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      onSignedIn();
      return;
    }
    setMessage("Account created. Check your email and follow the confirmation link, then sign in.");
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-card border border-border rounded-lg shadow-sm p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-extrabold text-primary-foreground">PT</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground font-bold">Projectt Tracker</h1>
            <p className="text-muted-foreground text-xs">Organization-wide employee access</p>
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>

        {isSupabaseConfigured ? (
          <>
            {(mode === "login" || mode === "signup") ? <div className="grid grid-cols-2 rounded-md bg-secondary p-1 mb-6" role="tablist" aria-label="Account access">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => switchMode("login")}
                className={`rounded px-3 py-2 text-sm font-semibold transition-colors ${mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => switchMode("signup")}
                className={`rounded px-3 py-2 text-sm font-semibold transition-colors ${mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Create account
              </button>
            </div> : (
              <div className="mb-6">
                <h2 className="font-bold text-foreground">{mode === "forgot" ? "Reset your password" : "Choose a new password"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "forgot" ? "Enter your account email and we’ll send you a recovery link." : "Your new password must contain at least 8 characters."}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <label className="block text-sm text-foreground">
                    Full name
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-[#1a3a6b]"
                    />
                  </label>
                  <label className="block text-sm text-foreground">
                    Phone <span className="text-muted-foreground">(optional)</span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-[#1a3a6b]"
                    />
                  </label>
                </>
              )}

              {mode !== "reset" && <label className="block text-sm text-foreground">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-[#1a3a6b]"
                />
              </label>}

              {mode !== "forgot" && <label className="block text-sm text-foreground">
                {mode === "reset" ? "New password" : "Password"}
                <span className="relative mt-1 block">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={mode === "signup" || mode === "reset" ? 8 : undefined}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#1a3a6b]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </span>
              </label>}

              {mode === "login" && (
                <div className="-mt-2 text-right">
                  <button type="button" onClick={() => switchMode("forgot")} className="text-sm font-semibold text-[#1a3a6b] hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              {(mode === "signup" || mode === "reset") && (
                <label className="block text-sm text-foreground">
                  Confirm {mode === "reset" ? "new " : ""}password
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-[#1a3a6b]"
                  />
                </label>
              )}

              {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {message && (
                <div role="status" className="flex gap-2 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (Boolean(message) && mode !== "login")}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-[#1a3a6b] px-4 py-2.5 text-white font-semibold disabled:opacity-60"
              >
                {mode === "login" && <LogIn className="w-4 h-4" />}
                {mode === "signup" && <UserPlus className="w-4 h-4" />}
                {mode === "forgot" && <Mail className="w-4 h-4" />}
                {mode === "reset" && <KeyRound className="w-4 h-4" />}
                {submitting ? "Please wait..." : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}
              </button>

              {(message || mode === "forgot") && (
                <button type="button" onClick={() => switchMode("login")} className="w-full text-sm font-semibold text-[#1a3a6b] hover:underline">
                  Return to sign in
                </button>
              )}
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Supabase authentication is not configured. Add the frontend environment variables from <code>frontend/.env.example</code> to enable account creation and login.
            </p>
            <button type="button" onClick={onSignedIn} className="w-full rounded-md bg-[#1a3a6b] px-4 py-2.5 text-white font-semibold">
              Continue in demo mode
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
