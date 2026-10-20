/**
 * Reconstruction du contenu depuis un QR existant : le payload décodé par le
 * backend Rust est analysé pour pré-remplir le bon type de projet (URL, Wi-Fi,
 * email, SMS…), avec repli sur « Texte ».
 */

import type { QrValues } from "@/lib/qr-catalog";

export type ImportedContent = { typeId: string; values: QrValues };

/** Déduit le type de projet et les valeurs initiales d'un payload décodé. */
export function contentFromPayload(payload: string): ImportedContent {
  const value = payload.trim();
  if (!value) return { typeId: "text", values: { content: "" } };

  if (/^https?:\/\//i.test(value)) {
    return { typeId: "url", values: { url: value } };
  }
  if (/^wifi:/i.test(value)) {
    return parseWifi(value) ?? textFallback(value);
  }
  if (/^mailto:/i.test(value)) {
    return parseMailto(value) ?? textFallback(value);
  }
  if (/^(smsto|sms):/i.test(value)) {
    return parseSms(value) ?? textFallback(value);
  }
  if (/^tel:/i.test(value)) {
    const number = value.slice(value.indexOf(":") + 1).trim();
    if (number) return { typeId: "sms", values: { number } };
    return textFallback(value);
  }
  if (/^BEGIN:(VCALENDAR|VEVENT)\b/i.test(value)) {
    return parseVEvent(value) ?? textFallback(value);
  }
  return textFallback(value);
}

function textFallback(value: string): ImportedContent {
  return { typeId: "text", values: { content: value } };
}

/** Découpe en respectant les échappements « \; » du format Wi-Fi. */
function splitEscaped(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\") {
      current += char;
      escaped = true;
    } else if (char === separator) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

function unescapeWifi(value: string): string {
  return value.replace(/\\([;,:\\])/g, "$1");
}

/** « WIFI:T:WPA;S:Mon réseau;P:secret;H:true;; » → type Wi-Fi. */
function parseWifi(value: string): ImportedContent | null {
  const body = value.slice(value.indexOf(":") + 1);
  const values: QrValues = { security: "WPA", hidden: "false" };
  for (const part of splitEscaped(body, ";")) {
    const separator = part.indexOf(":");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim().toUpperCase();
    const raw = unescapeWifi(part.slice(separator + 1));
    if (key === "S") values.ssid = raw;
    else if (key === "P") values.password = raw;
    else if (key === "T") values.security = normalizeWifiSecurity(raw);
    else if (key === "H") values.hidden = /^(true|1|yes)$/i.test(raw) ? "true" : "false";
  }
  if (!values.ssid?.trim()) return null;
  return { typeId: "wifi", values };
}

function normalizeWifiSecurity(raw: string): string {
  const value = raw.trim().toUpperCase();
  if (value === "WEP") return "WEP";
  if (value === "WPA2" || value === "WPA" || value === "WPA3") return value;
  if (value === "NOPASS" || value === "NONE") return "nopass";
  return "WPA";
}

/** « mailto:contact@exemple.com?subject=Bonjour&body=Salut » → type Email. */
function parseMailto(value: string): ImportedContent | null {
  const rest = value.slice(/^mailto:/i.exec(value)![0].length);
  const [to, query = ""] = rest.split("?");
  if (!to.trim()) return null;
  const values: QrValues = { to: to.trim() };
  if (query) {
    const params = new URLSearchParams(query);
    const subject = params.get("subject");
    const body = params.get("body");
    if (subject) values.subject = subject;
    if (body) values.body = body;
  }
  return { typeId: "email", values };
}

/** « SMSTO:+33612345678:Bonjour » ou « sms:…?body=… » → type SMS. */
function parseSms(value: string): ImportedContent | null {
  const rest = value.slice(value.indexOf(":") + 1);
  const [number, messagePart] = rest.split(/[:?]/);
  const message = value.includes("?")
    ? new URLSearchParams(rest.split("?")[1] ?? "").get("body") ?? ""
    : messagePart ?? "";
  if (!number?.trim()) return null;
  const values: QrValues = { number: number.trim() };
  if (message) values.message = message;
  return { typeId: "sms", values };
}

/** Dé-échappe une valeur TEXT iCalendar (RFC 5545). */
function icalUnescape(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

/** « 20261114T193000 » → [« 2026-11-14 », « 19:30 »]. */
function splitIcalDateTime(raw: string): [string, string] {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/i.exec(raw.trim());
  if (!match) return ["", ""];
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const time = match[4] ? `${match[4]}:${match[5]}` : "";
  return [date, time];
}

/** Événement iCalendar (VCALENDAR ou VEVENT seul) → type Événement. */
function parseVEvent(payload: string): ImportedContent | null {
  const values: QrValues = {};
  let inside = false;
  for (const rawLine of payload.split(/\r?\n/)) {
    const row = rawLine.trim();
    if (/^BEGIN:VEVENT$/i.test(row)) {
      inside = true;
      continue;
    }
    if (/^END:VEVENT$/i.test(row)) break;
    if (!inside) continue;
    const separator = row.indexOf(":");
    if (separator < 1) continue;
    const key = row.slice(0, separator).split(";")[0].toUpperCase();
    const raw = row.slice(separator + 1);
    if (key === "SUMMARY") values.title = icalUnescape(raw);
    else if (key === "LOCATION") values.location = icalUnescape(raw);
    else if (key === "DESCRIPTION") values.description = icalUnescape(raw);
    else if (key === "DTSTART") [values.startDate, values.startTime] = splitIcalDateTime(raw);
    else if (key === "DTEND") [values.endDate, values.endTime] = splitIcalDateTime(raw);
  }
  if (!inside || !values.startDate) return null;
  return { typeId: "event", values };
}
