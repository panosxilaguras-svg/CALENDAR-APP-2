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
  organizerName?: string;
  organizerAvatar?: string | null;
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

type ChatGroup = {
  id: string;
  title: string;
  startsAt: string;
  role: "organizer" | "participant";
};

type ChatMessage = {
  id: number;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

type PublicProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  experienceLevel: "beginner" | "intermediate" | "advanced" | null;
  bio: string | null;
};

type HikeParticipant = PublicProfile & {
  joinedAt: string;
};

type MyJoinStatus = "pending" | "accepted" | "rejected" | "cancelled";

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
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [selectedHike, setSelectedHike] = useState<Hike | null>(null);
  const [detailParticipants, setDetailParticipants] = useState<HikeParticipant[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myJoinRequests, setMyJoinRequests] = useState<Record<string, { id: string; status: MyJoinStatus }>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const currentUser = data.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadIncomingRequests(currentUser.id);
        loadChatGroups(currentUser.id);
        loadCurrentProfile(currentUser.id);
        loadMyJoinRequests(currentUser.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadIncomingRequests(currentUser.id);
        loadChatGroups(currentUser.id);
        loadCurrentProfile(currentUser.id);
        loadMyJoinRequests(currentUser.id);
      } else {
        setIncomingRequests([]);
        setChatGroups([]);
        setSelectedChatId(null);
        setChatMessages([]);
        setProfile(null);
        setMyJoinRequests({});
      }
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
      const dbHikes = data as DbHike[];
      const hikeIds = dbHikes.map((hike) => hike.id);
      const organizerIds = [...new Set(dbHikes.map((hike) => hike.organizer_id))];

      const [{ data: participants }, { data: organizerProfiles }] = await Promise.all([
        hikeIds.length
          ? supabase.from("participants").select("hike_id, user_id").in("hike_id", hikeIds)
          : Promise.resolve({ data: [] as { hike_id: string; user_id: string }[] }),
        organizerIds.length
          ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", organizerIds)
          : Promise.resolve({ data: [] as { id: string; display_name: string; avatar_url: string | null }[] })
      ]);

      const participantCount = new Map<string, number>();
      for (const row of participants ?? []) {
        participantCount.set(row.hike_id, (participantCount.get(row.hike_id) ?? 0) + 1);
      }

      const organizers = new Map(
        (organizerProfiles ?? []).map((item) => [
          item.id,
          { name: item.display_name || "Πεζοπόρος", avatar: item.avatar_url }
        ])
      );

      setRealHikes(
        dbHikes.map((item) => {
          const card = dbHikeToCard(item);
          const organizer = organizers.get(item.organizer_id);
          return {
            ...card,
            people: 1 + (participantCount.get(item.id) ?? 0),
            organizerName: organizer?.name ?? "Πεζοπόρος",
            organizerAvatar: organizer?.avatar ?? null
          };
        })
      );
    }

    setLoadingHikes(false);
  }

  function toPublicProfile(row: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    city: string | null;
    experience_level: PublicProfile["experienceLevel"];
    bio: string | null;
  }): PublicProfile {
    return {
      id: row.id,
      displayName: row.display_name || "Πεζοπόρος",
      avatarUrl: row.avatar_url,
      city: row.city,
      experienceLevel: row.experience_level,
      bio: row.bio
    };
  }

  function avatarPublicUrl(path?: string | null) {
    if (!path) return null;
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  function initials(name?: string | null) {
    const value = (name || "Πεζοπόρος").trim();
    const parts = value.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || "Π") + (parts[1]?.[0] || "");
  }

  function experienceLabel(level: PublicProfile["experienceLevel"]) {
    if (level === "beginner") return "Αρχάριο επίπεδο";
    if (level === "advanced") return "Προχωρημένο επίπεδο";
    if (level === "intermediate") return "Μέτριο επίπεδο";
    return "Δεν έχει δηλωθεί επίπεδο";
  }

  async function fetchPublicProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, city, experience_level, bio")
      .eq("id", userId)
      .single();

    return data ? toPublicProfile(data) : null;
  }

  async function loadCurrentProfile(userId: string) {
    const nextProfile = await fetchPublicProfile(userId);
    setProfile(nextProfile);
  }

  async function openPublicProfile(userId: string) {
    const nextProfile = await fetchPublicProfile(userId);
    if (nextProfile) setSelectedProfile(nextProfile);
  }

  async function openHikeDetails(hike: Hike) {
    setSelectedHike(hike);
    setDetailParticipants([]);
    if (!hike.id || hike.demo) return;

    setDetailLoading(true);

    const { data: memberships } = await supabase
      .from("participants")
      .select("user_id, joined_at")
      .eq("hike_id", hike.id)
      .order("joined_at", { ascending: true });

    const participantRows = memberships ?? [];
    const userIds = participantRows.map((row) => row.user_id);

    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, city, experience_level, bio")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((row) => [row.id, toPublicProfile(row)]));
      setDetailParticipants(
        participantRows
          .map((row) => {
            const member = profileMap.get(row.user_id);
            return member ? { ...member, joinedAt: row.joined_at } : null;
          })
          .filter((member): member is HikeParticipant => Boolean(member))
      );
    }

    setDetailLoading(false);
  }

  async function loadMyJoinRequests(userId: string) {
    const { data } = await supabase
      .from("join_requests")
      .select("id, hike_id, status")
      .eq("user_id", userId);

    const next: Record<string, { id: string; status: MyJoinStatus }> = {};
    for (const row of data ?? []) {
      next[row.hike_id] = { id: row.id, status: row.status as MyJoinStatus };
    }
    setMyJoinRequests(next);
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

  async function loadChatGroups(userId: string) {
    const [{ data: ownedHikes }, { data: memberships }] = await Promise.all([
      supabase
        .from("hikes")
        .select("id, title, starts_at")
        .eq("organizer_id", userId)
        .order("starts_at", { ascending: true }),
      supabase
        .from("participants")
        .select("hike_id")
        .eq("user_id", userId)
    ]);

    const participantIds = [...new Set((memberships ?? []).map((row) => row.hike_id))];
    let joinedHikes: { id: string; title: string; starts_at: string }[] = [];

    if (participantIds.length) {
      const { data } = await supabase
        .from("hikes")
        .select("id, title, starts_at")
        .in("id", participantIds)
        .order("starts_at", { ascending: true });

      joinedHikes = data ?? [];
    }

    const groupMap = new Map<string, ChatGroup>();

    for (const hike of ownedHikes ?? []) {
      groupMap.set(hike.id, {
        id: hike.id,
        title: hike.title,
        startsAt: hike.starts_at,
        role: "organizer"
      });
    }

    for (const hike of joinedHikes) {
      if (!groupMap.has(hike.id)) {
        groupMap.set(hike.id, {
          id: hike.id,
          title: hike.title,
          startsAt: hike.starts_at,
          role: "participant"
        });
      }
    }

    const groups = [...groupMap.values()].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

    setChatGroups(groups);

    if (!groups.length) {
      setSelectedChatId(null);
      setChatMessages([]);
      return;
    }

    setSelectedChatId((current) =>
      current && groups.some((group) => group.id === current) ? current : groups[0].id
    );
  }

  async function loadChatMessages(hikeId: string) {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("hike_id", hikeId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error || !messages) {
      setChatMessages([]);
      return;
    }

    const senderIds = [...new Set(messages.map((message) => message.sender_id))];
    let nameByUser = new Map<string, string>();

    if (senderIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", senderIds);

      nameByUser = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.display_name || "Πεζοπόρος"])
      );
    }

    setChatMessages(
      messages.map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        senderName: nameByUser.get(message.sender_id) || "Πεζοπόρος",
        body: message.body,
        createdAt: message.created_at
      }))
    );
  }

  async function sendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !selectedChatId) return;

    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const body = String(data.get("message") ?? "").trim();
    if (!body) return;

    setSendingMessage(true);

    const { error } = await supabase.from("messages").insert({
      hike_id: selectedChatId,
      sender_id: user.id,
      body
    });

    setSendingMessage(false);

    if (error) {
      showToast(`Δεν στάλθηκε το μήνυμα: ${error.message}`);
      return;
    }

    formElement.reset();
    await loadChatMessages(selectedChatId);
  }

  async function handleJoinRequest(request: IncomingRequest, action: "accepted" | "rejected") {
    if (!user) return;

    setHandlingRequestId(request.id);

    const { error: updateError } = action === "accepted"
      ? await supabase.rpc("accept_join_request", { p_request_id: request.id })
      : await supabase
          .from("join_requests")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", request.id);

    if (updateError) {
      const message = updateError.message.includes("Hike is full")
        ? "Η πεζοπορία έχει ήδη γεμίσει."
        : updateError.message;
      showToast(`Δεν ενημερώθηκε το αίτημα: ${message}`);
      setHandlingRequestId(null);
      return;
    }

    await Promise.all([loadIncomingRequests(user.id), loadChatGroups(user.id), loadHikes()]);
    setHandlingRequestId(null);
    showToast(action === "accepted" ? "Ο πεζοπόρος μπήκε στην ομάδα και άνοιξε το group chat ✓" : "Το αίτημα απορρίφθηκε.");
  }

  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(() => {
      loadMyJoinRequests(user.id);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (view !== "messages" || !user) return;

    loadChatGroups(user.id);
    const timer = window.setInterval(() => {
      loadChatGroups(user.id);
      if (selectedChatId) loadChatMessages(selectedChatId);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [view, user, selectedChatId]);

  useEffect(() => {
    if (view === "messages" && selectedChatId) {
      loadChatMessages(selectedChatId);
    }
  }, [view, selectedChatId]);

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

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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

    formElement.reset();
    const wasEditing = Boolean(editingHike?.id);
    setEditingHike(null);
    setView("home");
    showToast(wasEditing ? "Οι αλλαγές αποθηκεύτηκαν ✓" : "Η πεζοπορία σας δημιουργήθηκε ✓");
    void loadHikes();
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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const experienceLevel = String(form.get("experienceLevel") ?? "");
    const bio = String(form.get("bio") ?? "").trim();

    if (!displayName) {
      showToast("Βάλε ένα όνομα στο προφίλ σου.");
      return;
    }

    setSavingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        city: city || null,
        experience_level: experienceLevel || null,
        bio: bio || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    setSavingProfile(false);

    if (error) {
      showToast(`Δεν αποθηκεύτηκε το προφίλ: ${error.message}`);
      return;
    }

    await Promise.all([loadCurrentProfile(user.id), loadHikes()]);
    showToast("Το προφίλ αποθηκεύτηκε ✓");
  }

  async function uploadAvatar(file?: File) {
    if (!user || !file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Διάλεξε αρχείο εικόνας.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Η φωτογραφία πρέπει να είναι έως 2 MB.");
      return;
    }

    setUploadingAvatar(true);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setUploadingAvatar(false);
      showToast(`Δεν ανέβηκε η φωτογραφία: ${uploadError.message}`);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: path, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    setUploadingAvatar(false);

    if (profileError) {
      showToast(`Η φωτογραφία ανέβηκε αλλά δεν αποθηκεύτηκε στο προφίλ: ${profileError.message}`);
      return;
    }

    await loadCurrentProfile(user.id);
    showToast("Η φωτογραφία προφίλ άλλαξε ✓");
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

    if (hike.maxParticipants && hike.people >= hike.maxParticipants) {
      showToast("Η πεζοπορία είναι γεμάτη.");
      return;
    }

    const existing = myJoinRequests[hike.id];

    const { error } = existing
      ? await supabase
          .from("join_requests")
          .update({
            status: "pending",
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .eq("user_id", user.id)
      : await supabase.from("join_requests").insert({
          hike_id: hike.id,
          user_id: user.id
        });

    if (error) {
      showToast(`Δεν στάλθηκε: ${error.message}`);
      return;
    }

    await loadMyJoinRequests(user.id);
    showToast(`Στάλθηκε αίτημα για «${hike.title}» ✓`);
  }

  async function cancelJoinRequest(hike: Hike) {
    if (!user || !hike.id) return;
    const request = myJoinRequests[hike.id];
    if (!request || request.status !== "pending") return;

    const { error } = await supabase
      .from("join_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", request.id)
      .eq("user_id", user.id);

    if (error) {
      showToast(`Δεν ακυρώθηκε το αίτημα: ${error.message}`);
      return;
    }

    await loadMyJoinRequests(user.id);
    showToast("Το αίτημα συμμετοχής ακυρώθηκε.");
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
              {profile?.avatarUrl ? (
                <img src={avatarPublicUrl(profile.avatarUrl) ?? ""} alt="" />
              ) : (
                initials(profile?.displayName || user?.email?.split("@")[0] || "PX").toUpperCase()
              )}
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
                        <button className="cardTitleButton" onClick={() => openHikeDetails(hike)}>
                          <h3>{hike.title}</h3>
                        </button>
                        <div className="organizerLine">
                          {hike.organizerAvatar ? (
                            <img src={avatarPublicUrl(hike.organizerAvatar) ?? ""} alt="" />
                          ) : (
                            <span>{initials(hike.organizerName || "Ο")}</span>
                          )}
                          <button
                            type="button"
                            disabled={hike.demo || !hike.organizerId}
                            onClick={() => hike.organizerId && openPublicProfile(hike.organizerId)}
                          >
                            {hike.organizerName || (hike.demo ? "Demo organizer" : "Πεζοπόρος")}
                          </button>
                        </div>
                        <div className="cardMeta">
                          📍 {hike.location}<br />
                          ↗ {hike.distance} · ⏰ {hike.start} · 👥 {hike.people}{hike.maxParticipants ? `/${hike.maxParticipants}` : ""}
                        </div>
                        <div className="peopleRow">
                          <button className="detailsButton" onClick={() => openHikeDetails(hike)}>
                            Λεπτομέρειες
                          </button>
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
                          ) : hike.id && myJoinRequests[hike.id]?.status === "pending" ? (
                            <button className="pendingButton" onClick={() => cancelJoinRequest(hike)}>
                              Αναμονή · Ακύρωση
                            </button>
                          ) : hike.id && myJoinRequests[hike.id]?.status === "accepted" ? (
                            <button className="memberButton" onClick={() => setView("messages")}>
                              Μέλος · Chat
                            </button>
                          ) : (
                            <button
                              className="joinButton"
                              disabled={Boolean(hike.maxParticipants && hike.people >= hike.maxParticipants)}
                              onClick={() => requestJoin(hike)}
                            >
                              {hike.maxParticipants && hike.people >= hike.maxParticipants ? "Γεμάτη" : "Θέλω να μπω"}
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
                  <p>Το group chat εμφανίζεται μόλις εγκριθεί η συμμετοχή.</p>
                </div>
              </div>

              {!user ? (
                <div className="chatLoginBox">
                  <p className="emptyNote">Συνδέσου για να δεις τα group chats των πεζοποριών σου.</p>
                  <a className="submit authLink" href="/auth">Σύνδεση / Εγγραφή</a>
                </div>
              ) : chatGroups.length === 0 ? (
                <p className="emptyNote">Δεν έχεις ενεργό group chat ακόμη. Μόλις οργανώσεις πεζοπορία ή εγκριθεί η συμμετοχή σου, θα εμφανιστεί εδώ.</p>
              ) : (
                <div className="chatLayout">
                  <div className="chatGroups">
                    {chatGroups.map((group) => (
                      <button
                        key={group.id}
                        className={`chatGroupButton ${selectedChatId === group.id ? "active" : ""}`}
                        onClick={() => setSelectedChatId(group.id)}
                      >
                        <strong>{group.title}</strong>
                        <span>
                          {new Date(group.startsAt).toLocaleDateString("el-GR", { day: "numeric", month: "short" })}
                          {" · "}
                          {group.role === "organizer" ? "Διοργανωτής" : "Συμμετέχων"}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="chatPane">
                    <div className="chatHeader">
                      <strong>{chatGroups.find((group) => group.id === selectedChatId)?.title ?? "Group chat"}</strong>
                      <span>Ανανέωση αυτόματα</span>
                    </div>

                    <div className="chatMessages">
                      {chatMessages.length === 0 ? (
                        <p className="emptyNote">Δεν υπάρχουν μηνύματα ακόμη. Στείλε το πρώτο 👋</p>
                      ) : (
                        chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`chatBubble ${message.senderId === user.id ? "mine" : ""}`}
                          >
                            <strong>{message.senderId === user.id ? "Εσύ" : message.senderName}</strong>
                            <p>{message.body}</p>
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <form className="chatComposer" onSubmit={sendChatMessage}>
                      <input
                        name="message"
                        maxLength={2000}
                        placeholder="Γράψε μήνυμα στην ομάδα..."
                        autoComplete="off"
                      />
                      <button type="submit" disabled={sendingMessage || !selectedChatId}>
                        {sendingMessage ? "..." : "Αποστολή"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </section>
          )}

          {view === "profile" && (
            <section className="profileCard">
              {!user ? (
                <>
                  <div className="profileHero">
                    <div className="profileAvatar">PX</div>
                    <div>
                      <h2>Το προφίλ σου</h2>
                      <p>Συνδέσου για να φτιάξεις προφίλ και να συμμετέχεις σε ομάδες.</p>
                    </div>
                  </div>
                  <a className="submit authLink" href="/auth">Σύνδεση / Εγγραφή</a>
                </>
              ) : (
                <>
                  <div className="profileHero profileHeroEditable">
                    <label className="avatarUpload">
                      {profile?.avatarUrl ? (
                        <img src={avatarPublicUrl(profile.avatarUrl) ?? ""} alt="Φωτογραφία προφίλ" />
                      ) : (
                        <span>{initials(profile?.displayName || user.email?.split("@")[0]).toUpperCase()}</span>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        disabled={uploadingAvatar}
                        onChange={(event) => uploadAvatar(event.target.files?.[0])}
                      />
                      <small>{uploadingAvatar ? "Ανέβασμα..." : "Αλλαγή"}</small>
                    </label>
                    <div>
                      <h2>{profile?.displayName || "Το προφίλ σου"}</h2>
                      <p>{profile?.city || "Βάλε περιοχή"} · {experienceLabel(profile?.experienceLevel ?? null)}</p>
                    </div>
                  </div>

                  <div className="badgeRow">
                    <span className="infoBadge">🥾 {realHikes.filter((hike) => hike.organizerId === user.id).length} οργανωμένες</span>
                    <span className="infoBadge">📨 {incomingRequests.length} νέα αιτήματα</span>
                    <span className="infoBadge">💬 {chatGroups.length} groups</span>
                  </div>

                  <form className="profileForm" onSubmit={saveProfile} key={profile?.id ?? user.id}>
                    <div className="formGrid">
                      <div className="field">
                        <label>Όνομα</label>
                        <input name="displayName" required defaultValue={profile?.displayName ?? ""} placeholder="π.χ. Πάνος" />
                      </div>
                      <div className="field">
                        <label>Περιοχή</label>
                        <input name="city" defaultValue={profile?.city ?? ""} placeholder="π.χ. Αθήνα" />
                      </div>
                      <div className="field full">
                        <label>Εμπειρία</label>
                        <select name="experienceLevel" defaultValue={profile?.experienceLevel ?? ""}>
                          <option value="">Δεν έχω επιλέξει</option>
                          <option value="beginner">Αρχάριος</option>
                          <option value="intermediate">Μέτριος</option>
                          <option value="advanced">Προχωρημένος</option>
                        </select>
                      </div>
                      <div className="field full">
                        <label>Λίγα λόγια για σένα</label>
                        <textarea
                          name="bio"
                          rows={4}
                          maxLength={500}
                          defaultValue={profile?.bio ?? ""}
                          placeholder="Τι βουνά σου αρέσουν, τι ρυθμό προτιμάς, τι εμπειρία έχεις..."
                        />
                      </div>
                    </div>
                    <button className="submit" type="submit" disabled={savingProfile}>
                      {savingProfile ? "Αποθήκευση..." : "Αποθήκευση προφίλ"}
                    </button>
                  </form>

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
                            <button className="requestProfile" onClick={() => openPublicProfile(request.userId)}>
                              Προφίλ
                            </button>
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
                </>
              )}
            </section>
          )}

        </main>

        <nav className="mobileNav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`${view === item.id ? "active" : ""} ${item.id === "new" ? "plus" : ""}`}
              onClick={() => item.id === "new" ? openNewHike() : setView(item.id)}
            >
              <span>{item.icon}</span>
              {item.id !== "new" && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {selectedProfile && (
        <div className="modalBackdrop" onClick={() => setSelectedProfile(null)}>
          <section className="profileModal" onClick={(event) => event.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedProfile(null)}>×</button>
            <div className="publicProfileHero">
              <div className="publicProfileAvatar">
                {selectedProfile.avatarUrl ? (
                  <img src={avatarPublicUrl(selectedProfile.avatarUrl) ?? ""} alt="" />
                ) : (
                  initials(selectedProfile.displayName).toUpperCase()
                )}
              </div>
              <div>
                <h2>{selectedProfile.displayName}</h2>
                <p>{selectedProfile.city || "Περιοχή δεν έχει δηλωθεί"}</p>
              </div>
            </div>
            <span className="profileLevel">{experienceLabel(selectedProfile.experienceLevel)}</span>
            <p className="publicProfileBio">
              {selectedProfile.bio || "Ο χρήστης δεν έχει γράψει ακόμη περιγραφή."}
            </p>
          </section>
        </div>
      )}

      {selectedHike && (
        <div className="modalBackdrop" onClick={() => setSelectedHike(null)}>
          <section className="hikeModal" onClick={(event) => event.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedHike(null)}>×</button>
            <div className="hikeModalTop">
              <span className="cardBadge">{selectedHike.demo ? "Demo" : "Live"} · {selectedHike.difficulty}</span>
              <h2>{selectedHike.title}</h2>
              <p>📍 {selectedHike.location} · ⏰ {selectedHike.start} · ↗ {selectedHike.distance}</p>
            </div>

            <div className="hikeDetailGrid">
              <div>
                <small>Διοργανωτής</small>
                <button
                  className="detailOrganizer"
                  disabled={selectedHike.demo || !selectedHike.organizerId}
                  onClick={() => selectedHike.organizerId && openPublicProfile(selectedHike.organizerId)}
                >
                  {selectedHike.organizerAvatar ? (
                    <img src={avatarPublicUrl(selectedHike.organizerAvatar) ?? ""} alt="" />
                  ) : (
                    <span>{initials(selectedHike.organizerName || "Ο")}</span>
                  )}
                  {selectedHike.organizerName || "Πεζοπόρος"}
                </button>
              </div>
              <div>
                <small>Θέσεις</small>
                <strong>{selectedHike.people}{selectedHike.maxParticipants ? ` / ${selectedHike.maxParticipants}` : ""}</strong>
              </div>
            </div>

            <div className="hikeDescription">
              <h3>Περιγραφή</h3>
              <p>{selectedHike.description || "Δεν έχει προστεθεί περιγραφή."}</p>
            </div>

            {!selectedHike.demo && (
              <div className="participantsBlock">
                <h3>Ποιοι πάνε</h3>
                {detailLoading ? (
                  <p className="emptyNote">Φορτώνουμε την ομάδα...</p>
                ) : detailParticipants.length === 0 ? (
                  <p className="emptyNote">Δεν έχουν εγκριθεί ακόμη άλλοι συμμετέχοντες.</p>
                ) : (
                  <div className="participantList">
                    {detailParticipants.map((member) => (
                      <button key={member.id} onClick={() => openPublicProfile(member.id)}>
                        <span className="participantAvatar">
                          {member.avatarUrl ? (
                            <img src={avatarPublicUrl(member.avatarUrl) ?? ""} alt="" />
                          ) : (
                            initials(member.displayName)
                          )}
                        </span>
                        <span>
                          <strong>{member.displayName}</strong>
                          <small>{member.city || experienceLabel(member.experienceLevel)}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="hikeModalActions">
              {selectedHike.organizerId === user?.id && selectedHike.id ? (
                <>
                  <button className="editHikeButton" onClick={() => { setSelectedHike(null); startEditHike(selectedHike); }}>
                    Επεξεργασία
                  </button>
                  <button className="deleteHikeButton" onClick={() => { setSelectedHike(null); deleteHike(selectedHike); }}>
                    Διαγραφή
                  </button>
                </>
              ) : selectedHike.id && myJoinRequests[selectedHike.id]?.status === "pending" ? (
                <button className="pendingButton" onClick={() => cancelJoinRequest(selectedHike)}>
                  Ακύρωση αιτήματος
                </button>
              ) : selectedHike.id && myJoinRequests[selectedHike.id]?.status === "accepted" ? (
                <button className="memberButton" onClick={() => { setSelectedHike(null); setView("messages"); }}>
                  Άνοιγμα group chat
                </button>
              ) : (
                <button
                  className="joinButton"
                  disabled={Boolean(selectedHike.maxParticipants && selectedHike.people >= selectedHike.maxParticipants)}
                  onClick={() => requestJoin(selectedHike)}
                >
                  {selectedHike.maxParticipants && selectedHike.people >= selectedHike.maxParticipants ? "Η ομάδα γέμισε" : "Θέλω να μπω"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
