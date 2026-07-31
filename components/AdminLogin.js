"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function readLoginResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {
        error: response.ok
          ? "Admin login returned an invalid response."
          : "Admin login failed on the server. Check live environment variables.",
      };
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const result = await readLoginResponse(response);
      if (!response.ok) throw new Error(result.error || "Invalid password.");
      window.location.reload();
    } catch (loginError) {
      setError(loginError.message);
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="adminLoginShell">
      <form className="adminLoginCard" onSubmit={handleSubmit}>
        <img src="/bustaniya-logo-v2.png" alt="Bustaniya" />
        <p>ADMIN ACCESS</p>
        <h1>Sign in</h1>
        <label>
          Email
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="owner@bustaniya.local"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Bustaniya2026"
            required
          />
        </label>
        {error && <span>{error}</span>}
        <button disabled={loading}>{loading ? "Checking..." : "Open admin"}</button>
      </form>
    </main>
  );
}
