"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setRecoveryMode(true);
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const form = new FormData(event.currentTarget);
        if (form.get("termsAccepted") !== "on") {
          setMessage("Για την εγγραφή χρειάζεται να αποδεχτείς τους Όρους Χρήσης και τους κανόνες της κοινότητας.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim() || email.split("@")[0],
              terms_accepted_at: new Date().toISOString(),
              community_rules_version: "2026-10-06"
            }
          }
        });
        if (error) throw error;

        if (data.session) {
          window.location.href = "/";
          return;
        }

        setMessage("Ο λογαριασμός δημιουργήθηκε. Έλεγξε το email σου για επιβεβαίωση.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "";
      if (text.toLowerCase().includes("invalid login credentials")) {
        setMessage("Το email ή ο κωδικός δεν ταιριάζει. Αν δεν θυμάσαι τον κωδικό, πάτησε «Ξέχασα κωδικό;».");
      } else if (text.toLowerCase().includes("email not confirmed")) {
        setMessage("Χρειάζεται πρώτα να επιβεβαιώσεις το email σου.");
      } else {
        setMessage(text || "Κάτι πήγε στραβά.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setMessage("Γράψε πρώτα το email σου.");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://hikemazi.com"}/auth?reset=1`
    });
    setLoading(false);

    setMessage(
      error
        ? "Δεν μπορέσαμε να στείλουμε email επαναφοράς. Δοκίμασε ξανά."
        : "Σου στείλαμε email επαναφοράς κωδικού ✓"
    );
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setMessage("Δεν άλλαξε ο κωδικός. Άνοιξε ξανά το link επαναφοράς από το email.");
      return;
    }

    setRecoveryMode(false);
    setMessage("Ο κωδικός άλλαξε ✓");
    window.location.href = "/";
  }

  async function logout() {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  }

  if (recoveryMode) {
    return (
      <main className="authShell">
        <section className="authCard">
          <a className="authBack" href="/">← Πίσω</a>
          <div className="authMark">△</div>
          <p className="authEyebrow">HikeMazi</p>
          <h1>Βάλε νέο κωδικό.</h1>
          <p className="authLead">Διάλεξε έναν νέο κωδικό με τουλάχιστον 6 χαρακτήρες.</p>
          <form onSubmit={updatePassword} className="authForm">
            <label>
              Νέος κωδικός
              <input
                required
                minLength={6}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Τουλάχιστον 6 χαρακτήρες"
                autoComplete="new-password"
              />
            </label>
            <button className="authSubmit" disabled={loading} type="submit">
              {loading ? "Αποθήκευση..." : "Αλλαγή κωδικού"}
            </button>
          </form>
          {message && <p className="authMessage">{message}</p>}
        </section>
      </main>
    );
  }

  if (user) {
    return (
      <main className="authShell">
        <section className="authCard">
          <a className="authBack" href="/">← Πίσω στις πεζοπορίες</a>
          <div className="authMark">△</div>
          <p className="authEyebrow">Είσαι μέσα</p>
          <h1>Καλώς ήρθες.</h1>
          <p className="authLead">{user.email}</p>
          <button className="authSubmit" onClick={() => (window.location.href = "/")}>
            Πάμε στις πεζοπορίες
          </button>
          <button className="authGhost" onClick={logout} disabled={loading}>
            Αποσύνδεση
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <a className="authBack" href="/">← Πίσω</a>
        <div className="authMark">△</div>
        <p className="authEyebrow">HikeMazi</p>
        <h1>{mode === "signup" ? "Βρες την παρέα σου." : "Καλώς ήρθες πίσω."}</h1>
        <p className="authLead">
          {mode === "signup"
            ? "Φτιάξε προφίλ και μπες στις επόμενες πεζοπορίες."
            : "Συνδέσου για να συνεχίσεις."}
        </p>

        <div className="authTabs">
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => { setMode("signup"); setMessage(""); }}
            type="button"
          >
            Εγγραφή
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => { setMode("login"); setMessage(""); }}
            type="button"
          >
            Σύνδεση
          </button>
        </div>

        <form onSubmit={submit} className="authForm">
          {mode === "signup" && (
            <label>
              Όνομα
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="π.χ. Πάνος"
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Κωδικός
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Τουλάχιστον 6 χαρακτήρες"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {mode === "login" && (
            <button className="authForgot" type="button" disabled={loading} onClick={sendPasswordReset}>
              Ξέχασα κωδικό;
            </button>
          )}

          {mode === "signup" && (
            <label className="authTerms">
              <input name="termsAccepted" type="checkbox" required />
              <span>
                Συμφωνώ με τους <a href="/terms">Όρους Χρήσης</a> και τους <a href="/safety">κανόνες ασφάλειας</a>. Καταλαβαίνω ότι το HikeMazi είναι πλατφόρμα κοινωνικών συναντήσεων και όχι υπηρεσία επαγγελματικής ξενάγησης ή συνοδείας.
              </span>
            </label>
          )}

          <button className="authSubmit" disabled={loading} type="submit">
            {loading ? "Περίμενε..." : mode === "signup" ? "Δημιουργία λογαριασμού" : "Σύνδεση"}
          </button>
        </form>

        {message && <p className="authMessage">{message}</p>}

        <p className="authFine">
          HikeMazi · Βρες παρέα για την επόμενη πεζοπορία σου.
        </p>
      </section>
    </main>
  );
}
