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
 * formulaire (spec 001/002). Seuls les protocoles compris par les téléphones
 * sont produits (https, vCard, WIFI:, VEVENT…) ; les types « page » (spec
 * 009) attendent la publication et ne produisent pas encore de payload.
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

    case "vcard": {
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

    case "event":
      return buildVEvent(v);

    case "barcode":
      // Le code-barres 1D encode la valeur telle quelle ; la validité vis-à-vis
      // de la symbologie est contrôlée au rendu (src/lib/barcode.ts).
      return v.data ?? "";

    default:
      // Types « page autonome » (spec 009) : en attente de la publication
      // (Netlify, FTP…), aucun payload scannable n'est produit.
      return "";
  }
}

/** « 2026-11-14 » → « 20261114 », ou `null` si la date est absente. */
function icalDate(date: string | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((date ?? "").trim());
  return match ? `${match[1]}${match[2]}${match[3]}` : null;
}

/** Date + heure locales (temps flottant) au format iCalendar. */
function icalDateTime(date: string | undefined, time: string | undefined): string | null {
  const day = icalDate(date);
  if (!day) return null;
  const match = /^(\d{2}):(\d{2})/.exec((time ?? "").trim());
  return `${day}T${match ? `${match[1]}${match[2]}00` : "000000"}`;
}

/**
 * Échappe une valeur TEXT iCalendar (RFC 5545) : barres obliques, points-
 * virgules, virgules et retours à la ligne.
 */
function icalEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Événement iCalendar (spec « événement natif ») : au scan, le téléphone
 * propose d'ajouter l'événement à son calendrier — aucun hébergement requis.
 * L'événement est enveloppé dans VCALENDAR pour la compatibilité la plus
 * large (iOS, Android, lecteurs dédiés).
 */
function buildVEvent(v: QrValues): string {
  const start = icalDateTime(v.startDate, v.startTime);
  const title = line(v.title);
  if (!title || !start) return "";

  // La fin ne s'applique qu'avec une heure de fin ; la date de début sert
  // de repli pour un événement qui se termine le même jour.
  const end = v.endTime?.trim()
    ? icalDateTime(v.endDate || v.startDate, v.endTime)
    : null;

  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eventages QrCode Studio//FR",
    "BEGIN:VEVENT",
    `SUMMARY:${icalEscape(title)}`,
    line(v.location) ? `LOCATION:${icalEscape(v.location)}` : null,
    line(v.description) ? `DESCRIPTION:${icalEscape(v.description)}` : null,
    `DTSTART:${start}`,
    end ? `DTEND:${end}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return rows.filter(Boolean).join("\n");
}

/** Longueur du payload encodé, en octets UTF-8. */
export function payloadSize(payload: string): number {
  return new TextEncoder().encode(payload).length;
}
