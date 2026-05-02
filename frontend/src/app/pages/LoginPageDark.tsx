import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Database, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthProvider";

export function LoginPageDark() {
  const navigate = useNavigate();
  const { login, register, isLoading, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await register({ name, email, password });
      } else {
        await login({ email, password });
      }
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/app");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const isRegisterMode = mode === "register";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-white/[0.015] rounded-full blur-3xl"></div>

      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-xs tracking-wide">BACK</span>
      </Link>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/[0.05] backdrop-blur-xl rounded-2xl border border-white/10 p-10">
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">ULDA</h1>
                <p className="text-xs text-white/40 tracking-wide">DATA ASSISTANT</p>
              </div>
            </div>
          </div>

          <div className="inline-flex w-full rounded-xl border border-white/10 bg-white/[0.04] p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                !isRegisterMode ? "bg-blue-500/15 text-blue-50 border border-blue-400/20" : "text-white/50"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                isRegisterMode ? "bg-blue-500/15 text-blue-50 border border-blue-400/20" : "text-white/50"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {isRegisterMode && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/70 text-xs tracking-wide uppercase">
                  Full Name
                </Label>
                <input
                  id="name"
                  type="text"
                  placeholder="Muslima Kosmagambetova"
                  className="h-11 px-3 w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required={isRegisterMode}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 text-xs tracking-wide uppercase">
                Email
              </Label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-11 px-3 w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70 text-xs tracking-wide uppercase">
                Password
              </Label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-11 px-3 w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.15] focus:outline-none focus:ring-2 focus:ring-white/10 transition-colors"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-medium" disabled={isSubmitting}>
              {isSubmitting ? "PLEASE WAIT..." : isRegisterMode ? "CREATE ACCOUNT →" : "SIGN IN →"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-white/40">
              {isRegisterMode ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(isRegisterMode ? "login" : "register");
                  setError(null);
                }}
                className="text-white hover:text-white/80 transition-colors"
              >
                {isRegisterMode ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-xs text-center text-white/30 tracking-widest uppercase mb-4">
              Integrations
            </p>
            <div className="flex items-center justify-center gap-3">
              {["N", "G", "S", "M", "A"].map((letter, i) => (
                <div
                  key={i}
                  className="w-8 h-8 bg-white/10 border border-white/20 rounded flex items-center justify-center text-xs text-white/50 font-medium"
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-8 tracking-wide">
          Secure authentication • End-to-end encrypted
        </p>
      </div>
    </div>
  );
}
