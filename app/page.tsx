"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type View = "home" | "map" | "new" | "messages" | "profile";
type Difficulty = "Εύκολη" | "Μέτρια" | "Δύσκολη";

type Hike = {
  id?: string;
  organizerId?: string;
  title: string;
  location: string;
  day: string;
  month: string;
  difficulty: Difficulty;
  distance: string;
  people: number;
  start: string;
  startsAt?: string;
  description?: string | null;
  distanceKm?: number | null;
  maxParticipants?: number | null;
  demo?: boolean;
};

type DbHike = {
  id: string;
  organizer_id: string;
  title: string;
  location_name: string;
  starts_at: string;
  difficulty: "easy" | "moderate" | "hard";
  distance_km: number | null;
  description: string | null;
  max_participants: number | null;
};

type IncomingRequest = {
  id: string;
  hikeId: string;
  hikeTitle: string;
  userId: string;
  displayName: string;
};

const demoHikes: Hike[] = [
  {
    title: "Πάρνηθα — Μπάφι & Φλαμπούρι",
    location: "Πάρνηθα, Αττική",
    day: "11",
    month: "ΟΚΤ",
    difficulty: "Μέτρια",
    distance: "9,4 km",
    people: 6,
    start: "08:30",
    demo: true
  },
  {
    title: "Δίρφυς — κορυφή Δέλφι",
    location: "Στενή, Εύβοια",
    day: "18",
    month: "ΟΚΤ",
    difficulty: "Δύσκολη",
    distance: "12,8 km",
    people: 4,
    start: "07:15",
    demo: true
  },
  {
    title: "Υμηττός — Καισαριανή",
    location: "Αθήνα",
    day: "09",
    month: "ΟΚΤ",
    difficulty: "Εύκολη",
    distance: "6,2 km",
    people: 8,
    start: "17:00",
    demo: true
  },
  {
    title: "Μαίναλο — Βυτίνα",
    location: "Αρκαδία",
    day: "25",
    month: "ΟΚΤ",
    difficulty: "Μέτρια",
    distance: "10,1 km",
    people: 5,
    start: "09:00",
    demo: true
  }
];

const nav: { id: View; icon: string; label: string }[] = [
  { id: "home", icon: "⌂", label: "Πεζοπορίες" },
  { id: "map", icon: "⌖", label: "Χάρτης" },
  { id: "new", icon: "＋", label: "Νέα" },
  { id: "messages", icon: "✉", label: "Μηνύματα" },
  { id: "profile", icon: "◉", label: "Προφίλ" }
];

const monthNames = ["ΙΑΝ", "ΦΕΒ", "ΜΑΡ", "ΑΠΡ", "ΜΑΪ", "ΙΟΥΝ", "ΙΟΥΛ", "ΑΥΓ", "ΣΕΠ", "ΟΚΤ", "ΝΟΕ", "ΔΕΚ"];

function mapDifficulty(value: DbHike["difficulty"]): Difficulty {
  if (value === "easy") return "Εύκολη";
  if (value === "hard") return "Δύσκολη";
  return "Μέτρια";
}

function mapDifficultyToDb(value: string): DbHike["difficulty"] {
  if (value === "Εύκολη") return "easy";
  if (value === "Δύσκολη") return "hard";
  return "moderate";
}

function dbHikeToCard(hike: DbHike): Hike {
  const date = new Date(hike.starts_at);
  return {
    id: hike.id,
    organizerId: hike.organizer_id,
    title: hike.title,
    location: hike.location_name,
    day: String(date.getDate()).padStart(2, "0"),
    month: monthNames[date.getMonth()],
    difficulty: mapDifficulty(hike.difficulty),
    distance: hike.distance_km ? `${String(hike.distance_km).replace(".", ",")} km` : "—",
    people: 1,
    start: date.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" }),
    startsAt: hike.starts_at,
    description: hike.description,
    distanceKm: hike.distance_km,
    maxParticipants: hike.max_participants
  };
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [filter, setFilter] = useState("Όλες");
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [realHikes, setRealHikes] = useState<Hike[]>([]);
  const [loadingHikes, setLoadingHikes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [handlingRequestId, setHandlingRequestId] = useState<string | null>(null);
  const [deletingHikeId, setDeletingHikeId] = useState<string | null>(null);
  const [editingHike, setEditingHike] = useState<Hike | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user ?? null;
      setUser(currentUser);
      if (currentUser) loadIncomingRequests(currentUser.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) loadIncomingRequests(currentUser.id);
      else setIncomingRequests([]);
    });

    loadHikes();

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function loadHikes() {
    setLoadingHikes(true);

    const { data, error } = await supabase
      .from("hikes")
      .select("id, organizer_id, title, location_name, starts_at, difficulty, distance_km, description, max_participants")
      .eq("status", "open")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(30);

    if (!error && data) {
      setRealHikes((data as DbHike[]).map(dbHikeToCard));
    }

    setLoadingHikes(false);
  }

  async function loadIncomingRequests(userId: string) {
    const { data: ownedHikes, error: hikesError } = await supabase
      .from("hikes")
      .select("id, title")
      .eq("organizer_id", userId);

    if (hikesError || !ownedHikes?.length) {
      setIncomingRequests([]);
      return;
    }

    const hikeIds = ownedHikes.map((hike) => hike.id);
    const titleByHike = new Map(ownedHikes.map((hike) => [hike.id, hike.title]));

    const { data: requests, error: requestsError } = await supabase
      .from("join_requests")
      .select("id, hike_id, user_id")
      .in("hike_id", hikeIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (requestsError || !requests?.length) {
      setIncomingRequests([]);
      return;
    }

    const userIds = [...new Set(requests.map((request) => request.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    const nameByUser = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));

    setIncomingRequests(
      requests.map((request) => ({
        id: request.id,
        hikeId: request.hike_id,
        hikeTitle: titleByHike.get(request.hike_id) ?? "Πεζοπορία",
        userId: request.user_id,
        displayName: nameByUser.get(request.user_id) || "Πεζοπόρος"
      }))
    );
  }

  async function handleJoinRequest(request: IncomingRequest, action: "accepted" | "rejected") {
    if (!user) return;

    setHandlingRequestId(request.id);

    const { error: updateError } = await supabase
      .from("join_requests")
      .update({ status: action, updated_at: new Date().toISOString() })
      .eq("id", request.id);

    if (updateError) {
      showToast(`Δεν ενημερώθηκε το αίτημα: ${updateError.message}`);
      setHandlingRequestId(null);
      return;
    }

    if (action === "accepted") {
      const { error: participantError } = await supabase
        .from("participants")
        .insert({ hike_id: request.hikeId, user_id: request.userId });

      if (participantError && participantError.code !== "23505") {
        showToast(`Το αίτημα εγκρίθηκε, αλλά υπήρξε θέμα με τον συμμετέχοντα: ${participantError.message}`);
        setHandlingRequestId(null);
        await loadIncomingRequests(user.id);
        return;
      }
    }

    await loadIncomingRequests(user.id);
    setHandlingRequestId(null);
    showToast(action === "accepted" ? "Ο πεζοπόρος μπήκε στην ομάδα ✓" : "Το αίτημα απορρίφθηκε.");
  }

  const allHikes = useMemo(() => [...realHikes, ...demoHikes], [realHikes]);

  const visibleHikes = useMemo(() => {
    if (filter === "Όλες") return allHikes;
    return allHikes.filter((hike) => hike.difficulty === filter);
  }, [allHikes, filter]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function requireLogin() {
    showToast("Χρειάζεται σύνδεση για αυτή την ενέργεια.");
    window.setTimeout(() => {
      window.location.href = "/auth";
    }, 650);
  }

  function openNewHike() {
    setEditingHike(null);
    setView("new");
  }

  function startEditHike(hike: Hike) {
    if (!user || !hike.id || hike.organizerId !== user.id) return;
    setEditingHike(hike);
    setView("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function localDateValue(iso?: string) {
    if (!iso) return "";
    const date = new Date(iso);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function localTimeValue(iso?: string) {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  async function submitHike(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      requireLogin();
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const date = String(form.get("date") ?? "");
    const time = String(form.get("time") ?? "");
    const location = String(form.get("location") ?? "").trim();
    const difficulty = String(form.get("difficulty") ?? "Μέτρια");
    const distanceRaw = String(form.get("distance") ?? "").trim();
    const maxRaw = String(form.get("maxParticipants") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    if (!title || !date || !time || !location) {
      showToast("Συμπλήρωσε τα βασικά πεδία.");
      return;
    }

    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      showToast("Η ημερομηνία ή η ώρα δεν είναι σωστή.");
      return;
    }

    setSubmitting(true);

    const payload = {
      title,
      description: description || null,
      location_name: location,
      starts_at: startsAt.toISOString(),
      difficulty: mapDifficultyToDb(difficulty),
      distance_km: distanceRaw ? Number(distanceRaw) : null,
      max_participants: maxRaw ? Number(maxRaw) : null,
      updated_at: new Date().toISOString()
    };

    const { error } = editingHike?.id
      ? await supabase
          .from("hikes")
          .update(payload)
          .eq("id", editingHike.id)
          .eq("organizer_id", user.id)
      : await supabase.from("hikes").insert({
          organizer_id: user.id,
          ...payload
        });

    setSubmitting(false);

    if (error) {
      showToast(`Δεν αποθηκεύτηκε: ${error.message}`);
      return;
    }

    event.currentTarget.reset();
    const wasEditing = Boolean(editingHike?.id);
    setEditingHike(null);
    await loadHikes();
    setView("home");
    showToast(wasEditing ? "Οι αλλαγές αποθηκεύτηκαν ✓" : "Η πεζοπορία δημοσιεύτηκε κανονικά ✓");
  }

  async function deleteHike(hike: Hike) {
    if (!user || !hike.id || hike.organizerId !== user.id) return;

    const confirmed = window.confirm(`Να διαγραφεί οριστικά η πεζοπορία «${hike.title}»;`);
    if (!confirmed) return;

    setDeletingHikeId(hike.id);

    const { error } = await supabase
      .from("hikes")
      .delete()
      .eq("id", hike.id)
      .eq("organizer_id", user.id);

    if (error) {
      showToast(`Δεν διαγράφηκε: ${error.message}`);
      setDeletingHikeId(null);
      return;
    }

    await Promise.all([loadHikes(), loadIncomingRequests(user.id)]);
    setDeletingHikeId(null);
    showToast("Η πεζοπορία διαγράφηκε ✓");
  }

  async function requestJoin(hike: Hike) {
    if (hike.demo || !hike.id) {
      showToast("Αυτό είναι demo πεζοπορία. Οι νέες θα είναι πραγματικές.");
      return;
    }

    if (!user) {
      requireLogin();
      return;
    }

    if (hike.organizerId === user.id) {
      showToast("Αυτή η πεζοπορία είναι δική σου.");
      return;
    }

    const { error } = await supabase.from("join_requests").insert({
      hike_id: hike.id,
      user_id: user.id
    });

    if (error) {
      if (error.code === "23505") {
        showToast("Έχεις ήδη στείλει αίτημα γι' αυτή την πεζοπορία.");
      } else {
        showToast(`Δεν στάλθηκε: ${error.message}`);
      }
      return;
    }

    showToast(`Στάλθηκε πραγματικό αίτημα για «${hike.title}» ✓`);
  }

  return (
    <div className="appShell">
      <div className="desktopFrame">
        <aside className="sidebar">
          <div className="brand">
            <div className="brandMark">△</div>
            <div className="brandText">
              Hiking MVP
              <small>find your trail people</small>
            </div>
          </div>

          <nav className="sideNav">
            {nav.map((item) => (
              <button
                className={`navButton ${view === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => item.id === "new" ? openNewHike() : setView(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebarFoot">
            {user ? `Συνδεδεμένος ως ${user.email ?? "χρήστης"}` : "Σύνδεση για δημιουργία πεζοπορίας και αιτήματα συμμετοχής."}
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <div className="eyebrow">Η παρέα σου είναι εκεί έξω</div>
              <h1>{view === "home" ? "Πάμε βουνό;" : nav.find((x) => x.id === view)?.label}</h1>
              <p className="subtitle">
                {view === "home"
                  ? "Βρες την επόμενη πεζοπορία και την ομάδα που σου ταιριάζει."
                  : "Πρώτη λειτουργική έκδοση του hiking community."}
              </p>
            </div>
            <button className="avatarButton" onClick={() => setView("profile")}>
              {user?.email?.slice(0, 2).toUpperCase() ?? "PX"}
            </button>
          </header>

          {view === "home" && (
            <>
              <section className="hero">
                <div className="heroCopy">
                  <div className="eyebrow" style={{ color: "#dbe8cf" }}>Ελλάδα · νέες παρέες στο βουνό</div>
                  <h2>Δεν έχεις παρέα;<br />Βρες τη στο μονοπάτι.</h2>
                  <p>
                    Δες ποιος οργανώνει πεζοπορία, ζήτα να μπεις στην ομάδα και κανονίστε τα πάντα μαζί.
                  </p>
                  <div className="heroActions">
                    <button className="primary" onClick={() => document.getElementById("hikes")?.scrollIntoView({ behavior: "smooth" })}>
                      Βρες πεζοπορία
                    </button>
                    <button className="secondary" onClick={openNewHike}>
                      + Οργάνωσε μία
                    </button>
                    <a className="secondary authLink" href="/auth">
                      {user ? "Λογαριασμός" : "Σύνδεση"}
                    </a>
                  </div>
                </div>
              </section>

              <section className="stats">
                <div className="stat"><strong>{realHikes.length}</strong><span>πραγματικές ανοιχτές πεζοπορίες</span></div>
                <div className="stat"><strong>{realHikes.length + demoHikes.length}</strong><span>διαθέσιμες στο MVP</span></div>
                <div className="stat"><strong>{user ? "✓" : "—"}</strong><span>{user ? "είσαι συνδεδεμένος" : "σύνδεση για συμμετοχή"}</span></div>
              </section>

              <section id="hikes">
                <div className="sectionHeader">
                  <div>
                    <h2>Επόμενες πεζοπορίες</h2>
                    <p>{loadingHikes ? "Φορτώνουμε τις πραγματικές πεζοπορίες..." : "Οι νέες δημοσιεύσεις έρχονται live από το Supabase."}</p>
                  </div>
                  <div className="filters">
                    {["Όλες", "Εύκολη", "Μέτρια", "Δύσκολη"].map((item) => (
                      <button
                        key={item}
                        className={`chip ${filter === item ? "active" : ""}`}
                        onClick={() => setFilter(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hikeGrid">
                  {visibleHikes.map((hike, index) => (
                    <article className="hikeCard" key={hike.id ?? `demo-${hike.title}`}>
                      <div className="cardVisual" style={{ filter: `hue-rotate(${index * 9}deg)` }}>
                        <span className="cardBadge">{hike.demo ? `Demo · ${hike.difficulty}` : `Live · ${hike.difficulty}`}</span>
                        <span className="cardDate"><strong>{hike.day}</strong>{hike.month}</span>
                      </div>
                      <div className="cardBody">
                        <h3>{hike.title}</h3>
                        <div className="cardMeta">
                          📍 {hike.location}<br />
                          ↗ {hike.distance} · ⏰ {hike.start}
                        </div>
                        <div className="peopleRow">
                          <div>
                            <div className="avatars">
                              <span className="miniAvatar">{hike.demo ? "Μ" : "Ο"}</span>
                              {hike.demo && <span className="miniAvatar">Α</span>}
                              {hike.demo && <span className="miniAvatar">Κ</span>}
                              <span className="miniAvatar">+{Math.max(hike.people - (hike.demo ? 3 : 1), 0)}</span>
                            </div>
                          </div>
                          {hike.organizerId === user?.id && hike.id ? (
                            <div className="ownerActions">
                              <button
                                className="editHikeButton"
                                onClick={() => startEditHike(hike)}
                              >
                                Επεξεργασία
                              </button>
                              <button
                                className="deleteHikeButton"
                                disabled={deletingHikeId === hike.id}
                                onClick={() => deleteHike(hike)}
                              >
                                {deletingHikeId === hike.id ? "Διαγραφή..." : "Διαγραφή"}
                              </button>
                            </div>
                          ) : (
                            <button
                              className="joinButton"
                              onClick={() => requestJoin(hike)}
                            >
                              Θέλω να μπω
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {view === "map" && (
            <section className="mapCard">
              <div className="mapVisual">
                <svg className="trailSvg" viewBox="0 0 900 500" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M 40 420 C 160 360, 160 210, 300 245 S 470 420, 560 300 S 680 90, 850 120" fill="none" stroke="#52765a" strokeWidth="10" strokeLinecap="round" strokeDasharray="1 22" />
                  <path d="M 40 420 C 160 360, 160 210, 300 245 S 470 420, 560 300 S 680 90, 850 120" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="mapPin" style={{ left: "18%", top: "63%" }}><span>🥾</span></div>
                <div className="mapPin" style={{ left: "51%", top: "61%" }}><span>🥾</span></div>
                <div className="mapPin" style={{ left: "76%", top: "29%" }}><span>🥾</span></div>
                <div className="mapLegend">
                  <strong>Πεζοπορίες κοντά σου</strong>
                  <div className="emptyNote">Στην επόμενη φάση εδώ θα μπει πραγματικός χάρτης με GPS/GPX διαδρομές.</div>
                </div>
              </div>
            </section>
          )}

          {view === "new" && (
            <section className="formCard">
              <div className="sectionHeader" style={{ marginTop: 0 }}>
                <div>
                  <h2>{editingHike ? "Επεξεργασία πεζοπορίας" : "Οργάνωσε πεζοπορία"}</h2>
                  <p>{user ? (editingHike ? "Άλλαξε ό,τι χρειάζεται και αποθήκευσε." : "Η δημοσίευση θα αποθηκευτεί πραγματικά στη βάση.") : "Συνδέσου πρώτα για να δημοσιεύσεις."}</p>
                </div>
              </div>

              {!user ? (
                <>
                  <p className="emptyNote">Η δημιουργία πεζοπορίας είναι διαθέσιμη μόνο σε συνδεδεμένους χρήστες.</p>
                  <a className="submit authLink" href="/auth">Σύνδεση / Εγγραφή</a>
                </>
              ) : (
                <form key={editingHike?.id ?? "new-hike"} onSubmit={submitHike}>
                  <div className="formGrid">
                    <div className="field full">
                      <label>Τίτλος</label>
                      <input name="title" required defaultValue={editingHike?.title ?? ""} placeholder="π.χ. Πάρνηθα — Μπάφι & Φλαμπούρι" />
                    </div>
                    <div className="field">
                      <label>Ημερομηνία</label>
                      <input name="date" required type="date" defaultValue={localDateValue(editingHike?.startsAt)} />
                    </div>
                    <div className="field">
                      <label>Ώρα έναρξης</label>
                      <input name="time" required type="time" defaultValue={localTimeValue(editingHike?.startsAt)} />
                    </div>
                    <div className="field">
                      <label>Περιοχή</label>
                      <input name="location" required defaultValue={editingHike?.location ?? ""} placeholder="π.χ. Πάρνηθα" />
                    </div>
                    <div className="field">
                      <label>Δυσκολία</label>
                      <select name="difficulty" defaultValue={editingHike?.difficulty ?? "Μέτρια"}>
                        <option>Εύκολη</option>
                        <option>Μέτρια</option>
                        <option>Δύσκολη</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Απόσταση (km)</label>
                      <input name="distance" type="number" min="0.1" step="0.1" defaultValue={editingHike?.distanceKm ?? ""} placeholder="9.4" />
                    </div>
                    <div className="field">
                      <label>Μέγιστα άτομα</label>
                      <input name="maxParticipants" type="number" min="2" max="30" defaultValue={editingHike?.maxParticipants ?? ""} placeholder="8" />
                    </div>
                    <div className="field full">
                      <label>Περιγραφή</label>
                      <textarea name="description" rows={5} defaultValue={editingHike?.description ?? ""} placeholder="Τι πρέπει να ξέρει η ομάδα; Σημείο συνάντησης, εξοπλισμός, ρυθμός..." />
                    </div>
                  </div>
                  <div className="formActions">
                    <button className="submit" type="submit" disabled={submitting}>
                      {submitting ? "Αποθήκευση..." : editingHike ? "Αποθήκευση αλλαγών" : "Δημιουργία πεζοπορίας"}
                    </button>
                    {editingHike && (
                      <button
                        className="cancelEditButton"
                        type="button"
                        onClick={() => { setEditingHike(null); setView("home"); }}
                      >
                        Ακύρωση
                      </button>
                    )}
                  </div>
                </form>
              )}
            </section>
          )}

          {view === "messages" && (
            <section className="messagesCard">
              <div className="sectionHeader" style={{ marginTop: 0 }}>
                <div>
                  <h2>Ομαδικές συζητήσεις</h2>
                  <p>Το chat θα ανοίγει μετά την αποδοχή συμμετοχής.</p>
                </div>
              </div>
              <p className="emptyNote">Η βάση για τα messages είναι ήδη έτοιμη. Επόμενο βήμα: accept/reject αιτημάτων και πραγματικό group chat.</p>
            </section>
          )}

          {view === "profile" && (
            <section className="profileCard">
              <div className="profileHero">
                <div className="profileAvatar">{user?.email?.slice(0, 2).toUpperCase() ?? "PX"}</div>
                <div>
                  <h2>{user ? "Το προφίλ σου" : "Guest"}</h2>
                  <p>{user?.email ?? "Συνδέσου για να δημιουργήσεις προφίλ"}</p>
                </div>
              </div>
              <div className="badgeRow">
                <span className="infoBadge">🥾 {realHikes.filter((hike) => hike.organizerId === user?.id).length} οργανωμένες</span>
                <span className="infoBadge">📨 {incomingRequests.length} νέα αιτήματα</span>
                <span className="infoBadge">⛰ MVP member</span>
              </div>

              {user && (
                <div className="requestPanel">
                  <h3>Αιτήματα συμμετοχής</h3>
                  {incomingRequests.length === 0 ? (
                    <p className="emptyNote">Δεν έχεις εκκρεμή αιτήματα αυτή τη στιγμή.</p>
                  ) : (
                    incomingRequests.map((request) => (
                      <div className="requestRow" key={request.id}>
                        <div>
                          <strong>{request.displayName}</strong>
                          <span>θέλει να μπει στο «{request.hikeTitle}»</span>
                        </div>
                        <div className="requestActions">
                          <button
                            className="requestAccept"
                            disabled={handlingRequestId === request.id}
                            onClick={() => handleJoinRequest(request, "accepted")}
                          >
                            Αποδοχή
                          </button>
                          <button
                            className="requestReject"
                            disabled={handlingRequestId === request.id}
                            onClick={() => handleJoinRequest(request, "rejected")}
                          >
                            Απόρριψη
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!user && <a className="submit authLink" href="/auth">Σύνδεση / Εγγραφή</a>}
            </section>
          )}
        </main>

        <nav className="mobileNav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`${view === item.id ? "active" : ""} ${item.id === "new" ? "plus" : ""}`}
              onClick={() => setView(item.id)}
            >
              <span>{item.icon}</span>
              {item.id !== "new" && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
