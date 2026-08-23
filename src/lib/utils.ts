import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function slugify(raw: string) {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i += 1) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso: string | Date | null | undefined) {
  if (iso instanceof Date) {
    const y = iso.getFullYear();
    const m = String(iso.getMonth() + 1).padStart(2, "0");
    const day = String(iso.getDate()).padStart(2, "0");
    return `${day}/${m}/${y}`;
  }
  const d = String(iso ?? "").slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso ? String(iso) : "";
  return `${day}/${m}/${y}`;
}
