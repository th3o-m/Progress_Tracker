import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ChartNoAxesColumnIncreasing, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

import "./Login.css";

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

  const headings = {
    login: "Welcome back.",
    signup: "Create an account.",
    forgot: "Reset your password.",
    reset: "Choose a new password.",
  };
  const instructions = {
    login: "Sign in to your project workspace.",
    signup: "Enter your details to get started.",
    forgot: "Enter your account email to receive a recovery link.",
    reset: "Use at least 8 characters for your new password.",
  };

  return (
    <main className="auth-landing">
      <section className="auth-hero" aria-label="Project Tracker">
        <div className="auth-brand">
          <span className="auth-mark"><ChartNoAxesColumnIncreasing aria-hidden="true" /></span>
          Project Tracker
        </div>
        <div className="auth-intro">
          <h1>Every milestone<br /><em>in sight.</em></h1>
          <p>Track milestones, budgets, and risks in one shared workspace.</p>
        </div>
        <div className="auth-timeline" aria-hidden="true">
          <div className="auth-timeline-heading">
            <span>Work plan</span>
            <span>Project timeline</span>
          </div>
          <div className="auth-timeline-grid">
            <div className="auth-timeline-scale"><span>Jun</span><span>Jul</span><span>Aug</span></div>
            {["Planning", "Delivery", "Review"].map((phase) => (
              <div className="auth-timeline-row" key={phase}>
                <span>{phase}</span>
                <div className="auth-timeline-track"><i /></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="auth-pane" aria-labelledby="auth-title">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="auth-theme" />
        <div className="auth-form-wrap">
          <h2 id="auth-title">{isSupabaseConfigured ? headings[mode] : "Explore the workspace."}</h2>
          {isSupabaseConfigured ? (
            <>
            <p className="auth-instructions">{instructions[mode]}</p>
            <form onSubmit={handleSubmit} className="auth-form">
              {mode === "signup" && (
                <>
                  <label className="block text-sm text-foreground">
                    Full name
                    <input
                      type="text"
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="auth-input"
                    />
                  </label>
                  <label className="block text-sm text-foreground">
                    Phone <span className="text-muted-foreground">(optional)</span>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="auth-input"
                    />
                  </label>
                </>
              )}

              {mode !== "reset" && <label className="block text-sm text-foreground">
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="auth-input"
                />
              </label>}

              {mode !== "forgot" && <label className="block text-sm text-foreground">
                {mode === "reset" ? "New password" : "Password"}
                <span className="relative mt-1 block">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={mode === "signup" || mode === "reset" ? 8 : undefined}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="auth-input auth-password"
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
                  <button type="button" onClick={() => switchMode("forgot")} className="auth-link">
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
                    className="auth-input"
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
                className={mode === "login" || mode === "signup" ? "auth-primary auth-account-submit" : "auth-primary"}
              >
                {submitting ? "Please wait..." : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>

              {mode === "forgot" && (
                <button type="button" onClick={() => switchMode("login")} className="auth-link">
                  Return to sign in
                </button>
              )}
            </form>
            {(mode === "login" || mode === "signup") && (
              <p className="auth-switch">
                {mode === "login" ? "New to Project Tracker?" : "Already have an account?"}{" "}
                <button type="button" disabled={submitting} className="auth-link" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>
                  {mode === "login" ? "Create an account" : "Sign in"}
                </button>
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Supabase authentication is not configured. Add the frontend environment variables from <code>frontend/.env.example</code> to enable account creation and login.
            </p>
            <button type="button" onClick={onSignedIn} className="auth-primary">
              Continue in demo mode
            </button>
          </div>
        )}
        </div>
      </section>
    </main>
  );
}
