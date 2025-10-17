import { FormEvent, useState } from "react";
import { useAuthStore } from "@store/authStore";

const AuthPage = () => {
  const { login, signup, mode, toggleMode, message } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const handler = mode === "signin" ? login : signup;
    await handler(username, password);
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface to-surface-muted/60 px-6 py-16">
      <section className="w-full max-w-md rounded-3xl border border-surface-muted/60 bg-surface-elevated/80 p-10 shadow-subtle backdrop-blur transition">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.4em] text-primary/70">StudyNest</p>
          <h1 className="mt-2 text-3xl font-semibold text-text">
            {mode === "signin" ? "Welcome back" : "Create your nest"}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {mode === "signin"
              ? "Sign in to pick up where you left off."
              : "Set up your workspace in seconds."}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-text">Username</label>
            <div className="mt-2 rounded-2xl border border-surface-muted/60 bg-surface px-4 py-3 focus-within:border-primary">
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="yourname"
                className="w-full bg-transparent text-base text-text outline-none"
                required
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text">Password</label>
            <div className="mt-2 rounded-2xl border border-surface-muted/60 bg-surface px-4 py-3 focus-within:border-primary">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                className="w-full bg-transparent text-base text-text outline-none"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
          </div>
          {message && <p className="text-sm text-red-500">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-3 text-base font-semibold text-white shadow-lg shadow-primary/40 transition hover:shadow-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Processing…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-text-muted">
          {mode === "signin" ? "New to StudyNest?" : "Already have an account?"}{" "}
          <button onClick={toggleMode} className="font-semibold text-primary">
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
};

export default AuthPage;
