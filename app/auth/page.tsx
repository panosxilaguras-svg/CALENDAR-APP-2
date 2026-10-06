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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
      setMessage(error instanceof Error ? error.message : "Κάτι πήγε στραβά.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
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
