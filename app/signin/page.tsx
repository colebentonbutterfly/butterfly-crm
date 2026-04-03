"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <div className="text-xl font-bold text-butterflyPurple">Butterfly Assets CRM</div>
        <div className="text-sm text-gray-600 mt-1">Sign in</div>

        <div className="mt-6 space-y-3">
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Password" type="password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button
            className="w-full rounded bg-butterflyPurple px-3 py-2 text-sm font-semibold text-white"
            onClick={() => signIn("credentials", { email, password, callbackUrl: "/dashboard" })}
          >
            Sign In
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          First user is created via seed using ADMIN_EMAIL / ADMIN_PASSWORD.
        </div>
      </div>
    </div>
  );
}
