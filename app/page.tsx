"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type View = "home" | "explore" | "detail" | "map" | "new" | "messages" | "profile";
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
  meetingPoint?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  routePoints?: [number, number][];
  routeIsApproximate?: boolean;
  organizerName?: string;
  organizerAvatar?: string | null;
  photoUrls?: string[];
  coverPhoto?: string | null;
  coverPosition?: string;
  coverZoom?: number;
  seededCoverPhoto?: string | null;
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
  meeting_point: string | null;
  map_lat: number | null;
  map_lng: number | null;
  route_points: [number, number][] | null;
  route_is_approximate: boolean;
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
  memberCount: number;
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
  instagramUsername: string | null;
};

type HikeParticipant = PublicProfile & {
  joinedAt: string;
};

type MyJoinStatus = "pending" | "accepted" | "rejected" | "cancelled";
type ThemeMode = "light" | "dark";
type MountainSearchResult = {
  id: string;
  name: string;
  displayName: string;
  type: string;
  lat: number;
  lng: number;
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
  { id: "home", icon: "⌂", label: "Αρχική" },
  { id: "explore", icon: "▱", label: "Πεζοπορίες" },
  { id: "new", icon: "＋", label: "Νέα" },
  { id: "messages", icon: "✉", label: "Μηνύματα" },
  { id: "profile", icon: "◉", label: "Προφίλ" }
];

const monthNames = ["ΙΑΝ", "ΦΕΒ", "ΜΑΡ", "ΑΠΡ", "ΜΑΪ", "ΙΟΥΝ", "ΙΟΥΛ", "ΑΥΓ", "ΣΕΠ", "ΟΚΤ", "ΝΟΕ", "ΔΕΚ"];

const featuredHikePhotos: Record<string, string[]> = {
  "Δίρφυς — Κορυφή Δέλφη": [
    "/dirfys/02-trail.webp",
    "/dirfys/04-climb.webp",
    "/dirfys/01-cover.webp",
    "/dirfys/03-rest.webp",
    "/dirfys/05-fog.webp"
  ]
};

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
    maxParticipants: hike.max_participants,
    meetingPoint: hike.meeting_point,
    mapLat: hike.map_lat,
    mapLng: hike.map_lng,
    routePoints: Array.isArray(hike.route_points) ? hike.route_points : [],
    routeIsApproximate: hike.route_is_approximate
  };
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [filter, setFilter] = useState("Όλες");
  const [search, setSearch] = useState("");
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
  const [profilePhotoViewerUrl, setProfilePhotoViewerUrl] = useState<string | null>(null);
  const [deletingExistingPhoto, setDeletingExistingPhoto] = useState<string | null>(null);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<{ file: File; url: string }[]>([]);
  const [newCoverIndex, setNewCoverIndex] = useState(0);
  const [newCoverX, setNewCoverX] = useState(50);
  const [newCoverY, setNewCoverY] = useState(50);
  const [newCoverZoom, setNewCoverZoom] = useState(1);
  const [coverEditor, setCoverEditor] = useState<{ url: string; existing: boolean; index?: number; x: number; y: number; zoom: number } | null>(null);
  const [coverDragStart, setCoverDragStart] = useState<{ x: number; y: number; cropX: number; cropY: number } | null>(null);
  const [selectedHike, setSelectedHike] = useState<Hike | null>(null);
  const [detailReturnView, setDetailReturnView] = useState<View>("explore");
  const [detailParticipants, setDetailParticipants] = useState<HikeParticipant[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [myJoinRequests, setMyJoinRequests] = useState<Record<string, { id: string; status: MyJoinStatus }>>({});
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mapSearch, setMapSearch] = useState("");
  const [mapQuickFilter, setMapQuickFilter] = useState("Όλες");
  const [mapPreviewHike, setMapPreviewHike] = useState<Hike | null>(null);
  const [mapResetToken, setMapResetToken] = useState(0);
  const [createMapPoint, setCreateMapPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [createRoutePoints, setCreateRoutePoints] = useState<[number, number][]>([]);
  const [createRouteName, setCreateRouteName] = useState("");
  const [createRouteDistanceKm, setCreateRouteDistanceKm] = useState<number | null>(null);
  const [mountainQuery, setMountainQuery] = useState("");
  const [mountainResults, setMountainResults] = useState<MountainSearchResult[]>([]);
  const [mountainSearching, setMountainSearching] = useState(false);
  const [selectedMountain, setSelectedMountain] = useState<MountainSearchResult | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("orivatis-theme");
    const nextTheme: ThemeMode = savedTheme === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("orivatis-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

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

  useEffect(() => {
    if (view !== "new") return;
    const query = mountainQuery.trim();
    if (query.length < 2 || selectedMountain?.name === query) {
      setMountainResults([]);
      setMountainSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setMountainSearching(true);
      try {
        const response = await fetch(`/api/mountain-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store"
        });
        const json = await response.json();
        setMountainResults(response.ok && Array.isArray(json.results) ? json.results : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setMountainResults([]);
      } finally {
        if (!controller.signal.aborted) setMountainSearching(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mountainQuery, selectedMountain, view]);

  function chooseMountain(result: MountainSearchResult) {
    setSelectedMountain(result);
    setMountainQuery(result.name);
    setMountainResults([]);
    setCreateMapPoint({ lat: result.lat, lng: result.lng });

    const locationInput = document.querySelector<HTMLInputElement>('input[name="location"]');
    if (locationInput && !locationInput.value.trim()) {
      locationInput.value = result.displayName;
      locationInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    showToast(`${result.name} επιλέχθηκε ✓`);
  }

  useEffect(() => {
    if (photoViewerIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePhotoViewer();
      if (event.key === "ArrowLeft") showPreviousPhoto();
      if (event.key === "ArrowRight") showNextPhoto();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoViewerIndex, selectedHike]);

  async function loadHikes() {
    setLoadingHikes(true);

    const { data, error } = await supabase
      .from("hikes")
      .select("id, organizer_id, title, location_name, starts_at, difficulty, distance_km, description, max_participants, meeting_point, map_lat, map_lng, route_points, route_is_approximate")
      .eq("status", "open")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(30);

    if (!error && data) {
      const dbHikes = data as DbHike[];
      const hikeIds = dbHikes.map((hike) => hike.id);
      const organizerIds = [...new Set(dbHikes.map((hike) => hike.organizer_id))];

      const [{ data: participants }, { data: organizerProfiles }, { data: hikePhotos }] = await Promise.all([
        hikeIds.length
          ? supabase.from("participants").select("hike_id, user_id").in("hike_id", hikeIds)
          : Promise.resolve({ data: [] as { hike_id: string; user_id: string }[] }),
        organizerIds.length
          ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", organizerIds)
          : Promise.resolve({ data: [] as { id: string; display_name: string; avatar_url: string | null }[] }),
        hikeIds.length
          ? supabase.from("hike_photos").select("hike_id, storage_path, sort_order, created_at, is_cover, crop_x, crop_y, crop_zoom").in("hike_id", hikeIds).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as { hike_id: string; storage_path: string; sort_order: number; created_at: string; is_cover: boolean; crop_x: number; crop_y: number; crop_zoom: number }[] })
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

      const photoMap = new Map<string, string[]>();
      const coverMap = new Map<string, { url: string; x: number; y: number; zoom: number }>();
      for (const item of hikePhotos ?? []) {
        const url = hikePhotoPublicUrl(item.storage_path);
        if (!url) continue;
        const current = photoMap.get(item.hike_id) ?? [];
        current.push(url);
        photoMap.set(item.hike_id, current);
        if (item.is_cover) coverMap.set(item.hike_id, { url, x: item.crop_x ?? 50, y: item.crop_y ?? 50, zoom: Number(item.crop_zoom ?? 1) });
      }

      setRealHikes(
        dbHikes.map((item) => {
          const card = dbHikeToCard(item);
          const organizer = organizers.get(item.organizer_id);
          const storedPhotos = photoMap.get(item.id) ?? [];
          const seededPhotos = featuredHikePhotos[item.title] ?? [];
          const photos = storedPhotos.length ? storedPhotos : seededPhotos;

          return {
            ...card,
            people: 1 + (participantCount.get(item.id) ?? 0),
            organizerName: organizer?.name ?? "Πεζοπόρος",
            organizerAvatar: organizer?.avatar ?? null,
            photoUrls: photos,
            coverPhoto: coverMap.get(item.id)?.url ?? photos[0] ?? null,
            coverPosition: `${coverMap.get(item.id)?.x ?? 50}% ${coverMap.get(item.id)?.y ?? 50}%`,
            coverZoom: coverMap.get(item.id)?.zoom ?? 1,
            seededCoverPhoto: !storedPhotos.length ? (seededPhotos[0] ?? null) : null
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
    instagram_username: string | null;
  }): PublicProfile {
    return {
      id: row.id,
      displayName: row.display_name || "Πεζοπόρος",
      avatarUrl: row.avatar_url,
      city: row.city,
      experienceLevel: row.experience_level,
      bio: row.bio,
      instagramUsername: row.instagram_username
    };
  }

  function avatarPublicUrl(path?: string | null) {
    if (!path) return null;
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  function hikePhotoPublicUrl(path?: string | null) {
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
      .select("id, display_name, avatar_url, city, experience_level, bio, instagram_username")
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

  async function deleteExistingHikePhoto(photoUrl: string) {
    if (!user || !editingHike?.id || deletingExistingPhoto) return;
    if (!window.confirm("Να διαγραφεί αυτή η φωτογραφία από την εκδρομή;")) return;

    setDeletingExistingPhoto(photoUrl);
    const { data: rows, error: lookupError } = await supabase
      .from("hike_photos")
      .select("storage_path")
      .eq("hike_id", editingHike.id);

    if (lookupError) {
      setDeletingExistingPhoto(null);
      showToast(`Δεν βρέθηκε η φωτογραφία: ${lookupError.message}`);
      return;
    }

    const row = (rows ?? []).find((item) => hikePhotoPublicUrl(item.storage_path) === photoUrl);
    if (!row) {
      setDeletingExistingPhoto(null);
      showToast("Δεν βρέθηκε η συγκεκριμένη φωτογραφία.");
      return;
    }

    const { error: deleteRowError } = await supabase
      .from("hike_photos")
      .delete()
      .eq("hike_id", editingHike.id)
      .eq("storage_path", row.storage_path);

    if (deleteRowError) {
      setDeletingExistingPhoto(null);
      showToast(`Δεν διαγράφηκε η φωτογραφία: ${deleteRowError.message}`);
      return;
    }

    const { error: storageError } = await supabase.storage.from("avatars").remove([row.storage_path]);
    const nextPhotos = (editingHike.photoUrls ?? []).filter((photo) => photo !== photoUrl);
    setEditingHike({ ...editingHike, photoUrls: nextPhotos, coverPhoto: nextPhotos[0] ?? null });
    setDeletingExistingPhoto(null);
    void loadHikes();
    showToast(storageError ? "Η φωτογραφία αφαιρέθηκε από την εκδρομή." : "Η φωτογραφία διαγράφηκε ✓");
  }

  function openExistingCoverEditor(photoUrl: string) {
    const current = editingHike?.coverPhoto === photoUrl;
    const [xRaw, yRaw] = (current ? editingHike?.coverPosition : "50% 50%")!.split(" ");
    setCoverEditor({ url: photoUrl, existing: true, x: parseFloat(xRaw) || 50, y: parseFloat(yRaw) || 50, zoom: current ? (editingHike?.coverZoom ?? 1) : 1 });
  }
  function openNewCoverEditor(index: number) {
    setCoverEditor({ url: newPhotoPreviews[index].url, existing: false, index, x: index === newCoverIndex ? newCoverX : 50, y: index === newCoverIndex ? newCoverY : 50, zoom: index === newCoverIndex ? newCoverZoom : 1 });
  }
  async function saveCoverEditor() {
    if (!coverEditor) return;
    if (!coverEditor.existing) { setNewCoverIndex(coverEditor.index ?? 0); setNewCoverX(coverEditor.x); setNewCoverY(coverEditor.y); setNewCoverZoom(coverEditor.zoom); setCoverEditor(null); return; }
    if (!editingHike?.id) return;
    const { data: rows, error } = await supabase.from("hike_photos").select("storage_path, is_cover").eq("hike_id", editingHike.id);
    if (error) return showToast(`Δεν άλλαξε το εξώφυλλο: ${error.message}`);
    let finalCoverUrl = coverEditor.url;
    let target = (rows ?? []).find((item) => hikePhotoPublicUrl(item.storage_path) === finalCoverUrl);
    if (!target && finalCoverUrl.startsWith("/")) {
      try {
        const response = await fetch(finalCoverUrl);
        if (!response.ok) throw new Error("seed fetch failed");
        const blob = await response.blob();
        const ext = finalCoverUrl.split(".").pop()?.split("?")[0] || "webp";
        const storagePath = `${user?.id}/hikes/${editingHike.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(storagePath, blob, { contentType: blob.type || `image/${ext}`, upsert: false });
        if (uploadError) throw uploadError;
        const { error: rowError } = await supabase.from("hike_photos").insert({ hike_id: editingHike.id, storage_path: storagePath, sort_order: (rows ?? []).length, uploaded_by: user?.id, is_cover: false });
        if (rowError) { await supabase.storage.from("avatars").remove([storagePath]); throw rowError; }
        target = { storage_path: storagePath, is_cover: false };
        finalCoverUrl = hikePhotoPublicUrl(storagePath) ?? finalCoverUrl;
      } catch {
        return showToast("Δεν μπόρεσε να αποθηκευτεί αυτή η παλιά φωτογραφία. Δοκίμασε ξανά.");
      }
    }
    if (!target) return showToast("Δεν βρέθηκε η φωτογραφία.");
    const cropPosition = `${coverEditor.x}% ${coverEditor.y}%`;
    const cropZoom = coverEditor.zoom;
    const oldCover = (rows ?? []).find((item) => item.is_cover && item.storage_path !== target.storage_path);
    if (oldCover) {
      const { error: clearError } = await supabase.from("hike_photos").update({ is_cover: false }).eq("hike_id", editingHike.id).eq("storage_path", oldCover.storage_path);
      if (clearError) return showToast(`Δεν άλλαξε το εξώφυλλο: ${clearError.message}`);
    }
    const { data: savedCover, error: saveError } = await supabase.from("hike_photos")
      .update({ is_cover: true, crop_x: Math.round(coverEditor.x), crop_y: Math.round(coverEditor.y), crop_zoom: cropZoom })
      .eq("hike_id", editingHike.id)
      .eq("storage_path", target.storage_path)
      .select("storage_path, is_cover, crop_x, crop_y, crop_zoom")
      .single();
    if (saveError || !savedCover?.is_cover) return showToast(`Δεν άλλαξε το εξώφυλλο: ${saveError?.message ?? "η αλλαγή δεν επιβεβαιώθηκε"}`);

    const updatedCover = { coverPhoto: finalCoverUrl, coverPosition: cropPosition, coverZoom: cropZoom };
    setEditingHike({ ...editingHike, ...updatedCover });
    setRealHikes((current) => current.map((hike) => hike.id === editingHike.id ? { ...hike, ...updatedCover } : hike));
    setSelectedHike((current) => {
      if (!current || current.id !== editingHike.id) return current;
      return { ...current, ...updatedCover };
    });
    setMapPreviewHike((current) => {
      if (!current || current.id !== editingHike.id) return current;
      return { ...current, ...updatedCover };
    });
    setCoverEditor(null);
    await loadHikes();
    showToast("Το εξώφυλλο άλλαξε ✓");
  }
  function moveCoverEditor(clientX:number,clientY:number) {
    if(!coverDragStart||!coverEditor)return;
    setCoverEditor({...coverEditor,x:Math.max(0,Math.min(100,coverDragStart.cropX-(clientX-coverDragStart.x)/3)),y:Math.max(0,Math.min(100,coverDragStart.cropY-(clientY-coverDragStart.y)/3))});
  }

  function handleNewPhotos(files: FileList | null) {
    newPhotoPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    const next = Array.from(files ?? []).slice(0, 10).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setNewPhotoPreviews(next);
    setNewCoverIndex(0);
    setNewCoverX(50); setNewCoverY(50); setNewCoverZoom(1);
  }

  function openPhotoViewer(index: number) {
    setPhotoViewerIndex(index);
  }

  function closePhotoViewer() {
    setPhotoViewerIndex(null);
  }

  function showPreviousPhoto() {
    if (!selectedHike?.photoUrls?.length) return;
    setPhotoViewerIndex((current) => {
      if (current === null) return 0;
      return (current - 1 + selectedHike.photoUrls!.length) % selectedHike.photoUrls!.length;
    });
  }

  function showNextPhoto() {
    if (!selectedHike?.photoUrls?.length) return;
    setPhotoViewerIndex((current) => {
      if (current === null) return 0;
      return (current + 1) % selectedHike.photoUrls!.length;
    });
  }

  async function openHikeDetails(hike: Hike) {
    setDetailReturnView(view === "home" ? "home" : view === "map" ? "map" : "explore");
    setSelectedHike(hike);
    setDetailParticipants([]);
    setView("detail");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

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
        .select("id, display_name, avatar_url, city, experience_level, bio, instagram_username")
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

    const allGroupIds = [...new Set([
      ...(ownedHikes ?? []).map((hike) => hike.id),
      ...joinedHikes.map((hike) => hike.id)
    ])];

    let countByHike = new Map<string, number>();
    if (allGroupIds.length) {
      const { data: allParticipants } = await supabase
        .from("participants")
        .select("hike_id")
        .in("hike_id", allGroupIds);

      for (const row of allParticipants ?? []) {
        countByHike.set(row.hike_id, (countByHike.get(row.hike_id) ?? 0) + 1);
      }
    }

    const groupMap = new Map<string, ChatGroup>();

    for (const hike of ownedHikes ?? []) {
      groupMap.set(hike.id, {
        id: hike.id,
        title: hike.title,
        startsAt: hike.starts_at,
        role: "organizer",
        memberCount: 1 + (countByHike.get(hike.id) ?? 0)
      });
    }

    for (const hike of joinedHikes) {
      if (!groupMap.has(hike.id)) {
        groupMap.set(hike.id, {
          id: hike.id,
          title: hike.title,
          startsAt: hike.starts_at,
          role: "participant",
          memberCount: 1 + (countByHike.get(hike.id) ?? 0)
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

    const refreshAccount = () => {
      loadMyJoinRequests(user.id);
      loadIncomingRequests(user.id);
      loadChatGroups(user.id);
      loadHikes();
    };

    const channel = supabase
      .channel(`account-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "join_requests" },
        refreshAccount
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        refreshAccount
      )
      .subscribe();

    const fallback = window.setInterval(refreshAccount, 15000);

    return () => {
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (view !== "messages" || !user) return;
    loadChatGroups(user.id);
  }, [view, user]);

  useEffect(() => {
    if (view !== "messages" || !selectedChatId) return;

    loadChatMessages(selectedChatId);

    const channel = supabase
      .channel(`hike-chat-${selectedChatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `hike_id=eq.${selectedChatId}`
        },
        () => loadChatMessages(selectedChatId)
      )
      .subscribe();

    const fallback = window.setInterval(() => loadChatMessages(selectedChatId), 15000);

    return () => {
      window.clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [view, selectedChatId]);

  const allHikes = useMemo(
    () => realHikes.length > 0 ? realHikes : demoHikes,
    [realHikes]
  );

  const visibleHikes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("el-GR");
    return allHikes.filter((hike) => {
      const matchesDifficulty = filter === "Όλες" || hike.difficulty === filter;
      const matchesSearch =
        !query ||
        hike.title.toLocaleLowerCase("el-GR").includes(query) ||
        hike.location.toLocaleLowerCase("el-GR").includes(query);
      return matchesDifficulty && matchesSearch;
    });
  }, [allHikes, filter, search]);

  const mapHikes = useMemo(() => {
    const query = mapSearch.trim().toLocaleLowerCase("el-GR");
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const startOfWeekend = new Date(now);
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
    startOfWeekend.setDate(now.getDate() + daysUntilSaturday);
    startOfWeekend.setHours(0, 0, 0, 0);

    const endOfWeekend = new Date(startOfWeekend);
    endOfWeekend.setDate(startOfWeekend.getDate() + 1);
    endOfWeekend.setHours(23, 59, 59, 999);

    return realHikes.filter((hike) => {
      if (typeof hike.mapLat !== "number" || typeof hike.mapLng !== "number") return false;

      const matchesSearch =
        !query ||
        hike.title.toLocaleLowerCase("el-GR").includes(query) ||
        hike.location.toLocaleLowerCase("el-GR").includes(query);

      if (!matchesSearch) return false;
      if (mapQuickFilter === "Εύκολες" && hike.difficulty !== "Εύκολη") return false;

      const hikeDate = hike.startsAt ? new Date(hike.startsAt) : null;

      if (mapQuickFilter === "Αύριο") {
        return Boolean(
          hikeDate &&
          hikeDate.getFullYear() === tomorrow.getFullYear() &&
          hikeDate.getMonth() === tomorrow.getMonth() &&
          hikeDate.getDate() === tomorrow.getDate()
        );
      }

      if (mapQuickFilter === "Αυτό το ΣΚ") {
        return Boolean(hikeDate && hikeDate >= startOfWeekend && hikeDate <= endOfWeekend);
      }

      return true;
    });
  }, [realHikes, mapSearch, mapQuickFilter]);

  const mapFrameSrc = useMemo(() => {
    const points = mapHikes.map((hike) => ({
      id: hike.id ?? "",
      lat: hike.mapLat,
      lng: hike.mapLng,
      difficulty: hike.difficulty,
      route: hike.routePoints ?? [],
      approximate: Boolean(hike.routeIsApproximate)
    }));
    return `/orivatis-map.html?data=${encodeURIComponent(JSON.stringify(points))}&r=${mapResetToken}`;
  }, [mapHikes, mapResetToken]);

  const detailMapSrc = useMemo(() => {
    if (!selectedHike || typeof selectedHike.mapLat !== "number" || typeof selectedHike.mapLng !== "number") {
      return "";
    }

    const point = [{
      id: selectedHike.id ?? "detail",
      lat: selectedHike.mapLat,
      lng: selectedHike.mapLng,
      difficulty: selectedHike.difficulty,
      route: selectedHike.routePoints ?? [],
      approximate: Boolean(selectedHike.routeIsApproximate)
    }];

    return `/orivatis-map.html?data=${encodeURIComponent(JSON.stringify(point))}&detail=1`;
  }, [selectedHike]);

  useEffect(() => {
    if (view !== "map") return;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [view]);

  useEffect(() => {
    if (view !== "map" && view !== "new") return;

    const handleMapMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; id?: string; lat?: number; lng?: number; route?: [number, number][]; name?: string };

      if (data?.type === "orivatis-map-select" && data.id) {
        const hike = realHikes.find((item) => item.id === data.id);
        if (hike) setMapPreviewHike(hike);
        return;
      }

      if (
        data?.type === "orivatis-map-pick" &&
        typeof data.lat === "number" &&
        typeof data.lng === "number"
      ) {
        setCreateMapPoint({ lat: data.lat, lng: data.lng });
        return;
      }

      if (data?.type === "orivatis-summit-name" && typeof data.name === "string" && data.name.trim()) {
        setMountainQuery(data.name.trim());
        showToast(`Κορυφή ${data.name.trim()} επιλέχθηκε ✓`);
        return;
      }

      if (
        data?.type === "orivatis-route-select" &&
        Array.isArray(data.route) &&
        data.route.length > 1
      ) {
        const points = simplifyRoute(data.route);
        setCreateRoutePoints(points);
        setCreateRouteName(data.name || "Διαδρομή OpenStreetMap");
        setCreateRouteDistanceKm(routeDistanceKm(data.route));
        showToast(`Επιλέχθηκε: ${data.name || "πεζοπορική διαδρομή"} ✓`);
      }
    };

    window.addEventListener("message", handleMapMessage);
    return () => window.removeEventListener("message", handleMapMessage);
  }, [view, realHikes]);

  function resetMapViewport() {
    setMapPreviewHike(null);
    setMapResetToken((value) => value + 1);
  }

  function openDiscoveryMap() {
    setMapSearch("");
    setMapQuickFilter("Όλες");
    setMapPreviewHike(null);
    setMapResetToken((value) => value + 1);
    setView("map");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  function openHikeOnMap(hike: Hike) {
    if (typeof hike.mapLat !== "number" || typeof hike.mapLng !== "number") {
      showToast("Δεν έχει οριστεί ακόμη σημείο στον χάρτη για αυτή την πεζοπορία.");
      return;
    }

    setMapSearch(hike.title);
    setMapQuickFilter("Όλες");
    setMapPreviewHike(null);
    setMapResetToken((value) => value + 1);
    setView("map");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

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
    setCreateMapPoint(null);
    setCreateRoutePoints([]);
    setCreateRouteName("");
    setCreateRouteDistanceKm(null);
    setMountainQuery("");
    setMountainResults([]);
    setSelectedMountain(null);
    setView("new");
  }

  function startEditHike(hike: Hike) {
    if (!user || !hike.id || hike.organizerId !== user.id) return;
    setEditingHike(hike);
    setCreateMapPoint(
      typeof hike.mapLat === "number" && typeof hike.mapLng === "number"
        ? { lat: hike.mapLat, lng: hike.mapLng }
        : null
    );
    setCreateRoutePoints(hike.routePoints ?? []);
    setCreateRouteName(hike.routePoints?.length ? "Αποθηκευμένη διαδρομή" : "");
    setCreateRouteDistanceKm(hike.distanceKm ?? null);
    setMountainQuery(hike.location ?? "");
    setMountainResults([]);
    setSelectedMountain(null);
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

  function routeDistanceKm(points: [number, number][]) {
    const earthRadiusKm = 6371;
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      const [lat1, lng1] = points[index - 1];
      const [lat2, lng2] = points[index];
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      total += earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return total;
  }

  function simplifyRoute(points: [number, number][], maxPoints = 350) {
    if (points.length <= maxPoints) return points;
    const step = (points.length - 1) / (maxPoints - 1);
    const simplified: [number, number][] = [];
    for (let index = 0; index < maxPoints; index += 1) {
      simplified.push(points[Math.round(index * step)]);
    }
    return simplified;
  }

  async function handleGpxUpload(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gpx") && !file.type.includes("xml")) {
      showToast("Διάλεξε αρχείο GPX.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Το GPX πρέπει να είναι έως 5 MB.");
      return;
    }

    try {
      const xml = new DOMParser().parseFromString(await file.text(), "application/xml");
      if (xml.querySelector("parsererror")) throw new Error("invalid xml");

      const trackNodes = Array.from(xml.querySelectorAll("trkpt"));
      const routeNodes = trackNodes.length ? trackNodes : Array.from(xml.querySelectorAll("rtept"));
      const rawPoints = routeNodes
        .map((node) => [Number(node.getAttribute("lat")), Number(node.getAttribute("lon"))] as [number, number])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180);

      if (rawPoints.length < 2) {
        showToast("Δεν βρήκα έγκυρη διαδρομή μέσα στο GPX.");
        return;
      }

      const distance = routeDistanceKm(rawPoints);
      const points = simplifyRoute(rawPoints);
      setCreateRoutePoints(points);
      setCreateRouteName(file.name);
      setCreateRouteDistanceKm(distance);
      setCreateMapPoint({ lat: points[0][0], lng: points[0][1] });
      showToast(`Η διαδρομή φορτώθηκε ✓ · ${distance.toFixed(1)} km`);
    } catch {
      showToast("Δεν μπόρεσα να διαβάσω αυτό το GPX.");
    }
  }

  function clearCreateRoute() {
    setCreateRoutePoints([]);
    setCreateRouteName("");
    setCreateRouteDistanceKm(null);
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
    const meetingPoint = String(form.get("meetingPoint") ?? "").trim();
    const mapLatRaw = String(form.get("mapLat") ?? "").trim();
    const mapLngRaw = String(form.get("mapLng") ?? "").trim();
    const communityAgreement = form.get("communityAgreement") === "on";

    if (!communityAgreement) {
      showToast("Για να δημοσιεύσεις, επιβεβαίωσε ότι πρόκειται για κοινωνική συνάντηση και όχι επαγγελματική υπηρεσία.");
      return;
    }

    const photoFiles = form
      .getAll("photos")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (photoFiles.length > 10) {
      showToast("Μπορείς να ανεβάσεις έως 10 φωτογραφίες.");
      return;
    }

    if (photoFiles.some((file) => file.size > 50 * 1024 * 1024)) {
      showToast("Κάθε φωτογραφία πρέπει να είναι έως 50 MB.");
      return;
    }

    if (!title || !date || !time || !location) {
      showToast("Συμπλήρωσε τα βασικά πεδία.");
      return;
    }

    if (!mapLatRaw || !mapLngRaw) {
      showToast("Διάλεξε το σημείο της πεζοπορίας στον χάρτη.");
      return;
    }

    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      showToast("Η ημερομηνία ή η ώρα δεν είναι σωστή.");
      return;
    }

    if (startsAt.getTime() <= Date.now()) {
      showToast("Η πεζοπορία πρέπει να είναι σε μελλοντική ημερομηνία/ώρα.");
      return;
    }

    setSubmitting(true);

    const payload = {
      title,
      description: description || null,
      location_name: location,
      starts_at: startsAt.toISOString(),
      difficulty: mapDifficultyToDb(difficulty),
      distance_km: distanceRaw ? Number(distanceRaw) : createRouteDistanceKm ? Number(createRouteDistanceKm.toFixed(1)) : null,
      max_participants: maxRaw ? Number(maxRaw) : null,
      meeting_point: meetingPoint || null,
      map_lat: mapLatRaw ? Number(mapLatRaw) : null,
      map_lng: mapLngRaw ? Number(mapLngRaw) : null,
      route_points: createRoutePoints.length > 1 ? createRoutePoints : null,
      route_is_approximate: false,
      meeting_type: "social",
      community_terms_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let hikeId = editingHike?.id ?? null;
    let saveError: { message: string } | null = null;

    if (editingHike?.id) {
      const { error } = await supabase
        .from("hikes")
        .update(payload)
        .eq("id", editingHike.id)
        .eq("organizer_id", user.id);
      saveError = error;
    } else {
      const { data: createdHike, error } = await supabase
        .from("hikes")
        .insert({
          organizer_id: user.id,
          ...payload
        })
        .select("id")
        .single();
      saveError = error;
      hikeId = createdHike?.id ?? null;
    }

    if (saveError || !hikeId) {
      setSubmitting(false);
      showToast(`Δεν αποθηκεύτηκε: ${saveError?.message ?? "λείπει το id της πεζοπορίας"}`);
      return;
    }

    let photoUploadFailed = false;
    for (let index = 0; index < photoFiles.length; index += 1) {
      const file = photoFiles[index];
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const storagePath = `${user.id}/hikes/${hikeId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        photoUploadFailed = true;
        continue;
      }

      const shouldBeCover = editingHike ? false : index === newCoverIndex;
      const { error: photoRowError } = await supabase.from("hike_photos").insert({
        hike_id: hikeId,
        storage_path: storagePath,
        sort_order: index,
        uploaded_by: user.id,
        is_cover: shouldBeCover,
        crop_x: shouldBeCover ? newCoverX : 50,
        crop_y: shouldBeCover ? newCoverY : 50,
        crop_zoom: shouldBeCover ? newCoverZoom : 1
      });

      if (photoRowError) photoUploadFailed = true;
    }

    setSubmitting(false);
    formElement.reset();
    const wasEditing = Boolean(editingHike?.id);
    setEditingHike(null);
    setCreateMapPoint(null);
    setCreateRoutePoints([]);
    setCreateRouteName("");
    setCreateRouteDistanceKm(null);
    newPhotoPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    setNewPhotoPreviews([]);
    setView("home");
    showToast(
      photoUploadFailed
        ? "Η συνάντηση αποθηκεύτηκε, αλλά κάποια φωτογραφία δεν ανέβηκε."
        : wasEditing
          ? "Οι αλλαγές αποθηκεύτηκαν ✓"
          : "Η πεζοπορική συνάντηση δημοσιεύτηκε ✓"
    );
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

  async function signOut() {
    await supabase.auth.signOut();
    setView("home");
    showToast("Αποσυνδέθηκες.");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const experienceLevel = String(form.get("experienceLevel") ?? "");
    const bio = String(form.get("bio") ?? "").trim();
    const instagramUsername = String(form.get("instagramUsername") ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "");

    if (instagramUsername && !/^[A-Za-z0-9._]{1,30}$/.test(instagramUsername)) {
      showToast("Βάλε έγκυρο Instagram username.");
      return;
    }

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
        instagram_username: instagramUsername || null,
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

    if (file.size > 50 * 1024 * 1024) {
      showToast("Η φωτογραφία πρέπει να είναι έως 50 MB.");
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
            <div className="brandMark"><img src="/orivatis-icon.svg" alt="" /></div>
            <div className="brandText">
              ORIVATIS
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

        <main className={`main ${view === "map" ? "mainMapView" : ""} ${view === "new" ? "mainCreateView" : ""}`}>
          {view !== "detail" && view !== "explore" && view !== "home" && view !== "map" && (
            <header className="topbar">
              <div>
                <div className="eyebrow">Η παρέα σου είναι εκεί έξω</div>
                <h1>{nav.find((x) => x.id === view)?.label}</h1>
                <p className="subtitle">Το ORIVATIS community για πεζοπορίες και παρέα.</p>
              </div>
              <button className="avatarButton" onClick={() => setView("profile")}>
                {profile?.avatarUrl ? (
                  <img src={avatarPublicUrl(profile.avatarUrl) ?? ""} alt="" />
                ) : (
                  initials(profile?.displayName || user?.email?.split("@")[0] || "PX").toUpperCase()
                )}
              </button>
            </header>
          )}

          {view === "home" && (
            <>
              <section className="hero">
                <div className="mobileHomeBrand">
                  <div className="mobileBrandIdentity">
                    <button className="mobileMountainLogo" aria-label="Αρχική" onClick={() => setView("home")}>
                      <img src="/orivatis-icon.svg" alt="" />
                    </button>
                    <span className="mobileWordmark">ORIVATIS</span>
                  </div>
                  <div className="mobileBrandActions">
                    <button aria-label="Αναζήτηση" onClick={() => document.getElementById("hikes")?.scrollIntoView({ behavior: "smooth" })}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="2"/>
                        <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button aria-label="Προφίλ" onClick={() => setView("profile")}>
                      {profile?.avatarUrl ? (
                        <img src={avatarPublicUrl(profile.avatarUrl) ?? ""} alt="" />
                      ) : (
                        initials(profile?.displayName || user?.email?.split("@")[0] || "PX").toUpperCase()
                      )}
                    </button>
                  </div>
                </div>
                <div className="heroCopy">
                  <div className="eyebrow heroEyebrow">Βουνό · παρέα · εμπειρίες</div>
                  <h2>Πάμε<br />βουνό;</h2>
                  <p>
                    Βρες την επόμενη πεζοπορία και την ομάδα που σου ταιριάζει.
                  </p>
                  <div className="heroActions">
                    <button className="primary" onClick={() => document.getElementById("hikes")?.scrollIntoView({ behavior: "smooth" })}>
                      ⌕&nbsp;&nbsp; Βρες πεζοπορία
                    </button>
                    <button className="secondary" onClick={openNewHike}>
                      ＋&nbsp;&nbsp; Φτιάξε παρέα
                    </button>
                  </div>
                </div>
              </section>

              <section className="stats">
                <div className="stat">
                  <strong>{realHikes.length}</strong>
                  <span>Ανοιχτές<br />πεζοπορίες</span>
                </div>
                <div className="stat">
                  <strong>{realHikes.reduce((sum, hike) => sum + hike.people, 0)}</strong>
                  <span>Άτομα<br />στις ομάδες</span>
                </div>
                <div className="stat">
                  <strong>{user ? "✓" : "—"}</strong>
                  <span>{user ? "Συνδεδεμένος" : "Γίνε μέλος"}</span>
                </div>
              </section>

              <section id="hikes">
                <div className="sectionHeader">
                  <div>
                    <h2>Επόμενες πεζοπορίες</h2>
                    <p>{loadingHikes ? "Φορτώνουμε τις πραγματικές πεζοπορίες..." : "Οι νέες δημοσιεύσεις έρχονται live από το Supabase."}</p>
                  </div>
                  <div className="browseControls">
                    <input
                      className="hikeSearch"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Αναζήτηση βουνού ή περιοχής..."
                    />
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
                </div>

                <div className="hikeGrid">
                  {visibleHikes.map((hike, index) => (
                    <article
                      className="hikeCard"
                      key={hike.id ?? `demo-${hike.title}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openHikeDetails(hike)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") openHikeDetails(hike);
                      }}
                    >
                      <div
                        className="cardVisual"
                        style={hike.coverPhoto ? { backgroundImage: `linear-gradient(180deg, rgba(15,25,18,.06), rgba(15,25,18,.20)), url("${hike.coverPhoto}")`, backgroundPosition: hike.coverPosition ?? "50% 50%", backgroundSize: `${(hike.coverZoom ?? 1) * 100}%` } : undefined}
                      >
                        <span className="cardBadge">{hike.demo ? `Demo · ${hike.difficulty}` : `Live · ${hike.difficulty}`}</span>
                        <span className="cardDate"><strong>{hike.day}</strong>{hike.month}</span>
                      </div>
                      <div className="cardBody">
                        <button className="cardTitleButton" onClick={(event) => { event.stopPropagation(); openHikeDetails(hike); }}>
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
                            onClick={(event) => {
                              event.stopPropagation();
                              if (hike.organizerId) openPublicProfile(hike.organizerId);
                            }}
                          >
                            {hike.organizerName || (hike.demo ? "Demo organizer" : "Πεζοπόρος")}
                          </button>
                        </div>
                        <div className="cardMeta">
                          📍 {hike.location}<br />
                          ↗ {hike.distance} · ⏰ {hike.start} · 👥 {hike.people}{hike.maxParticipants ? `/${hike.maxParticipants}` : ""}
                        </div>
                        <div className="peopleRow">
                          <button className="detailsButton" onClick={(event) => { event.stopPropagation(); openHikeDetails(hike); }}>
                            Λεπτομέρειες
                          </button>
                          {hike.organizerId === user?.id && hike.id ? (
                            <div className="ownerActions">
                              <button
                                className="editHikeButton"
                                onClick={(event) => { event.stopPropagation(); startEditHike(hike); }}
                              >
                                Επεξεργασία
                              </button>
                              <button
                                className="deleteHikeButton"
                                disabled={deletingHikeId === hike.id}
                                onClick={(event) => { event.stopPropagation(); deleteHike(hike); }}
                              >
                                {deletingHikeId === hike.id ? "Διαγραφή..." : "Διαγραφή"}
                              </button>
                            </div>
                          ) : hike.id && myJoinRequests[hike.id]?.status === "pending" ? (
                            <button className="pendingButton" onClick={(event) => { event.stopPropagation(); cancelJoinRequest(hike); }}>
                              Αναμονή · Ακύρωση
                            </button>
                          ) : hike.id && myJoinRequests[hike.id]?.status === "accepted" ? (
                            <button className="memberButton" onClick={(event) => { event.stopPropagation(); setView("messages"); }}>
                              Μέλος · Chat
                            </button>
                          ) : (
                            <button
                              className="joinButton"
                              disabled={Boolean(hike.maxParticipants && hike.people >= hike.maxParticipants)}
                              onClick={(event) => { event.stopPropagation(); requestJoin(hike); }}
                            >
                              {hike.maxParticipants && hike.people >= hike.maxParticipants ? "Γεμάτη" : "Μπες στην παρέα"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                {visibleHikes.length === 0 && (
                  <div className="emptySearch">
                    Δεν βρήκαμε πεζοπορία με αυτά τα φίλτρα.
                  </div>
                )}
                </div>
              </section>
            </>
          )}

          {view === "explore" && (
            <section className="explorePage">
              <div className="exploreHeader">
                <div>
                  <p className="exploreKicker">Βρες την επόμενη ομάδα σου</p>
                  <h2>Πεζοπορίες</h2>
                </div>
                <button className="exploreMapButton" onClick={openDiscoveryMap} aria-label="Άνοιγμα χάρτη">
                  <span>⌖</span>
                  Χάρτης
                </button>
              </div>

              <div className="exploreSearchRow">
                <div className="exploreSearchBox">
                  <span>⌕</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Αναζήτηση βουνού ή περιοχής..."
                  />
                </div>
                
              </div>

              <div className="exploreChips">
                {["Όλες", "Εύκολη", "Μέτρια", "Δύσκολη"].map((item) => (
                  <button
                    key={item}
                    className={`exploreChip ${filter === item ? "active" : ""}`}
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="exploreList">
                {visibleHikes.map((hike) => (
                  <article
                    className="exploreCard"
                    key={hike.id ?? `explore-${hike.title}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openHikeDetails(hike)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") openHikeDetails(hike);
                    }}
                  >
                    <div
                      className="exploreThumb"
                      aria-hidden="true"
                      style={hike.coverPhoto ? { backgroundImage: `linear-gradient(180deg, rgba(14,25,18,.04), rgba(14,25,18,.14)), url("${hike.coverPhoto}")`, backgroundPosition: hike.coverPosition ?? "50% 50%", backgroundSize: `${(hike.coverZoom ?? 1) * 100}%` } : undefined}
                    >
                      <span className={`exploreDifficulty difficulty-${hike.difficulty}`}>{hike.difficulty}</span>
                      <span className="exploreHeart">♡</span>
                    </div>

                    <div className="exploreInfo">
                      <div className="exploreDate">{hike.day} {hike.month} · {hike.start}</div>
                      <h3 className="exploreTitle">{hike.title}</h3>

                      <div className="exploreMeta">
                        <span>↗ {hike.distance}</span>
                        <span>◷ {hike.start}</span>
                        <span>♙ {hike.people}{hike.maxParticipants ? `/${hike.maxParticipants}` : ""}</span>
                      </div>

                      <div className="exploreFooter">
                        <button
                          className="exploreOrganizer"
                          disabled={hike.demo || !hike.organizerId}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (hike.organizerId) openPublicProfile(hike.organizerId);
                          }}
                        >
                          <span className="exploreOrganizerAvatar">
                            {hike.organizerAvatar ? (
                              <img src={avatarPublicUrl(hike.organizerAvatar) ?? ""} alt="" />
                            ) : (
                              initials(hike.organizerName || "Π")
                            )}
                          </span>
                          <span>{hike.organizerName || (hike.demo ? "Πεζοπόρος" : "Πεζοπόρος")}</span>
                        </button>
                        <span className="exploreLocation">⌖ {hike.location}</span>
                      </div>
                    </div>
                  </article>
                ))}

                {visibleHikes.length === 0 && (
                  <div className="exploreEmpty">
                    Δεν βρήκαμε πεζοπορία με αυτά τα φίλτρα.
                  </div>
                )}
              </div>
            </section>
          )}

          {view === "detail" && selectedHike && (
            <section className="detailPage">
              <div
                className={`detailHero detailHero-${selectedHike.difficulty}`}
                style={selectedHike.coverPhoto ? { backgroundImage: `linear-gradient(180deg, rgba(8,18,12,.08), rgba(8,18,12,.32)), url("${selectedHike.coverPhoto}")`, backgroundPosition: selectedHike.coverPosition ?? "50% 50%", backgroundSize: `${(selectedHike.coverZoom ?? 1) * 100}%` } : undefined}
              >
                <div className="detailHeroTop">
                  <button
                    className="detailRoundButton"
                    onClick={() => {
                      setView(detailReturnView);
                      setSelectedHike(null);
                    }}
                    aria-label="Πίσω"
                  >
                    ←
                  </button>
                  <div className="detailHeroTools">
                    <button className="detailRoundButton" aria-label="Αγαπημένο">♡</button>
                    <button className="detailRoundButton" aria-label="Κοινοποίηση">↗</button>
                  </div>
                </div>
                <span className={`detailDifficulty difficulty-${selectedHike.difficulty}`}>{selectedHike.difficulty}</span>
              </div>

              <div className="detailContent">
                <div className="detailTitleBlock">
                  <p className="detailLocation">⌖ {selectedHike.location}</p>
                  <h2>{selectedHike.title}</h2>
                </div>

                <div className="detailQuickMeta">
                  <div>
                    <span>↗</span>
                    <strong>{selectedHike.distance}</strong>
                    <small>Απόσταση</small>
                  </div>
                  <div>
                    <span>◷</span>
                    <strong>{selectedHike.start}</strong>
                    <small>Ώρα</small>
                  </div>
                  <div>
                    <span>♙</span>
                    <strong>{selectedHike.people}{selectedHike.maxParticipants ? `/${selectedHike.maxParticipants}` : ""}</strong>
                    <small>Άτομα</small>
                  </div>
                  <div>
                    <span>▣</span>
                    <strong>{selectedHike.day} {selectedHike.month}</strong>
                    <small>Ημερομηνία</small>
                  </div>
                </div>

                <button
                  className="detailOrganizerCard"
                  disabled={selectedHike.demo || !selectedHike.organizerId}
                  onClick={() => selectedHike.organizerId && openPublicProfile(selectedHike.organizerId)}
                >
                  <span className="detailOrganizerAvatar">
                    {selectedHike.organizerAvatar ? (
                      <img src={avatarPublicUrl(selectedHike.organizerAvatar) ?? ""} alt="" />
                    ) : (
                      initials(selectedHike.organizerName || "Ο")
                    )}
                  </span>
                  <span className="detailOrganizerText">
                    <small>Ξεκίνησε την παρέα</small>
                    <strong>{selectedHike.organizerName || "Πεζοπόρος"}</strong>
                  </span>
                  <span className="detailOrganizerArrow">›</span>
                </button>

                {selectedHike.meetingPoint && (
                  <section className="detailMeetingPoint">
                    <span>⌖</span>
                    <div>
                      <small>Σημείο συνάντησης</small>
                      <strong>{selectedHike.meetingPoint}</strong>
                    </div>
                  </section>
                )}

                <section className="detailSection">
                  <h3>Περιγραφή</h3>
                  <p>{selectedHike.description || "Δεν έχει προστεθεί ακόμη περιγραφή για αυτή την πεζοπορική συνάντηση."}</p>
                </section>

                <section className="detailSection">
                  <div className="detailSectionHeading">
                    <h3>Ποιοι πάνε</h3>
                    <span>{selectedHike.people}{selectedHike.maxParticipants ? ` / ${selectedHike.maxParticipants}` : ""}</span>
                  </div>

                  {selectedHike.demo ? (
                    <div className="detailDemoPeople">
                      <span>Μ</span><span>Α</span><span>Κ</span>
                      <small>Demo συμμετέχοντες</small>
                    </div>
                  ) : detailLoading ? (
                    <p className="detailMuted">Φορτώνουμε την ομάδα...</p>
                  ) : detailParticipants.length === 0 ? (
                    <p className="detailMuted">Δεν έχουν εγκριθεί ακόμη άλλοι συμμετέχοντες.</p>
                  ) : (
                    <div className="detailParticipants">
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
                </section>

                <section className="detailSection">
                  <h3>Φωτογραφίες</h3>
                  {selectedHike.photoUrls?.length ? (
                    <div className="detailPhotoStrip realPhotos">
                      {selectedHike.photoUrls.map((photo, index) => (
                        <button
                          type="button"
                          className="detailPhotoButton"
                          key={photo}
                          onClick={() => openPhotoViewer(index)}
                          aria-label={`Άνοιγμα φωτογραφίας ${index + 1} από ${selectedHike.photoUrls?.length ?? 0}`}
                        >
                          <img className="detailPhoto" src={photo} alt={`${selectedHike.title} — φωτογραφία ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="detailMuted">Δεν έχουν προστεθεί ακόμη φωτογραφίες.</p>
                  )}
                </section>

                <section className="detailInlineMapSection">
                  <div className="detailInlineMapHeader">
                    <div>
                      <small>Χάρτης</small>
                      <strong>{selectedHike.routePoints?.length ? "Μονοπάτι πεζοπορίας" : "Θέση πεζοπορίας"}</strong>
                      {selectedHike.routePoints?.length && selectedHike.routeIsApproximate ? (
                        <span className="detailMapNote">Ενδεικτική χάραξη · όχι για πλοήγηση</span>
                      ) : null}
                    </div>
                    {detailMapSrc && (
                      <button type="button" onClick={() => openHikeOnMap(selectedHike)}>
                        Άνοιγμα χάρτη
                      </button>
                    )}
                  </div>

                  {detailMapSrc ? (
                    <div className="detailInlineMapWrap">
                      <iframe
                        className="detailInlineMapFrame"
                        title={`Χάρτης ${selectedHike.title}`}
                        src={detailMapSrc}
                      />
                    </div>
                  ) : (
                    <div className="detailInlineMapMissing">
                      Δεν έχει οριστεί ακόμη σημείο στον χάρτη για αυτή την πεζοπορία.
                    </div>
                  )}
                </section>

                <section className="communityNotice compact detailLegalNotice">
                  <strong>Κοινωνική πεζοπορική συνάντηση</strong>
                  <p>
                    Το ORIVATIS φέρνει ανθρώπους σε επαφή για να πεζοπορούν μαζί. Η ανάρτηση δεν αποτελεί επαγγελματική ξενάγηση ή υπηρεσία συνοδείας και το μέλος που ξεκίνησε την παρέα δεν αναλαμβάνει, μόνο από αυτή την ιδιότητα, ρόλο επαγγελματία οδηγού.
                  </p>
                  <a href="/safety">Ασφάλεια & κανόνες</a>
                </section>
              </div>

              <div className="detailStickyAction">
                {selectedHike.organizerId === user?.id && selectedHike.id ? (
                  <div className="detailOwnerActions">
                    <button className="detailSecondaryAction" onClick={() => { setSelectedHike(null); startEditHike(selectedHike); }}>Επεξεργασία</button>
                    <button className="detailDangerAction" onClick={async () => {
                      await deleteHike(selectedHike);
                      setSelectedHike(null);
                      setView(detailReturnView);
                    }}>Διαγραφή</button>
                  </div>
                ) : selectedHike.id && myJoinRequests[selectedHike.id]?.status === "pending" ? (
                  <button className="detailSecondaryAction full" onClick={() => cancelJoinRequest(selectedHike)}>
                    Ακύρωση αιτήματος
                  </button>
                ) : selectedHike.id && myJoinRequests[selectedHike.id]?.status === "accepted" ? (
                  <button className="detailPrimaryAction" onClick={() => { setSelectedChatId(selectedHike.id ?? null); setSelectedHike(null); setView("messages"); }}>
                    Άνοιγμα group chat
                  </button>
                ) : (
                  <button
                    className="detailPrimaryAction"
                    disabled={Boolean(selectedHike.maxParticipants && selectedHike.people >= selectedHike.maxParticipants)}
                    onClick={() => requestJoin(selectedHike)}
                  >
                    {selectedHike.maxParticipants && selectedHike.people >= selectedHike.maxParticipants
                      ? "Η ομάδα γέμισε"
                      : "Μπες στην παρέα"}
                  </button>
                )}
              </div>

              {photoViewerIndex !== null && selectedHike.photoUrls?.[photoViewerIndex] && (
                <div className="photoViewer" role="dialog" aria-modal="true" aria-label="Προβολή φωτογραφιών" onClick={closePhotoViewer}>
                  <button className="photoViewerClose" type="button" onClick={closePhotoViewer} aria-label="Κλείσιμο">×</button>
                  <div className="photoViewerCounter">
                    {photoViewerIndex + 1} / {selectedHike.photoUrls.length}
                  </div>
                  <button
                    className="photoViewerArrow photoViewerPrev"
                    type="button"
                    onClick={(event) => { event.stopPropagation(); showPreviousPhoto(); }}
                    aria-label="Προηγούμενη φωτογραφία"
                  >
                    ‹
                  </button>
                  <div className="photoViewerImageWrap" onClick={(event) => event.stopPropagation()}>
                    <img
                      src={selectedHike.photoUrls[photoViewerIndex]}
                      alt={`${selectedHike.title} — φωτογραφία ${photoViewerIndex + 1}`}
                    />
                  </div>
                  <button
                    className="photoViewerArrow photoViewerNext"
                    type="button"
                    onClick={(event) => { event.stopPropagation(); showNextPhoto(); }}
                    aria-label="Επόμενη φωτογραφία"
                  >
                    ›
                  </button>
                </div>
              )}
            </section>
          )}

          {view === "map" && (
            <section className="discoveryMapPage">
              <iframe
                key={mapResetToken}
                className="liveMapCanvas"
                title="Χάρτης ενεργών πεζοποριών"
                src={mapFrameSrc}
              />

              <div className="mapDiscoveryTop">
                <div className="mapDiscoveryBrandRow">
                  <button type="button" className="mapDiscoveryBack" onClick={() => setView("explore")} aria-label="Πίσω στις πεζοπορίες">←</button>
                  <div>
                    <strong>Ανακάλυψε πεζοπορίες</strong>
                    <span>{mapHikes.length} ενεργές στον χάρτη</span>
                  </div>
                  <button type="button" className="mapDiscoveryProfile" onClick={() => setView("profile")} aria-label="Προφίλ">
                    {initials(profile?.displayName || user?.email?.split("@")[0] || "Π").toUpperCase()}
                  </button>
                </div>

                <label className="mapDiscoverySearch">
                  <span>⌕</span>
                  <input
                    value={mapSearch}
                    onChange={(event) => setMapSearch(event.target.value)}
                    placeholder="Περιοχή, βουνό ή πεζοπορία..."
                  />
                </label>

                <div className="mapQuickFilters">
                  {["Όλες", "Αύριο", "Αυτό το ΣΚ", "Εύκολες"].map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={mapQuickFilter === item ? "active" : ""}
                      onClick={() => setMapQuickFilter(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <button className={`mapFitButton ${mapPreviewHike ? "withPreview" : ""}`} type="button" onClick={resetMapViewport} aria-label="Προβολή όλων">⌖</button>

              {!loadingHikes && mapHikes.length === 0 && (
                <div className="mapNoResults">
                  <strong>Δεν βρήκαμε ενεργή πεζοπορία εδώ.</strong>
                  <span>Άλλαξε φίλτρο ή αναζήτησε άλλη περιοχή.</span>
                </div>
              )}

              {mapPreviewHike && (
                <article className="mapHikePreview">
                  <button className="mapPreviewClose" type="button" onClick={() => setMapPreviewHike(null)} aria-label="Κλείσιμο">×</button>
                  <div
                    className="mapPreviewPhoto"
                    style={mapPreviewHike.coverPhoto ? { backgroundImage: `linear-gradient(180deg, rgba(10,20,14,.02), rgba(10,20,14,.20)), url("${mapPreviewHike.coverPhoto}")` } : undefined}
                  >
                    <span className="mapPreviewDifficulty">{mapPreviewHike.difficulty}</span>
                  </div>
                  <div className="mapPreviewBody">
                    <p>⌖ {mapPreviewHike.location}</p>
                    <h3>{mapPreviewHike.title}</h3>
                    <div className="mapPreviewMeta">
                      <span>▣ {mapPreviewHike.day} {mapPreviewHike.month}</span>
                      <span>↗ {mapPreviewHike.distance}</span>
                      <span>♟ {mapPreviewHike.people}/{mapPreviewHike.maxParticipants ?? "—"}</span>
                    </div>
                    <button type="button" className="mapPreviewOpen" onClick={() => openHikeDetails(mapPreviewHike)}>
                      Προβολή πεζοπορίας →
                    </button>
                  </div>
                </article>
              )}
            </section>
          )}

          {view === "new" && (
            <section className="createPage">
              <div className="createTopbar">
                <div>
                  <p>{editingHike ? "Επεξεργασία" : "Νέα συνάντηση"}</p>
                  <h2>{editingHike ? "Επεξεργάσου τη συνάντηση" : "Φτιάξε πεζοπορική παρέα"}</h2>
                </div>
                <button className="createBackButton" type="button" onClick={() => setView("home")} aria-label="Κλείσιμο">×</button>
              </div>

              {!user ? (
                <div className="createLoginState">
                  <p>Χρειάζεται να συνδεθείς για να φτιάξεις πεζοπορική συνάντηση.</p>
                  <a className="createPrimaryButton authLink" href="/auth">Σύνδεση / Εγγραφή</a>
                </div>
              ) : (
                <form className="createForm" key={editingHike?.id ?? "new-hike"} onSubmit={submitHike}>
                  <section className="createSection">
                    <label className="createField full">
                      <span>Τίτλος πεζοπορίας</span>
                      <input name="title" required defaultValue={editingHike?.title ?? ""} placeholder="π.χ. Πάρνηθα — Μονή Κλειστών" />
                    </label>

                    <label className="createField full">
                      <span>Περιγραφή</span>
                      <textarea
                        name="description"
                        rows={5}
                        defaultValue={editingHike?.description ?? ""}
                        placeholder="Πες στην ομάδα τι να περιμένει, ρυθμό, εξοπλισμό, στάσεις..."
                      />
                    </label>
                  </section>

                  <section className="createSection">
                    <label className="createField full">
                      <span>Περιοχή</span>
                      <input name="location" required defaultValue={editingHike?.location ?? ""} placeholder="π.χ. Πάρνηθα, Αττική" />
                    </label>

                    <label className="createField full">
                      <span>Σημείο συνάντησης</span>
                      <input name="meetingPoint" defaultValue={editingHike?.meetingPoint ?? ""} placeholder="π.χ. Parking τελεφερίκ / Καταφύγιο Μπάφι" />
                      <small>Αυτό θα μας βοηθήσει αργότερα όταν συνδέσουμε τον χάρτη.</small>
                    </label>

                    <div className="mountainSearch">
                      <label className="createField full">
                        <span>Βρες κορυφή ή βουνό</span>
                        <div className="mountainSearchInput">
                          <span aria-hidden="true">⌕</span>
                          <input
                            value={mountainQuery}
                            onChange={(event) => {
                              setMountainQuery(event.target.value);
                              setSelectedMountain(null);
                            }}
                            autoComplete="off"
                            placeholder="π.χ. Πάρνηθα, Δέλφι, Όλυμπος..."
                          />
                          {mountainSearching && <i>...</i>}
                        </div>
                      </label>
                      {mountainResults.length > 0 && (
                        <div className="mountainResults">
                          {mountainResults.map((result) => (
                            <button key={result.id} type="button" onClick={() => chooseMountain(result)}>
                              <span className="mountainResultIcon">△</span>
                              <span>
                                <strong>{result.name}</strong>
                                <small>{result.displayName}</small>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {mountainQuery.trim().length >= 2 && !mountainSearching && mountainResults.length === 0 && !selectedMountain && (
                        <small className="mountainSearchHint">Γράψε το όνομα και διάλεξε την κορυφή ή το βουνό από τις προτάσεις.</small>
                      )}
                    </div>

                    <div className="createMapPicker">
                      <div className="createMapPickerHeader">
                        <div>
                          <strong>{selectedMountain ? selectedMountain.name : "Προεπισκόπηση στον χάρτη"}</strong>
                          <small>{createMapPoint ? "Η περιοχή της επιλογής σου φαίνεται στον χάρτη. Μπορείς και να μετακινήσεις το pin." : "Αναζήτησε πρώτα κορυφή ή βουνό από πάνω."}</small>
                        </div>
                        <span className={createMapPoint ? "picked" : ""}>
                          {createMapPoint ? "✓ Επιλέχθηκε" : "Απαραίτητο"}
                        </span>
                      </div>
                      <iframe
                        key={`${editingHike?.id ?? "new-map-point"}-${createMapPoint?.lat ?? "none"}-${createMapPoint?.lng ?? "none"}-${createRoutePoints.length}`}
                        className="createMapPickerFrame"
                        title="Προεπισκόπηση βουνού στον χάρτη"
                        src={`/orivatis-map.html?mode=pick${createMapPoint ? `&lat=${createMapPoint.lat}&lng=${createMapPoint.lng}` : ""}${createRoutePoints.length > 1 ? `&route=${encodeURIComponent(JSON.stringify(createRoutePoints))}` : ""}`}
                      />
                      <input name="mapLat" type="hidden" value={createMapPoint?.lat ?? ""} readOnly />
                      <input name="mapLng" type="hidden" value={createMapPoint?.lng ?? ""} readOnly />
                      <small className="createMapCoordinates">
                        {createMapPoint ? "Το σημείο αποθηκεύτηκε · ο κύκλος δείχνει την ευρύτερη περιοχή του βουνού." : "Επίλεξε κορυφή ή βουνό για να το δεις εδώ."}
                      </small>
                    </div>

                    {createRoutePoints.length > 1 && (
                      <div className="createRouteSelected">
                        <div>
                          <strong>✓ {createRouteName || "Πεζοπορική διαδρομή"}</strong>
                          <small>
                            Βρέθηκε από OpenStreetMap
                            {createRouteDistanceKm ? ` · ${createRouteDistanceKm.toFixed(1)} km` : ""}
                          </small>
                        </div>
                        <button type="button" onClick={clearCreateRoute}>Αλλαγή</button>
                      </div>
                    )}

                    <div className="createTwoCols">
                      <label className="createField">
                        <span>Ημερομηνία</span>
                        <input name="date" required type="date" defaultValue={localDateValue(editingHike?.startsAt)} />
                      </label>
                      <label className="createField">
                        <span>Ώρα</span>
                        <input name="time" required type="time" defaultValue={localTimeValue(editingHike?.startsAt)} />
                      </label>
                    </div>
                  </section>

                  <section className="createSection">
                    <div className="createField full">
                      <span>Δυσκολία</span>
                      <div className="createDifficulty">
                        {["Εύκολη", "Μέτρια", "Δύσκολη"].map((level) => (
                          <label key={level}>
                            <input
                              type="radio"
                              name="difficulty"
                              value={level}
                              defaultChecked={(editingHike?.difficulty ?? "Μέτρια") === level}
                            />
                            <span>{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="createTwoCols">
                      <label className="createField">
                        <span>Χιλιόμετρα</span>
                        <input name="distance" type="number" min="0.1" step="0.1" defaultValue={editingHike?.distanceKm ?? ""} placeholder="8" />
                      </label>
                      <label className="createField">
                        <span>Μέγιστα άτομα</span>
                        <input name="maxParticipants" type="number" min="2" max="30" defaultValue={editingHike?.maxParticipants ?? ""} placeholder="10" />
                      </label>
                    </div>
                  </section>

                  <section className="communityNotice">
                    <strong>Το ORIVATIS είναι για παρέες, όχι για επαγγελματικές εκδρομές</strong>
                    <p>
                      Δημιουργείς μια κοινωνική συνάντηση μεταξύ χρηστών. Δεν επιτρέπεται μέσω αυτής της ανάρτησης χρέωση για συμμετοχή, ξενάγηση, καθοδήγηση ή οργανωμένη εκδρομή.
                    </p>
                    <label className="communityAgreement">
                      <input name="communityAgreement" type="checkbox" required />
                      <span>
                        Επιβεβαιώνω ότι η συνάντηση είναι κοινωνική και μη εμπορική, ότι δεν παρουσιάζομαι μέσω της ανάρτησης ως επαγγελματίας οδηγός/συνοδός και ότι κάθε μέλος αξιολογεί μόνο του διαδρομή, καιρό, εξοπλισμό και φυσική κατάσταση.
                      </span>
                    </label>
                    <div className="communityLegalLinks">
                      <a href="/terms">Όροι χρήσης</a>
                      <a href="/safety">Ασφάλεια & κανόνες</a>
                    </div>
                  </section>

                  <section className="createPhotoUpload">
                    <div><strong>Φωτογραφίες & εξώφυλλο</strong><p>Διάλεξε φωτογραφία και ρύθμισε το κάδρο όπως ακριβώς θέλεις να φαίνεται.</p></div>
                    {editingHike?.photoUrls?.length ? <div className="createExistingPhotos">{editingHike.photoUrls.map((photo)=><div className={`createExistingPhoto ${editingHike.coverPhoto===photo?"isCover":""}`} key={photo}><img src={photo} alt="Φωτογραφία εκδρομής"/><button type="button" className="photoCoverButton" onClick={()=>openExistingCoverEditor(photo)}>{editingHike.coverPhoto===photo?"✓ Εξώφυλλο":"Κάνε εξώφυλλο"}</button><button type="button" className="createExistingPhotoDelete" disabled={deletingExistingPhoto===photo} onClick={()=>void deleteExistingHikePhoto(photo)} aria-label="Διαγραφή φωτογραφίας">{deletingExistingPhoto===photo?"…":"×"}</button></div>)}</div>:null}
                    <label className="createPhotoPicker"><span>＋ Επιλογή φωτογραφιών</span><input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple onChange={(e)=>handleNewPhotos(e.target.files)}/></label>
                    {newPhotoPreviews.length>0&&<div className="createExistingPhotos">{newPhotoPreviews.map((photo,index)=><div className={`createExistingPhoto ${newCoverIndex===index?"isCover":""}`} key={photo.url}><img src={photo.url} alt=""/><button type="button" className="photoCoverButton" onClick={()=>openNewCoverEditor(index)}>{newCoverIndex===index?"✓ Εξώφυλλο":"Κάνε εξώφυλλο"}</button></div>)}</div>}
                    <small>Μέχρι 50 MB η καθεμία · JPG, PNG, WebP ή HEIC.</small>
                  </section>

                  <div className="createActions">
                    <button className="createPrimaryButton" type="submit" disabled={submitting}>
                      {submitting ? "Αποθήκευση..." : editingHike ? "Αποθήκευση αλλαγών" : "Δημοσίευση συνάντησης"}
                    </button>
                    {editingHike && (
                      <button className="createCancelButton" type="button" onClick={() => { setEditingHike(null); setView("home"); }}>
                        Ακύρωση
                      </button>
                    )}
                  </div>
                </form>
              )}
            </section>
          )}

          {view === "messages" && (
            <section className="messagesPage">
              <div className="messagesPageHeader">
                <div>
                  <p>Η ομάδα σου στο βουνό</p>
                  <h2>Συνομιλίες</h2>
                </div>
                <span className="messagesLiveBadge">Live</span>
              </div>

              {!user ? (
                <div className="messagesEmptyCard">
                  <strong>Συνδέσου για να δεις τις ομάδες σου</strong>
                  <p>Τα group chats ανοίγουν μόνο για εγκεκριμένους συμμετέχοντες.</p>
                  <a className="createPrimaryButton authLink" href="/auth">Σύνδεση / Εγγραφή</a>
                </div>
              ) : chatGroups.length === 0 ? (
                <div className="messagesEmptyCard">
                  <strong>Δεν έχεις ομαδική συνομιλία ακόμη</strong>
                  <p>Μόλις εγκριθείς σε μια πεζοπορία — ή ξεκινήσεις τη δική σου παρέα — η ομάδα θα εμφανιστεί εδώ.</p>
                  <button className="createPrimaryButton" onClick={() => setView("explore")}>Βρες πεζοπορία</button>
                </div>
              ) : (
                <div className="groupChatShell">
                  <aside className="groupChatList">
                    <div className="groupChatListTitle">Οι ομάδες μου</div>
                    {chatGroups.map((group) => (
                      <button
                        key={group.id}
                        className={`groupChatItem ${selectedChatId === group.id ? "active" : ""}`}
                        onClick={() => setSelectedChatId(group.id)}
                      >
                        <span className="groupChatIcon">▲</span>
                        <span className="groupChatItemText">
                          <strong>{group.title}</strong>
                          <small>
                            {group.memberCount} μέλη · {new Date(group.startsAt).toLocaleDateString("el-GR", { day: "numeric", month: "short" })}
                          </small>
                        </span>
                        <span className="groupChatRole">{group.role === "organizer" ? "Ξεκίνησες την παρέα" : "Μέλος"}</span>
                      </button>
                    ))}
                  </aside>

                  <section className="groupChatPane">
                    <header className="groupChatHeader">
                      <div>
                        <small>Ομαδική συνομιλία</small>
                        <strong>{chatGroups.find((group) => group.id === selectedChatId)?.title ?? "Πεζοπορία"}</strong>
                        <span>
                          {chatGroups.find((group) => group.id === selectedChatId)?.memberCount ?? 0} μέλη
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const hike = realHikes.find((item) => item.id === selectedChatId);
                          if (hike) openHikeDetails(hike);
                        }}
                        disabled={!realHikes.some((item) => item.id === selectedChatId)}
                      >
                        Πληροφορίες
                      </button>
                    </header>

                    <div className="groupChatMessages">
                      {chatMessages.length === 0 ? (
                        <div className="groupChatEmpty">
                          <span>👋</span>
                          <strong>Η ομάδα είναι έτοιμη</strong>
                          <p>Στείλε το πρώτο μήνυμα για σημείο συνάντησης, εξοπλισμό ή μετακίνηση.</p>
                        </div>
                      ) : (
                        chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`groupMessage ${message.senderId === user.id ? "mine" : ""}`}
                          >
                            <div className="groupMessageMeta">
                              <strong>{message.senderId === user.id ? "Εσύ" : message.senderName}</strong>
                              <span>{new Date(message.createdAt).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p>{message.body}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form className="groupChatComposer" onSubmit={sendChatMessage}>
                      <input
                        name="message"
                        maxLength={2000}
                        placeholder="Γράψε μήνυμα στην ομάδα..."
                        autoComplete="off"
                      />
                      <button type="submit" disabled={sendingMessage || !selectedChatId} aria-label="Αποστολή">
                        {sendingMessage ? "…" : "↑"}
                      </button>
                    </form>
                  </section>
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
                    <span className="infoBadge">🥾 {realHikes.filter((hike) => hike.organizerId === user.id).length} παρέες ξεκίνησες</span>
                    <span className="infoBadge">📨 {incomingRequests.length} νέα αιτήματα</span>
                    <span className="infoBadge">💬 {chatGroups.length} groups</span>
                  </div>

                  <section className="appearancePanel">
                    <div className="appearancePanelCopy">
                      <span className="appearanceIcon">{theme === "dark" ? "☾" : "☀"}</span>
                      <div>
                        <strong>Εμφάνιση</strong>
                        <small>{theme === "dark" ? "Dark theme ενεργό" : "Light theme ενεργό"}</small>
                      </div>
                    </div>
                    <button
                      className={`themeSwitch ${theme === "dark" ? "active" : ""}`}
                      type="button"
                      role="switch"
                      aria-checked={theme === "dark"}
                      onClick={toggleTheme}
                    >
                      <span />
                    </button>
                  </section>

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
                        <label>Instagram <span style={{ fontWeight: 500, opacity: .65 }}>(προαιρετικό)</span></label>
                        <input
                          name="instagramUsername"
                          maxLength={30}
                          autoCapitalize="none"
                          autoCorrect="off"
                          defaultValue={profile?.instagramUsername ?? ""}
                          placeholder="@username"
                        />
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
                    <div className="profileSaveRow">
                      <button className="submit" type="submit" disabled={savingProfile}>
                        {savingProfile ? "Αποθήκευση..." : "Αποθήκευση προφίλ"}
                      </button>
                      <button className="signOutButton" type="button" onClick={signOut}>
                        Αποσύνδεση
                      </button>
                    </div>
                  </form>

                  <div className="profileLegalLinks">
                    <a href="/terms">Όροι χρήσης</a>
                    <a href="/safety">Ασφάλεια & κανόνες</a>
                  </div>

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

        {view !== "detail" && (
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
        )}
      </div>

      {selectedProfile && (
        <div className="modalBackdrop" onClick={() => setSelectedProfile(null)}>
          <section className="profileModal" onClick={(event) => event.stopPropagation()}>
            <button className="modalClose" onClick={() => setSelectedProfile(null)}>×</button>
            <div className="publicProfileHero">
              <div
                className={`publicProfileAvatar ${selectedProfile.avatarUrl ? "publicProfileAvatarClickable" : ""}`}
                role={selectedProfile.avatarUrl ? "button" : undefined}
                tabIndex={selectedProfile.avatarUrl ? 0 : undefined}
                onClick={() => selectedProfile.avatarUrl && setProfilePhotoViewerUrl(avatarPublicUrl(selectedProfile.avatarUrl))}
                onKeyDown={(event) => {
                  if (selectedProfile.avatarUrl && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setProfilePhotoViewerUrl(avatarPublicUrl(selectedProfile.avatarUrl));
                  }
                }}
                aria-label={selectedProfile.avatarUrl ? "Άνοιγμα φωτογραφίας προφίλ" : undefined}
              >
                {selectedProfile.avatarUrl ? (
                  <img src={avatarPublicUrl(selectedProfile.avatarUrl) ?? ""} alt={`Φωτογραφία προφίλ ${selectedProfile.displayName}`} />
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
            {selectedProfile.instagramUsername && (
              <a
                className="publicProfileInstagram"
                href={`https://www.instagram.com/${encodeURIComponent(selectedProfile.instagramUsername)}/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram · @{selectedProfile.instagramUsername}
              </a>
            )}
            <p className="publicProfileBio">
              {selectedProfile.bio || "Ο χρήστης δεν έχει γράψει ακόμη περιγραφή."}
            </p>
          </section>
        </div>
      )}

      {coverEditor && <div className="coverEditorOverlay" role="dialog" aria-modal="true"><div className="coverEditorSheet">
        <div className="coverEditorHeader"><button type="button" onClick={()=>setCoverEditor(null)}>Ακύρωση</button><strong>Εξώφυλλο</strong><button type="button" onClick={()=>void saveCoverEditor()}>Έτοιμο</button></div>
        <p>Σύρε τη φωτογραφία μέσα στο πλαίσιο και μεγέθυνέ την όσο θέλεις.</p>{/* cover editor v3 seeded-photo fix */}
        <div className="coverEditorStage" onPointerDown={(e)=>{e.currentTarget.setPointerCapture(e.pointerId);setCoverDragStart({x:e.clientX,y:e.clientY,cropX:coverEditor.x,cropY:coverEditor.y})}} onPointerMove={(e)=>moveCoverEditor(e.clientX,e.clientY)} onPointerUp={()=>setCoverDragStart(null)} onPointerCancel={()=>setCoverDragStart(null)}>
          <div className="coverEditorImage" style={{backgroundImage:`url("${coverEditor.url}")`,backgroundPosition:`${coverEditor.x}% ${coverEditor.y}%`,backgroundSize:`${coverEditor.zoom*100}%`}}/><div className="coverEditorFrame"><span>ΠΕΡΙΟΧΗ ΕΞΩΦΥΛΛΟΥ</span></div>
        </div>
        <div className="coverZoomRow"><span>−</span><input type="range" min="1" max="2.5" step="0.05" value={coverEditor.zoom} onChange={(e)=>setCoverEditor({...coverEditor,zoom:Number(e.target.value)})}/><span>＋</span></div>
        <button type="button" className="coverEditorDone" onClick={()=>void saveCoverEditor()}>Χρήση ως εξώφυλλο</button>
      </div></div>}

      {profilePhotoViewerUrl && (
        <div className="photoViewer" role="dialog" aria-modal="true" aria-label="Φωτογραφία προφίλ" onClick={() => setProfilePhotoViewerUrl(null)}>
          <button className="photoViewerClose" type="button" onClick={() => setProfilePhotoViewerUrl(null)} aria-label="Κλείσιμο">×</button>
          <div className="photoViewerImageWrap" onClick={(event) => event.stopPropagation()}>
            <img src={profilePhotoViewerUrl} alt="Φωτογραφία προφίλ" />
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
