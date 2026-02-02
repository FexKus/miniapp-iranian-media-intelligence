import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ShieldCheck, LogIn } from "lucide-react";

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    setError(null);
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-gray-500 text-sm">Checking session…</div>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-gray-900">Iranian Media Intelligence</h1>
            <p className="text-sm text-gray-500">Sign in to continue</p>
          </div>
        </div>

        <button
          onClick={() => signInWithGoogle()}
          className="w-full bg-gray-900 hover:bg-black text-white rounded-lg py-2.5 font-medium transition-colors flex items-center justify-center gap-2"
        >
          <LogIn size={16} />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" />
          or use email
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-accent"
          />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <button
            onClick={handleEmailAuth}
            className="w-full border border-gray-300 hover:border-gray-400 rounded-lg py-2.5 text-sm font-medium text-gray-800 transition-colors"
          >
            {isSignUp ? "Create account" : "Sign in with email"}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          {isSignUp ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-accent hover:underline"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
