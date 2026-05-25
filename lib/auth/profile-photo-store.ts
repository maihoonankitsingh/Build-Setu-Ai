import fs from "fs";
import path from "path";

const STORE_PATH = path.join(process.cwd(), "data/generated/user-profile-photos.json");

type Store = Record<string, string>;

function readStore(): Store {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function saveUserProfilePhoto(email?: string | null, image?: string | null) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanImage = String(image || "").trim();

  if (!cleanEmail || !cleanImage) return;

  const store = readStore();
  store[cleanEmail] = cleanImage;
  writeStore(store);
}

export function getUserProfilePhoto(email?: string | null) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) return "";

  const store = readStore();
  return store[cleanEmail] || "";
}

export function getPictureFromGoogleIdToken(idToken?: string | null) {
  try {
    if (!idToken) return "";
    const payload = String(idToken).split(".")[1];
    if (!payload) return "";

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));

    return decoded?.picture || decoded?.image || decoded?.avatar || "";
  } catch {
    return "";
  }
}
