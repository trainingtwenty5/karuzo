import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdhMIiqetOfDGP85ERxtgwn3AXR50pBcE",
  authDomain: "base-468e0.firebaseapp.com",
  projectId: "base-468e0",
  storageBucket: "base-468e0.firebasestorage.app",
  messagingSenderId: "829161895559",
  appId: "1:829161895559:web:d832541aac05b35847ea22"
};

let firebaseCache = null;

export function initFirebase() {
  if (firebaseCache) {
    return firebaseCache;
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  firebaseCache = { app, db, auth };
  return firebaseCache;
}

export { doc, getDoc, updateDoc, serverTimestamp, setDoc, onAuthStateChanged, collection, getDocs };

export function parseQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const offerId = params.get("id") || "";
  const plotParam = params.get("plot");
  const plotIndex = plotParam !== null ? Number.parseInt(plotParam, 10) : 0;
  return {
    offerId,
    plotIndex: Number.isFinite(plotIndex) && plotIndex >= 0 ? plotIndex : 0
  };
}

export function formatNumber(value, options = {}) {
  let number;
  if (typeof value === "string") {
    number = parseNumberFromText(value);
  } else {
    number = Number(value);
  }
  if (!Number.isFinite(number)) {
    return null;
  }
  return new Intl.NumberFormat("pl-PL", options).format(number);
}

export function parseNumberFromText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const text = String(value)
    .replace(/[\u00A0]/g, "")
    .replace(/\s+/g, "")
    .replace(/zł|pln|m²|m2/gi, "")
    .replace(/,/g, ".")
    .replace(/[^0-9+\-.]/g, "");
  if (!text) {
    return null;
  }
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrency(value) {
  const formatted = formatNumber(value);
  return formatted ? `${formatted} zł` : null;
}

export function formatArea(value) {
  const formatted = formatNumber(value);
  return formatted ? `${formatted} m²` : null;
}

export function toDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if ("seconds" in value && typeof value.seconds === "number") {
      const date = new Date(value.seconds * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export const UTILITY_ORDER = ["missing", "planned", "available"];

const UTILITY_SYNONYMS = {
  available: ["available", "dostepne", "dostępne", "yes", "tak", "true", "1", "on", "available"],
  planned: ["planned", "w drodze", "wdrodze", "droga", "planned", "2", "soon", "plan", "planowana"],
  missing: ["missing", "brak", "no", "false", "0", "off", "unknown", "n/a", "nie"]
};

export const UTILITY_LABELS = {
  details: {
    missing: "Brak informacji",
    planned: "W drodze",
    available: "Dostępne"
  },
  edit: {
    missing: "Brak",
    planned: "W drodze",
    available: "Dostępne"
  }
};

export function normalizeUtilityStatus(rawValue) {
  if (rawValue && typeof rawValue === "object" && "status" in rawValue) {
    rawValue = rawValue.status;
  }
  if (typeof rawValue === "boolean") {
    return rawValue ? "available" : "missing";
  }
  if (typeof rawValue === "number") {
    if (rawValue <= 0) return "missing";
    if (rawValue === 1) return "available";
    if (rawValue === 2) return "planned";
    return "available";
  }
  if (typeof rawValue === "string") {
    const value = rawValue.trim().toLowerCase();
    if (!value) {
      return "missing";
    }
    for (const [key, synonyms] of Object.entries(UTILITY_SYNONYMS)) {
      if (synonyms.some(entry => entry.toLowerCase() === value)) {
        return key;
      }
    }
    if (value.includes("drogi") || value.includes("trakcie") || value.includes("plan")) {
      return "planned";
    }
    if (value.includes("dost")) {
      return "available";
    }
    if (value.includes("brak")) {
      return "missing";
    }
  }
  return "missing";
}

export function getUtilityLabel(status, variant = "details") {
  const labels = UTILITY_LABELS[variant] || UTILITY_LABELS.details;
  return labels[status] || labels.missing;
}

let googleMapsPromise = null;

export function loadGoogleMaps() {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsPromise) {
    return googleMapsPromise;
  }
  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey = localStorage.getItem("googleMapsApiKey") || "AIzaSyCr5TmFxnT3enxmyr6vujF8leP995giw8I";
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__initPropertyMap`;
    script.async = true;
    script.defer = true;
    window.__initPropertyMap = () => {
      resolve(window.google.maps);
      delete window.__initPropertyMap;
    };
    script.onerror = (event) => {
      reject(event);
      googleMapsPromise = null;
      delete window.__initPropertyMap;
    };
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

const TOAST_ICONS = {
  success: "✓",
  info: "ℹ",
  warning: "!",
  error: "✕"
};

export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-lite toast-${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
    <div class="toast-msg">${message}</div>
    <button class="toast-close" aria-label="Zamknij">&times;</button>
  `;

  const closeToast = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 180);
  };

  toast.querySelector(".toast-close")?.addEventListener("click", closeToast);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  const hideTimeout = setTimeout(closeToast, 4000);
  toast.addEventListener("mouseenter", () => clearTimeout(hideTimeout), { once: true });
}

export function textContentOrFallback(value, fallback = "—") {
  if (value === null || value === undefined) {
    return fallback;
  }
  const text = String(value).trim();
  return text ? text : fallback;
}

export function sanitizeMultilineText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

const ALLOWED_RICH_TEXT_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'u',
  'ul',
  'br'
]);

const ALLOWED_RICH_TEXT_CLASS_PREFIXES = ['rt-align-', 'rt-size-'];
const RICH_TEXT_FONT_SIZE_UNITS = ['px', 'em', 'rem', '%'];

export function normalizeRichTextFontSize(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  const compact = trimmed.replace(/\s+/g, '').replace(/,/g, '.');
  if (!compact) {
    return null;
  }
  const numericOnlyMatch = compact.match(/^\d*(?:\.\d+)?$/);
  if (numericOnlyMatch) {
    const numeric = Number.parseFloat(numericOnlyMatch[0]);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return `${numeric}px`;
  }
  const sizedMatch = compact.match(/^(\d*(?:\.\d+)?)(px|em|rem|%)$/i);
  if (!sizedMatch) {
    return null;
  }
  const numeric = Number.parseFloat(sizedMatch[1]);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const unit = sizedMatch[2].toLowerCase();
  if (!RICH_TEXT_FONT_SIZE_UNITS.includes(unit)) {
    return null;
  }
  return `${numeric}${unit}`;
}

const ALLOWED_RICH_TEXT_ATTRIBUTES = {
  a: {
    href: sanitizeRichTextHref,
    target: sanitizeRichTextTarget
  }
};

function sanitizeRichTextHref(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('#')) {
    return trimmed;
  }
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^\//.test(trimmed) || /^\.\.\//.test(trimmed) || /^\.\//.test(trimmed)) {
    return trimmed;
  }
  if (!trimmed.includes(':') && !/^\/\//.test(trimmed) && !/\s/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function sanitizeRichTextTarget(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim().toLowerCase();
  return trimmed === '_blank' ? '_blank' : null;
}

function sanitizeRichTextElement(root) {
  const nodes = Array.from(root.childNodes);
  nodes.forEach((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_RICH_TEXT_TAGS.has(tag)) {
      sanitizeRichTextElement(node);
      while (node.firstChild) {
        root.insertBefore(node.firstChild, node);
      }
      node.remove();
      return;
    }

    Array.from(node.attributes).forEach(attr => {
      if (attr.name === 'class') {
        const classes = attr.value
          .split(/\s+/)
          .filter(Boolean)
          .filter(cls => ALLOWED_RICH_TEXT_CLASS_PREFIXES.some(prefix => cls.startsWith(prefix)));
        if (classes.length > 0) {
          node.setAttribute('class', Array.from(new Set(classes)).join(' '));
        } else {
          node.removeAttribute('class');
        }
        return;
      }

      if (attr.name === 'style') {
        const sanitizedStyle = attr.value
          .split(';')
          .map(part => part.trim())
          .filter(Boolean)
          .map(part => {
            const [property, ...valueParts] = part.split(':');
            if (!property || valueParts.length === 0) {
              return null;
            }
            const name = property.trim().toLowerCase();
            const value = valueParts.join(':').trim();
            if (name !== 'font-size') {
              return null;
            }
            const normalized = normalizeRichTextFontSize(value);
            return normalized ? `font-size: ${normalized}` : null;
          })
          .filter(Boolean);
        if (sanitizedStyle.length > 0) {
          node.setAttribute('style', Array.from(new Set(sanitizedStyle)).join('; '));
        } else {
          node.removeAttribute('style');
        }
        return;
      }

      const allowedForTag = ALLOWED_RICH_TEXT_ATTRIBUTES[tag];
      if (allowedForTag && Object.prototype.hasOwnProperty.call(allowedForTag, attr.name)) {
        const sanitizer = allowedForTag[attr.name];
        const sanitizedValue = sanitizer(attr.value);
        if (sanitizedValue) {
          node.setAttribute(attr.name, sanitizedValue);
        } else {
          node.removeAttribute(attr.name);
        }
        return;
      }

      node.removeAttribute(attr.name);
    });

    if (tag === 'a') {
      if (!node.hasAttribute('href')) {
        sanitizeRichTextElement(node);
        while (node.firstChild) {
          root.insertBefore(node.firstChild, node);
        }
        node.remove();
        return;
      }
      if (node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
      } else {
        node.removeAttribute('rel');
      }
    }

    sanitizeRichTextElement(node);
  });
}

export function sanitizeRichText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const container = document.createElement('div');
  container.innerHTML = String(value);
  sanitizeRichTextElement(container);
  return container.innerHTML;
}

export function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

export function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value].filter(Boolean);
}

export function stripHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = value;
  return tmp.textContent || tmp.innerText || "";
}

export function richTextToPlainText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return stripHtml(sanitizeRichText(value));
}

export function syncMobileMenu() {
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navMenu = document.querySelector('.nav-menu');
  const mobileAuth = document.getElementById('mobileAuth');

  mobileMenuBtn?.addEventListener('click', () => {
    navMenu?.classList.toggle('active');
    if (mobileAuth) {
      mobileAuth.style.display = navMenu.classList.contains('active') ? 'flex' : 'none';
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      navMenu?.classList.remove('active');
      if (mobileAuth) {
        mobileAuth.style.display = 'none';
      }
    }
  });
}

