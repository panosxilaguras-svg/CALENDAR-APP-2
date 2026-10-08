"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Member = { display_name: string; avatar_url: string | null; city: string | null; created_at: string };
type Hike = { title: string; location_name: string; starts_at: string; status: string };
type Summary = { members: number; hikes: number; requests: number; participants: number; recent_members: Member[]; recent_hikes: Hike[] };
const OWNER_ID = "68352bbc-0d79-47ae-b931-e6e8633c1e23";

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [status, setStatus] = useState("Έλεγχος πρόσβασης…");
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user || user.id !== OWNER_ID) { setDenied(true); setStatus("Δεν έχεις πρόσβαση σε αυτή τη σελίδα."); return; }
      const { data, error } = await supabase.rpc("admin_dashboard_summary");
      if (!mounted) return;
      if (error) { setStatus("Δεν ήταν δυνατή η φόρτωση των στοιχείων. " + error.message); return; }
      setSummary(data as Summary);
    };
    void load();
    return () => { mounted = false; };
  }, []);
  const date = (value: string) => new Date(value).toLocaleString("el-GR", { dateStyle: "medium", timeStyle: "short" });
  return (
    <main style={{ minHeight: "100dvh", background: "#f6f4ed", color: "#183b2c", padding: "32px 18px 80px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "auto" }}>
        <a href="/" style={{ color: "#183b2c", textDecoration: "none", fontWeight: 700 }}>← ORIVATIS</a>
        <h1 style={{ fontSize: "clamp(30px, 6vw, 46px)", margin: "28px 0 8px" }}>Πίνακας διαχείρισης</h1>
        <p style={{ color: "#64746a", marginBottom: 28 }}>Ιδιωτική επισκόπηση της κοινότητας</p>
        {!summary ? <p role="status">{status}{denied && <span> <a href="/">Επιστροφή στην αρχική</a></span>}</p> : <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12, marginBottom: 32 }}>
            {([["Μέλη", summary.members], ["Πεζοπορίες", summary.hikes], ["Αιτήσεις", summary.requests], ["Συμμετοχές", summary.participants]] as const).map(([label, count]) =>
              <div key={label} style={{ background: "#fff", borderRadius: 18, padding: 22, border: "1px solid #e5e7df" }}>
                <div style={{ fontSize: 36, fontWeight: 800 }}>{count}</div><div style={{ color: "#68776e" }}>{label}</div>
              </div>
            )}
          </section>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Πρόσφατα μέλη</h2>
          <section style={{ background: "#fff", borderRadius: 18, padding: "8px 18px", marginBottom: 32 }}>
            {summary.recent_members.map((m, i) => <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: i === summary.recent_members.length - 1 ? "none" : "1px solid #eef0ea" }}>
              {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#e8efe9", display: "grid", placeItems: "center", fontWeight: 700 }}>{(m.display_name || "?")[0]}</div>}
              <div style={{ flex: 1, minWidth: 0 }}><strong>{m.display_name || "Χωρίς όνομα"}</strong><div style={{ fontSize: 13, color: "#66756b" }}>{m.city || "Χωρίς περιοχή"}</div></div>
              <time style={{ fontSize: 12, color: "#66756b", textAlign: "right" }}>{date(m.created_at)}</time>
            </div>)}
          </section>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Πεζοπορίες</h2>
          <section style={{ background: "#fff", borderRadius: 18, padding: "8px 18px" }}>
            {summary.recent_hikes.map((h, i) => <div key={i} style={{ padding: "14px 0", borderBottom: i === summary.recent_hikes.length - 1 ? "none" : "1px solid #eef0ea" }}>
              <strong>{h.title}</strong><div style={{ fontSize: 13, color: "#66756b", marginTop: 4 }}>{h.location_name} · {date(h.starts_at)} · {h.status}</div>
            </div>)}
          </section>
        </>}
      </div>
    </main>
  );
}
