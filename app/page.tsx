"use client";

import { FormEvent, useMemo, useState } from "react";

type View = "home" | "map" | "new" | "messages" | "profile";

type Hike = {
  title: string;
  location: string;
  day: string;
  month: string;
  difficulty: "Εύκολη" | "Μέτρια" | "Δύσκολη";
  distance: string;
  people: number;
  start: string;
};

const hikes: Hike[] = [
  {
    title: "Πάρνηθα — Μπάφι & Φλαμπούρι",
    location: "Πάρνηθα, Αττική",
    day: "11",
    month: "ΟΚΤ",
    difficulty: "Μέτρια",
    distance: "9,4 km",
    people: 6,
    start: "08:30"
  },
  {
    title: "Δίρφυς — κορυφή Δέλφι",
    location: "Στενή, Εύβοια",
    day: "18",
    month: "ΟΚΤ",
    difficulty: "Δύσκολη",
    distance: "12,8 km",
    people: 4,
    start: "07:15"
  },
  {
    title: "Υμηττός — Καισαριανή",
    location: "Αθήνα",
    day: "09",
    month: "ΟΚΤ",
    difficulty: "Εύκολη",
    distance: "6,2 km",
    people: 8,
    start: "17:00"
  },
  {
    title: "Μαίναλο — Βυτίνα",
    location: "Αρκαδία",
    day: "25",
    month: "ΟΚΤ",
    difficulty: "Μέτρια",
    distance: "10,1 km",
    people: 5,
    start: "09:00"
  }
];

const nav: { id: View; icon: string; label: string }[] = [
  { id: "home", icon: "⌂", label: "Πεζοπορίες" },
  { id: "map", icon: "⌖", label: "Χάρτης" },
  { id: "new", icon: "＋", label: "Νέα" },
  { id: "messages", icon: "✉", label: "Μηνύματα" },
  { id: "profile", icon: "◉", label: "Προφίλ" }
];

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [filter, setFilter] = useState("Όλες");
  const [toast, setToast] = useState("");

  const visibleHikes = useMemo(() => {
    if (filter === "Όλες") return hikes;
    return hikes.filter((hike) => hike.difficulty === filter);
  }, [filter]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function submitHike(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showToast("Η πεζοπορία δημιουργήθηκε στο demo ✓");
    setView("home");
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
                onClick={() => setView(item.id)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebarFoot">
            MVP έκδοση. Στόχος: βρίσκω πεζοπορία, ζητάω συμμετοχή και γνωρίζω την ομάδα.
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
            <button className="avatarButton" onClick={() => setView("profile")}>PX</button>
          </header>

          {view === "home" && (
            <>
              <section className="hero">
                <div className="heroCopy">
                  <div className="eyebrow" style={{ color: "#dbe8cf" }}>Αθήνα · αυτό το Σαββατοκύριακο</div>
                  <h2>Δεν έχεις παρέα;<br />Βρες τη στο μονοπάτι.</h2>
                  <p>
                    Δες ποιος οργανώνει πεζοπορία, ζήτα να μπεις στην ομάδα και κανονίστε τα πάντα μαζί.
                  </p>
                  <div className="heroActions">
                    <button className="primary" onClick={() => document.getElementById("hikes")?.scrollIntoView({ behavior: "smooth" })}>
                      Βρες πεζοπορία
                    </button>
                    <button className="secondary" onClick={() => setView("new")}>
                      + Οργάνωσε μία
                    </button>
                    <a className="secondary authLink" href="/auth">
                      Σύνδεση
                    </a>
                  </div>
                </div>
              </section>

              <section className="stats">
                <div className="stat"><strong>12</strong><span>πεζοπορίες κοντά σου</span></div>
                <div className="stat"><strong>43</strong><span>πεζοπόροι αυτή την εβδομάδα</span></div>
                <div className="stat"><strong>4.9</strong><span>μέση αξιολόγηση ομάδων</span></div>
              </section>

              <section id="hikes">
                <div className="sectionHeader">
                  <div>
                    <h2>Επόμενες πεζοπορίες</h2>
                    <p>Διάλεξε επίπεδο και μπες στην ομάδα.</p>
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
                    <article className="hikeCard" key={hike.title}>
                      <div className="cardVisual" style={{ filter: `hue-rotate(${index * 9}deg)` }}>
                        <span className="cardBadge">{hike.difficulty}</span>
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
                              <span className="miniAvatar">Μ</span>
                              <span className="miniAvatar">Α</span>
                              <span className="miniAvatar">Κ</span>
                              <span className="miniAvatar">+{Math.max(hike.people - 3, 1)}</span>
                            </div>
                          </div>
                          <button
                            className="joinButton"
                            onClick={() => showToast(`Στάλθηκε αίτημα για «${hike.title}» ✓`)}
                          >
                            Θέλω να μπω
                          </button>
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
                  <h2>Οργάνωσε πεζοπορία</h2>
                  <p>Βάλε τα βασικά. Τα υπόλοιπα τα κανονίζει η ομάδα.</p>
                </div>
              </div>
              <form onSubmit={submitHike}>
                <div className="formGrid">
                  <div className="field full">
                    <label>Τίτλος</label>
                    <input required placeholder="π.χ. Πάρνηθα — Μπάφι & Φλαμπούρι" />
                  </div>
                  <div className="field">
                    <label>Ημερομηνία</label>
                    <input required type="date" />
                  </div>
                  <div className="field">
                    <label>Ώρα έναρξης</label>
                    <input required type="time" />
                  </div>
                  <div className="field">
                    <label>Περιοχή</label>
                    <input required placeholder="π.χ. Πάρνηθα" />
                  </div>
                  <div className="field">
                    <label>Δυσκολία</label>
                    <select defaultValue="Μέτρια">
                      <option>Εύκολη</option>
                      <option>Μέτρια</option>
                      <option>Δύσκολη</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Απόσταση (km)</label>
                    <input type="number" min="1" step="0.1" placeholder="9.4" />
                  </div>
                  <div className="field">
                    <label>Μέγιστα άτομα</label>
                    <input type="number" min="2" max="30" placeholder="8" />
                  </div>
                  <div className="field full">
                    <label>Περιγραφή</label>
                    <textarea rows={5} placeholder="Τι πρέπει να ξέρει η ομάδα; Σημείο συνάντησης, εξοπλισμός, ρυθμός..." />
                  </div>
                </div>
                <button className="submit" type="submit">Δημιουργία πεζοπορίας</button>
              </form>
            </section>
          )}

          {view === "messages" && (
            <section className="messagesCard">
              <div className="sectionHeader" style={{ marginTop: 0 }}>
                <div>
                  <h2>Ομαδικές συζητήσεις</h2>
                  <p>Οι συνομιλίες ανοίγουν αφού εγκριθεί η συμμετοχή.</p>
                </div>
              </div>

              {[
                ["Πάρνηθα · 11 Οκτ", "Μ", "Μάριος: Παιδιά, συνάντηση 08:15 στο parking."],
                ["Υμηττός · 9 Οκτ", "Ε", "Ελένη: Θα έχω δύο έξτρα μπουκάλια νερό."],
                ["Δίρφυς · 18 Οκτ", "Ν", "Νίκος: Ποιος θέλει carpool από Αθήνα;"]
              ].map(([title, avatar, message]) => (
                <div className="messageRow" key={title}>
                  <div className="messageAvatar">{avatar}</div>
                  <div className="messageContent">
                    <strong>{title}</strong>
                    <p>{message}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {view === "profile" && (
            <section className="profileCard">
              <div className="profileHero">
                <div className="profileAvatar">PX</div>
                <div>
                  <h2>Πάνος</h2>
                  <p>Αθήνα · Μέτριο επίπεδο</p>
                </div>
              </div>
              <div className="badgeRow">
                <span className="infoBadge">🥾 7 πεζοπορίες</span>
                <span className="infoBadge">⭐ 4.9 αξιολόγηση</span>
                <span className="infoBadge">⛰ 68 km</span>
              </div>
              <p className="emptyNote">
                Στο πραγματικό onboarding ο χρήστης θα συμπληρώνει εμπειρία, περιοχή, φωτογραφία και τι είδους πεζοπορίες προτιμά.
              </p>
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
