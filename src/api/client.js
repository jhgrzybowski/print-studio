// Thin client for local_printer_api. Every request goes through the same-origin
// /api proxy so the HttpOnly session cookie is always sent.

import { t } from "../i18n/index.js";

export const API_BASE = import.meta.env.VITE_PRINTER_API_BASE_URL || "/api";

export class ApiError extends Error {
  constructor(status, detail, message) {
    super(message || describeDetail(detail) || t("Request failed ({status})", { status }));
    this.status = status;
    this.detail = detail;
  }
}

function describeDetail(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d && typeof d === "object" ? d.msg || d.message || JSON.stringify(d) : String(d))).join("; ");
  }
  if (typeof detail === "object") return detail.message || detail.error || JSON.stringify(detail);
  return String(detail);
}

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function request(method, path, { body, query, signal, quiet401 } = {}) {
  let url = apiUrl(path);
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) qs.set(k, v);
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, null, t("Can't reach the print server. Check that you're on the home network."));
  }
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    if (res.status === 401 && !quiet401 && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, data && typeof data === "object" ? data.detail : data);
  }
  return data;
}

// Upload uses XHR so we can report byte progress.
function uploadFile(file, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/files"));
    xhr.withCredentials = true;
    xhr.responseType = "text";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.upload.onload = () => onProgress && onProgress(1);
    xhr.onload = () => {
      let data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else {
        if (xhr.status === 401 && onUnauthorized) onUnauthorized();
        reject(new ApiError(xhr.status, data && typeof data === "object" ? data.detail : data));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, null, t("The upload was interrupted. Check your connection and try again.")));
    xhr.onabort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    if (signal) signal.addEventListener("abort", () => xhr.abort());
    const form = new FormData();
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

export const api = {
  // Public
  health: () => request("GET", "/health"),
  status: (opts) => request("GET", "/status", opts),
  options: () => request("GET", "/options"),
  capabilities: () => request("GET", "/capabilities"),

  // Auth
  signup: (username, password, display_name) => request("POST", "/auth/signup", { body: { username, password, display_name: display_name || null }, quiet401: true }),
  login: (username, password) => request("POST", "/auth/login", { body: { username, password }, quiet401: true }),
  logout: () => request("POST", "/auth/logout", { quiet401: true }),
  me: () => request("GET", "/auth/me", { quiet401: true }),

  // Files
  upload: uploadFile,
  file: (id) => request("GET", `/files/${encodeURIComponent(id)}`),
  preview: (id) => request("GET", `/files/${encodeURIComponent(id)}/preview`),
  previewPageUrl: (id, page) => apiUrl(`/files/${encodeURIComponent(id)}/preview/${page}`),
  pdfUrl: (id) => apiUrl(`/files/${encodeURIComponent(id)}/pdf`),

  // Print
  validate: (payload, opts) => request("POST", "/print/validate", { body: payload, ...opts }),
  print: (payload) => request("POST", "/print", { body: payload }),

  // Jobs
  jobs: (scope = "all") => request("GET", "/jobs", { query: { scope } }),
  job: (id) => request("GET", `/jobs/${id}`),
  cancelJob: (id) => request("DELETE", `/jobs/${id}`),
  forgetJob: (id) => request("POST", `/jobs/${id}/forget`),

  // History & preferences
  history: (limit = 50, offset = 0) => request("GET", "/history", { query: { limit, offset } }),
  historyEntry: (id, opts) => request("GET", `/history/${id}`, opts),
  preferences: () => request("GET", "/me/preferences"),
  savePreferences: (prefs) => request("PUT", "/me/preferences", { body: prefs }),
};
