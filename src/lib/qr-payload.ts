import type { QrType, QrValues } from "@/lib/qr-catalog";

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function line(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function esc(value: string | undefined): string {
  return (value ?? "").replace(/([,;:\\])/g, "\\$1");
}

/**
 * Construit la chaîne réellement encodée dans le QR depuis les valeurs du
 * formulaire (spec 001/002). Les types riches (`page`) produisent une courte
 * URL de contenu ; elle est simulée ici en attendant le générateur de pages
 * autonomes (spec 009), sans aucune dépendance réseau.
 */
export function buildPayload(type: QrType, values: QrValues): string {
  const v = values;

  switch (type.id) {
    case "url":
      return line(v.url) ?? "";

    case "text": {
      const parts = [line(v.title), line(v.content)].filter(Boolean);
      return parts.join("\n");
    }

    case "email": {
      const params = new URLSearchParams();
      if (line(v.subject)) params.set("subject", v.subject.trim());
      if (line(v.body)) params.set("body", v.body.trim());
      const query = params.toString();
      const to = line(v.to) ?? "";
      return `mailto:${to}${query ? `?${query}` : ""}`;
    }

    case "sms":
      return `SMSTO:${line(v.number) ?? ""}:${v.message ?? ""}`;

    case "whatsapp": {
      const number = (line(v.number) ?? "").replace(/[^0-9]/g, "");
      const text = line(v.message);
      return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
    }

    case "wifi":
      return [
        "WIFI:",
        `T:${v.security || "WPA"};`,
        `S:${escapeWifi(v.ssid ?? "")};`,
        v.security === "nopass" ? "" : `P:${escapeWifi(v.password ?? "")};`,
        v.hidden === "true" ? "H:true;" : "",
        ";",
      ].join("");

    case "vcard":
    case "vcard-plus": {
      const rows = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${esc(v.lastName)};${esc(v.firstName)};;;`,
        `FN:${esc([v.firstName, v.lastName].filter(Boolean).join(" "))}`,
        line(v.company) ? `ORG:${esc(v.company)}` : null,
        line(v.jobTitle) ? `TITLE:${esc(v.jobTitle)}` : null,
        line(v.phone) ? `TEL;TYPE=CELL:${esc(v.phone)}` : null,
        line(v.email) ? `EMAIL:${esc(v.email)}` : null,
        line(v.website) ? `URL:${esc(v.website)}` : null,
        line(v.address) ? `ADR:;;${esc(v.address)};;;;` : null,
        line(v.note) ? `NOTE:${esc(v.note)}` : null,
        "END:VCARD",
      ];
      return rows.filter(Boolean).join("\n");
    }

    case "barcode2d":
      return v.data ?? "";

    default: {
      // Types « page autonome » (spec 009) : le QR pointe vers un document
      // HTML local. L'URL est déterministe à partir du contenu saisi.
      const seed = Object.entries(v)
        .filter(([, value]) => value?.trim())
        .map(([key, value]) => `${key}:${value}`)
        .join("|");
      const id = hash(seed || type.id);
      return `local://${type.id}/${id}`;
    }
  }
}

function hash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

/** Longueur du payload encodé, en octets UTF-8. */
export function payloadSize(payload: string): number {
  return new TextEncoder().encode(payload).length;
}
