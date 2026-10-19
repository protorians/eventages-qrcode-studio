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
