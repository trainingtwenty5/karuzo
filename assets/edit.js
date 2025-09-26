import {
  initFirebase,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  onAuthStateChanged,
  parseQueryParams,
  formatNumber,
  formatCurrency,
  formatArea,
  formatDateTime,
  normalizeUtilityStatus,
  getUtilityLabel,
  UTILITY_ORDER,
  loadGoogleMaps,
  showToast,
  textContentOrFallback,
  sanitizeMultilineText,
  sanitizeRichText,
  ensureArray,
  parseNumberFromText,
  cloneDeep,
  stripHtml,
  richTextToPlainText,
  syncMobileMenu
} from './property-common.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

if (window.hljs && typeof window.hljs.configure === 'function') {
  window.hljs.configure({ ignoreUnescapedHTML: true });
}

const state = {
  user: null,
  offerId: '',
  plotIndex: 0,
  offerData: null,
  plotData: null,
  utilities: {},
  tags: [],
  tagSuggestions: [],
  tagSuggestionsLoaded: false,
  loadingTagSuggestions: false,
  price: null,
  area: null,
  saving: false,
  planBadges: null,
  map: null,
  marker: null,
  polygon: null,
  mapImages: {},
  currentMapMode: 'base',
  hasLoaded: false,
  isLightboxOpen: false,
  lightboxReturnFocus: null,
  lightboxZoom: 1,
  lightboxBaseWidth: 0,
  lightboxBaseHeight: 0
};

const EMPTY_FIELD_PLACEHOLDER = 'Pole do wypełnienia';

const RICH_TEXT_FIELD_IDS = ['locationAccess', 'planNotes', 'descriptionText'];
const RICH_TEXT_ALIGN_CLASSES = ['rt-align-left', 'rt-align-center', 'rt-align-right', 'rt-align-justify'];
const RICH_TEXT_SIZE_CLASSES = ['rt-size-small', 'rt-size-normal', 'rt-size-large'];
const RICH_TEXT_SELECTIONS = new WeakMap();
let htmlInsertDialog = null;

const elements = {
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  propertyContent: document.getElementById('propertyContent'),
  saveChangesBtn: document.getElementById('saveChangesBtn'),
  propertyTitle: document.getElementById('propertyTitle'),
  propertyLocation: document.getElementById('propertyLocation'),
  propertyArea: document.getElementById('propertyArea'),
  propertyTypeSelect: document.getElementById('propertyTypeSelect'),
  ownershipFormSelect: document.getElementById('ownershipFormSelect'),
  priceValueText: document.getElementById('priceValueText'),
  pricePerSqm: document.getElementById('pricePerSqm'),
  priceUpdatedAt: document.getElementById('priceUpdatedAt'),
  plotNumber: document.getElementById('plotNumber'),
  landRegister: document.getElementById('landRegister'),
  plotAreaStat: document.getElementById('plotAreaStat'),
  plotOwnershipSelect: document.getElementById('plotOwnershipSelect'),
  locationAddress: document.getElementById('locationAddress'),
  locationAccess: document.getElementById('locationAccess'),
  planBadges: document.getElementById('planBadges'),
  planDesignation: document.getElementById('planDesignation'),
  planHeight: document.getElementById('planHeight'),
  planIntensity: document.getElementById('planIntensity'),
  planGreen: document.getElementById('planGreen'),
  planNotes: document.getElementById('planNotes'),
  utilitiesGrid: document.getElementById('utilitiesGrid'),
  descriptionText: document.getElementById('descriptionText'),
  tagsList: document.getElementById('tagsList'),
  tagsEmpty: document.getElementById('tagsEmpty'),
  tagInput: document.getElementById('tagInput'),
  addTagBtn: document.getElementById('addTagBtn'),
  tagSuggestionsWrapper: document.getElementById('tagSuggestionsWrapper'),
  tagSuggestionsList: document.getElementById('tagSuggestionsList'),
  contactName: document.getElementById('contactName'),
  contactPhoneLink: document.getElementById('contactPhoneLink'),
  contactEmailLink: document.getElementById('contactEmailLink'),
  mapElement: document.getElementById('propertyMap'),
  mapImageContainer: document.getElementById('mapImageContainer'),
  mapImageElement: document.getElementById('mapImage'),
  mapImagePlaceholder: document.getElementById('mapImagePlaceholder'),
  mapModeButtons: Array.from(document.querySelectorAll('.map-mode-btn')),
  mapImageLightbox: document.getElementById('mapImageLightbox'),
  mapImageLightboxPicture: document.getElementById('mapImageLightboxPicture'),
  mapImageLightboxClose: document.getElementById('mapImageLightboxClose'),
  mapImageLightboxZoomIn: document.getElementById('mapImageLightboxZoomIn'),
  mapImageLightboxZoomOut: document.getElementById('mapImageLightboxZoomOut'),
  authButtons: document.getElementById('authButtons'),
  userMenu: document.getElementById('userMenu'),
  loginBtn: document.getElementById('loginBtn'),
  registerBtn: document.getElementById('registerBtn'),
  accountBtn: document.getElementById('accountBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  mobileAuth: document.getElementById('mobileAuth'),
  loginModal: document.getElementById('loginModal'),
  registerModal: document.getElementById('registerModal'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  switchToRegister: document.getElementById('switchToRegister'),
  switchToLogin: document.getElementById('switchToLogin'),
  modalCloseButtons: Array.from(document.querySelectorAll('.modal-close')),
  googleRegisterBtn: document.getElementById('googleLoginBtn'),
  googleLoginBtn: document.getElementById('googleLoginBtnLogin')
};

htmlInsertDialog = createHtmlInsertDialog();

elements.mapImageElement?.addEventListener('error', handleMapImageError);
elements.mapImageElement?.addEventListener('click', handleMapImageClick);
elements.mapImageElement?.addEventListener('keydown', handleMapImageKeydown);
elements.mapImageLightboxClose?.addEventListener('click', closeMapImageLightbox);
elements.mapImageLightbox?.addEventListener('click', handleLightboxBackdropClick);
elements.mapImageLightboxZoomIn?.addEventListener('click', handleLightboxZoomIn);
elements.mapImageLightboxZoomOut?.addEventListener('click', handleLightboxZoomOut);
document.addEventListener('keydown', handleLightboxKeydown);

updateZoomButtonsState();

const MAP_MODE_DEFAULT = 'base';

const LIGHTBOX_ZOOM_DEFAULT = 1;
const LIGHTBOX_ZOOM_MIN = 0.5;
const LIGHTBOX_ZOOM_MAX = 3;
const LIGHTBOX_ZOOM_STEP = 0.25;

const MAP_MODES = {
  base: { type: 'map', mapType: 'hybrid' },
  lokalizacja: { type: 'image', key: 'lokalizacja' },
  media: { type: 'image', key: 'media' },
  teren: { type: 'image', key: 'teren' },
  mpzp: { type: 'image', key: 'mpzp' },
  mpzpskan: { type: 'image', key: 'mpzpskan' },
  studium: { type: 'image', key: 'studium' },
  uzytkigruntowe: { type: 'image', key: 'uzytkigruntowe' }
};

const MAP_LAYER_BASE_URLS = {
  lokalizacja: 'https://grunteo.s3.eu-west-3.amazonaws.com/Orto_Esri%2BGrunty/MARGE_Orto_Esri%2BGrunty',
  media: 'https://grunteo.s3.eu-west-3.amazonaws.com/Cyclosm_Esri%2BGESUT/MARGE_Cyclosm_Esri%2BGESUT',
  teren: 'https://grunteo.s3.eu-west-3.amazonaws.com/GRID%2BGrunty/MARGE_GRID%2BGrunty',
  mpzp: 'https://grunteo.s3.eu-west-3.amazonaws.com/MPZP%2BGrunty/MARGE_MPZP%2BGrunty',
  mpzpskan: 'https://grunteo.s3.eu-west-3.amazonaws.com/MPZP_rastrowe%2BGrunty/MARGE_MPZP_rastrowe%2BGrunty',
  studium: 'https://grunteo.s3.eu-west-3.amazonaws.com/Studium%2BGrunty/MARGE_Studium%2BGrunty',
  uzytkigruntowe: 'https://grunteo.s3.eu-west-3.amazonaws.com/Uzytki%2BGrunty/MARGE_Uzytki%2BGrunty'
};

const MAP_LAYER_ALIASES = {
  lokalizacja: ['lokalizacja', 'location', 'localization', 'orto', 'orthophoto', 'aerial'],
  media: ['media', 'uzbrojenie', 'utilities', 'gesut', 'cyclosm'],
  teren: ['teren', 'terrain', 'grid', 'ground', 'siatka'],
  mpzp: ['mpzp', 'plan', 'zoning', 'miejscowyplan'],
  mpzpskan: ['mpzpskan', 'mpzpraster', 'mpzprastrowe', 'mpzpscan', 'planraster', 'planrasterowy', 'planzdjecie', 'skanmpzp', 'skanplanu'],
  studium: ['studium', 'study', 'uwarunkowania', 'kierunki'],
  uzytkigruntowe: ['uzytkigruntowe', 'uzytki', 'uzytkirolne', 'landuse', 'landusage', 'pokryciegruntu']
};

const TAG_SUGGESTION_LIMIT = 18;

function pickValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }
    return value;
  }
  return null;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return value;
  return Math.min(Math.max(value, min), max);
}

function formatPerSqm(price, area) {
  if (!Number.isFinite(price) || !Number.isFinite(area) || area <= 0) {
    return EMPTY_FIELD_PLACEHOLDER;
  }
  const ppm = Math.round(price / area);
  const formatted = formatNumber(ppm);
  return formatted ? `${formatted} zł/m²` : EMPTY_FIELD_PLACEHOLDER;
}

function formatPrice(value) {
  const formatted = formatCurrency(value);
  return formatted ? `${formatted}` : EMPTY_FIELD_PLACEHOLDER;
}

function formatAreaText(value) {
  const formatted = formatArea(value);
  return formatted ? formatted : EMPTY_FIELD_PLACEHOLDER;
}

function applyPlaceholder(element, value) {
  if (!element) return;
  const text = textContentOrFallback(value, '');
  element.textContent = text || EMPTY_FIELD_PLACEHOLDER;
}

function applyMultilinePlaceholder(element, value) {
  if (!element) return;
  const sanitized = sanitizeMultilineText(value || '');
  const trimmed = sanitized.trim();
  element.textContent = trimmed ? sanitized : EMPTY_FIELD_PLACEHOLDER;
}

function normalizePlaceholderValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text.toLowerCase() === EMPTY_FIELD_PLACEHOLDER.toLowerCase() ? '' : text;
}

function normalizeMultilineValue(value) {
  const sanitized = sanitizeMultilineText(value || '');
  const trimmed = sanitized.trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase() === EMPTY_FIELD_PLACEHOLDER.toLowerCase() ? '' : sanitized;
}

function applyRichTextPlaceholder(element, value) {
  if (!element) return;
  const sanitized = sanitizeRichText(value || '');
  const plain = richTextToPlainText(sanitized).trim();
  if (plain) {
    element.innerHTML = sanitized;
    normalizeRichTextStructure(element);
    element.dataset.placeholderActive = 'false';
  } else {
    element.textContent = EMPTY_FIELD_PLACEHOLDER;
    element.dataset.placeholderActive = 'true';
  }
}

function clearRichTextPlaceholder(element) {
  if (!element) return;
  if (element.dataset.placeholderActive === 'true') {
    element.innerHTML = '';
    element.dataset.placeholderActive = 'false';
  }
}

function normalizeRichTextStructure(element) {
  if (!element || element.dataset.placeholderActive === 'true') {
    return;
  }

  const nodes = Array.from(element.childNodes);
  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent.trim()) {
        node.remove();
        return;
      }
      if (node.parentNode === element) {
        const block = document.createElement('p');
        element.insertBefore(block, node);
        block.appendChild(node);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    const tag = node.tagName.toLowerCase();
    if (tag === 'br') {
      const wrapper = document.createElement('p');
      element.insertBefore(wrapper, node);
      wrapper.appendChild(node);
      return;
    }

    if (isRichTextBlock(node)) {
      return;
    }

    const wrapper = document.createElement('p');
    element.insertBefore(wrapper, node);
    wrapper.appendChild(node);
  });

  if (!element.childNodes.length) {
    const block = document.createElement('p');
    block.appendChild(document.createElement('br'));
    element.appendChild(block);
  }
}

function commitRichTextValue(element, options = {}) {
  if (!element) return;

  const { restoreRange = null } = options;
  const rangeToRestore = restoreRange ? restoreRange.cloneRange() : null;

  normalizeRichTextStructure(element);
  const currentHtml = element.innerHTML || '';
  const sanitized = sanitizeRichText(currentHtml);
  const plain = richTextToPlainText(sanitized).trim();
  if (plain) {
    if (currentHtml !== sanitized) {
      element.innerHTML = sanitized;
    }
    element.dataset.placeholderActive = 'false';
  } else {
    element.textContent = EMPTY_FIELD_PLACEHOLDER;
    element.dataset.placeholderActive = 'true';
  }

  if (rangeToRestore) {
    const schedule = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb) => setTimeout(cb, 0);
    schedule(() => {
      const ancestor = rangeToRestore.commonAncestorContainer;
      if (ancestor && element.contains(ancestor)) {
        restoreSelectionRange(rangeToRestore);
      } else {
        selectAllText(element);
      }
      rememberRichTextSelection(element);
    });
  }
}

function normalizeRichTextValue(value) {
  const sanitized = sanitizeRichText(value || '');
  const plain = richTextToPlainText(sanitized).trim();
  return plain ? sanitized : '';
}

function getRichTextContent(element) {
  if (!element || element.dataset.placeholderActive === 'true') {
    return '';
  }
  normalizeRichTextStructure(element);
  const sanitized = sanitizeRichText(element.innerHTML || '');
  const plain = richTextToPlainText(sanitized).trim();
  if (!plain) {
    element.textContent = EMPTY_FIELD_PLACEHOLDER;
    element.dataset.placeholderActive = 'true';
    return '';
  }
  element.innerHTML = sanitized;
  return sanitized;
}

function extractPlotNumberSegment(value) {
  if (value === undefined || value === null) return value;
  const str = String(value).trim();
  if (!str) return '';
  const lastDotIndex = str.lastIndexOf('.');
  if (lastDotIndex === -1) return str;
  const segment = str.slice(lastDotIndex + 1).trim();
  return segment || str;
}

function normalizeLayerKey(key) {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveImageUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return trimmed;
    }
    try {
      const url = new URL(trimmed, window.location.origin);
      return url.toString();
    } catch (error) {
      return '';
    }
  }
  if (typeof value === 'object' && value?.url) {
    return resolveImageUrl(value.url);
  }
  return '';
}

function matchLayerKey(value) {
  const normalized = normalizeLayerKey(value);
  if (!normalized) return '';
  if (MAP_LAYER_ALIASES[normalized]) return normalized;
  for (const [target, aliases] of Object.entries(MAP_LAYER_ALIASES)) {
    if (normalized === target) return target;
    for (const alias of aliases) {
      if (normalized === alias || normalized.includes(alias) || alias.includes(normalized)) {
        return target;
      }
    }
  }
  return '';
}

function extractLayerImages(source) {
  const result = {};
  if (!source) return result;
  if (Array.isArray(source)) {
    source.forEach(item => Object.assign(result, extractLayerImages(item)));
    return result;
  }
  if (typeof source !== 'object') return result;
  const candidateKey = source.key ?? source.type ?? source.layer ?? source.name ?? source.label;
  const candidateUrl = source.url ?? source.href ?? source.src ?? source.value ?? source.link;
  const matchedKey = matchLayerKey(candidateKey);
  const resolvedUrl = resolveImageUrl(candidateUrl);
  if (matchedKey && resolvedUrl) {
    result[matchedKey] = resolvedUrl;
  }
  Object.entries(source).forEach(([key, value]) => {
    const layerKey = matchLayerKey(key);
    if (!layerKey) return;
    const url = resolveImageUrl(value);
    if (url) {
      result[layerKey] = url;
    }
  });
  return result;
}

function collectMapImages(plot = {}, offer = {}, plotIndex = 0, fallbackId = '') {
  const sources = [
    plot.mapImages,
    plot.mapTiles,
    plot.mapLayers,
    plot.planImages,
    plot.planTiles,
    plot.mapPreviews,
    plot.mapGallery,
    offer.mapImages,
    offer.mapTiles,
    offer.mapLayers,
    offer.planImages,
    offer.planTiles,
    offer.mapPreviews,
    offer.mapGallery
  ];
  const result = {};
  sources.forEach(source => Object.assign(result, extractLayerImages(source)));

  const directFields = {
    lokalizacja: [
      plot.mapLokalizacja,
      plot.lokalizacjaMap,
      plot.mapLocation,
      plot.locationMap,
      offer.mapLokalizacja,
      offer.lokalizacjaMap,
      offer.mapLocation,
      offer.locationMap
    ],
    media: [
      plot.mapMedia,
      plot.mediaMap,
      plot.mapUzbrojenie,
      plot.mapGesut,
      offer.mapMedia,
      offer.mediaMap,
      offer.mapUzbrojenie,
      offer.mapGesut
    ],
    teren: [
      plot.mapTeren,
      plot.terrainMap,
      plot.mapGrid,
      plot.gridMap,
      offer.mapTeren,
      offer.terrainMap,
      offer.mapGrid,
      offer.gridMap
    ],
    mpzp: [
      plot.mapMpzp,
      plot.mapMPZP,
      plot.mpzpMap,
      plot.planMap,
      offer.mapMpzp,
      offer.mapMPZP,
      offer.mpzpMap,
      offer.planMap
    ],
    mpzpskan: [
      plot.mapMpzpSkan,
      plot.mapMpzpScan,
      plot.mapMpzpRaster,
      plot.mapMpzpRastrowe,
      plot.mapMPZPSkan,
      plot.mapMPZPScan,
      plot.mapMPZPRaster,
      plot.mpzpSkan,
      plot.mpzpScan,
      plot.mpzpRaster,
      plot.planRaster,
      plot.planScan,
      plot.planSkan,
      offer.mapMpzpSkan,
      offer.mapMpzpScan,
      offer.mapMpzpRaster,
      offer.mapMpzpRastrowe,
      offer.mapMPZPSkan,
      offer.mapMPZPScan,
      offer.mapMPZPRaster,
      offer.mpzpSkan,
      offer.mpzpScan,
      offer.mpzpRaster,
      offer.planRaster,
      offer.planScan,
      offer.planSkan
    ],
    studium: [
      plot.mapStudium,
      plot.studiumMap,
      offer.mapStudium,
      offer.studiumMap
    ],
    uzytkigruntowe: [
      plot.mapUzytki,
      plot.mapUzytkiGruntowe,
      plot.mapUzytkiGruntu,
      plot.mapUzytkiRolne,
      plot.uzytkiMap,
      plot.uzytkiGruntoweMap,
      plot.mapLandUse,
      plot.landUseMap,
      plot.landuseMap,
      plot.mapLandcover,
      offer.mapUzytki,
      offer.mapUzytkiGruntowe,
      offer.mapUzytkiGruntu,
      offer.mapUzytkiRolne,
      offer.uzytkiMap,
      offer.uzytkiGruntoweMap,
      offer.mapLandUse,
      offer.landUseMap,
      offer.landuseMap,
      offer.mapLandcover
    ]
  };

  Object.entries(directFields).forEach(([key, values]) => {
    if (result[key]) return;
    for (const value of values) {
      const url = resolveImageUrl(value);
      if (url) {
        result[key] = url;
        break;
      }
    }
  });

  const candidateIds = [
    typeof fallbackId === 'string' ? fallbackId.trim() : fallbackId,
    plot.mapImageId,
    plot.mapId,
    plot.imageId,
    plot.imagesId,
    plot.plotId,
    plot.Id,
    plot.id,
    offer.mapImageId,
    offer.mapId,
    offer.plotId,
    offer.Id,
    offer.id
  ];

  const trimmedId = candidateIds
    .map(value => {
      if (value === undefined || value === null) return '';
      const text = typeof value === 'string' ? value : String(value);
      return text.trim();
    })
    .find(value => value && /^[A-Za-z0-9_-]+$/.test(value)) || '';
  const indexNumber = Number.isFinite(plotIndex) && plotIndex >= 0 ? plotIndex : 0;
  const indexSuffix = `_${String(indexNumber).padStart(3, '0')}`;

  if (trimmedId) {
    const expectedSuffix = `_${trimmedId}${indexSuffix}.png`;
    Object.entries(MAP_LAYER_BASE_URLS).forEach(([key, baseUrl]) => {
      const expectedUrl = `${baseUrl}${expectedSuffix}`;
      const currentUrl = typeof result[key] === 'string' ? result[key].trim() : '';
      if (!currentUrl) {
        result[key] = expectedUrl;
        return;
      }
      const normalizedCurrent = currentUrl.split('?')[0];
      if (!normalizedCurrent.endsWith(expectedSuffix)) {
        result[key] = expectedUrl;
      }
    });
  }

  return result;
}

function setPriceEdit(price) {
  state.price = Number.isFinite(price) ? price : null;
  elements.priceValueText.textContent = formatPrice(state.price);
  updatePricePerSqm();
}

let updatingArea = false;
function setAreaEdit(area) {
  state.area = Number.isFinite(area) ? area : null;
  updateAreaDisplay();
  updatePricePerSqm();
}

function updateAreaDisplay() {
  const text = formatAreaText(state.area);
  updatingArea = true;
  elements.propertyArea.textContent = text;
  elements.plotAreaStat.textContent = text;
  updatingArea = false;
}

function updatePricePerSqm() {
  elements.pricePerSqm.textContent = formatPerSqm(state.price, state.area);
}

function renderPriceUpdatedAt(value) {
  const formatted = formatDateTime(value);
  elements.priceUpdatedAt.textContent = formatted
    ? `Aktualizacja: ${formatted}`
    : `Aktualizacja: ${EMPTY_FIELD_PLACEHOLDER}`;
}

function ensureSelectOption(select, value) {
  if (!select) return;
  const text = typeof value === 'string' ? value.trim() : value;
  if (!text) return;
  const normalized = String(text);
  const exists = Array.from(select.options).some(option => option.value === normalized);
  if (!exists) {
    const option = new Option(normalized, normalized);
    option.dataset.dynamic = 'true';
    select.add(option);
  }
}

function setSelectValue(select, value, fallback = '') {
  if (!select) return;
  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (trimmed) {
    const normalized = String(trimmed);
    ensureSelectOption(select, normalized);
    select.value = normalized;
  } else if (fallback) {
    ensureSelectOption(select, fallback);
    select.value = fallback;
  } else {
    select.value = '';
  }
}

function normalizeOwnershipForm(value) {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (/użytkowanie/i.test(text)) {
    return 'Użytkowanie wieczyste';
  }
  if (/prywatn/i.test(text)) {
    return 'Własność';
  }
  if (/własno/i.test(text)) {
    return 'Własność';
  }
  return text;
}

function deriveStatusFromOwnership(ownershipForm) {
  if (!ownershipForm) return '';
  if (/użytkowanie/i.test(ownershipForm)) {
    return 'Użytkowanie wieczyste';
  }
  if (/zarząd/i.test(ownershipForm)) {
    return 'Zarząd';
  }
  return 'Własność (pełna)';
}

function formatPhoneNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 9) {
    const core = digits.slice(-9);
    return `+48 ${core.slice(0,3)}-${core.slice(3,6)}-${core.slice(6)}`;
  }
  return digits;
}

function updateContactPhoneHref() {
  if (!elements.contactPhoneLink) return;
  const raw = stripHtml(elements.contactPhoneLink.innerHTML).trim();
  const digits = raw.replace(/\D/g, '');
  elements.contactPhoneLink.href = digits ? `tel:${digits}` : '#';
}

function updateContactEmailHref() {
  if (!elements.contactEmailLink) return;
  const raw = stripHtml(elements.contactEmailLink.innerHTML).trim();
  elements.contactEmailLink.href = raw ? `mailto:${raw}` : '#';
}

function renderPlanBadges(badges) {
  if (!elements.planBadges) return;
  elements.planBadges.innerHTML = '';
  const list = ensureArray(badges)
    .map(item => typeof item === 'string' ? item.trim() : item?.label)
    .filter(Boolean);
  if (!list.length) {
    const chip = document.createElement('span');
    chip.className = 'plan-badge';
    chip.textContent = 'Brak oznaczeń';
    elements.planBadges.appendChild(chip);
    return;
  }
  list.forEach(text => {
    const chip = document.createElement('span');
    chip.className = 'plan-badge';
    chip.textContent = text;
    elements.planBadges.appendChild(chip);
  });
}

function mergeUtilities(dataUtilities, plotUtilities) {
  const base = {};
  const assign = (source) => {
    if (!source) return;
    if (Array.isArray(source)) {
      source.forEach(item => {
        if (typeof item === 'string') {
          base[item] = 'available';
        } else if (item && typeof item === 'object' && item.type) {
          base[item.type] = item.status || item.value || item.available;
        }
      });
      return;
    }
    Object.entries(source).forEach(([key, value]) => {
      base[key] = value;
    });
  };
  assign(dataUtilities);
  assign(plotUtilities);
  return base;
}

function renderUtilitiesEdit() {
  if (!elements.utilitiesGrid) return;
  const cards = Array.from(elements.utilitiesGrid.querySelectorAll('.utility-card'));
  cards.forEach(card => {
    const key = card.dataset.utility;
    const status = normalizeUtilityStatus(state.utilities[key]);
    state.utilities[key] = status;
    card.dataset.status = status;
    const label = card.querySelector('.utility-status');
    if (label) {
      label.textContent = getUtilityLabel(status, 'edit');
    }
  });
}

function renderTagSuggestions() {
  if (!elements.tagSuggestionsList) return;

  const listElement = elements.tagSuggestionsList;
  listElement.innerHTML = '';

  const selected = new Set(state.tags.map(tag => tag.toLowerCase()));
  const available = Array.isArray(state.tagSuggestions)
    ? state.tagSuggestions.filter(tag => !selected.has(tag.toLowerCase()))
    : [];

  if (!available.length) {
    if (elements.tagSuggestionsWrapper) {
      elements.tagSuggestionsWrapper.hidden = true;
    }
    return;
  }

  const limit = TAG_SUGGESTION_LIMIT > 0 ? TAG_SUGGESTION_LIMIT : available.length;
  available.slice(0, limit).forEach(tag => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-chip tag-chip--suggestion';
    button.textContent = tag;
    button.dataset.tag = tag;
    button.setAttribute('aria-label', `Dodaj znacznik ${tag}`);
    listElement.appendChild(button);
  });

  if (elements.tagSuggestionsWrapper) {
    elements.tagSuggestionsWrapper.hidden = false;
  }
}

function renderTagsEdit() {
  if (!elements.tagsList || !elements.tagsEmpty) return;
  elements.tagsList.innerHTML = '';
  if (!state.tags.length) {
    elements.tagsEmpty.hidden = false;
    renderTagSuggestions();
    return;
  }
  elements.tagsEmpty.hidden = true;
  state.tags.forEach((tag, index) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip removable';
    chip.innerHTML = `<span>${tag}</span><button type="button" class="tag-remove" data-index="${index}" aria-label="Usuń znacznik">&times;</button>`;
    elements.tagsList.appendChild(chip);
  });
  renderTagSuggestions();
}

function showContent() {
  elements.loadingState?.classList.add('hidden');
  elements.errorState?.classList.add('hidden');
  elements.propertyContent?.classList.remove('hidden');
}

function showError(message) {
  elements.loadingState?.classList.add('hidden');
  if (elements.errorState) {
    elements.errorState.textContent = message;
    elements.errorState.classList.remove('hidden');
  }
  elements.propertyContent?.classList.add('hidden');
}

function redirectToDetails() {
  const url = `details.html?id=${encodeURIComponent(state.offerId)}&plot=${state.plotIndex}`;
  window.location.replace(url);
}

function selectAllText(element) {
  if (!element) return;
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function cloneSelectionRange(root) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!root || !root.contains(range.commonAncestorContainer)) {
    return null;
  }
  return range.cloneRange();
}

function restoreSelectionRange(range) {
  if (!range) return;
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function rememberRichTextSelection(area) {
  if (!area) return;
  const range = cloneSelectionRange(area);
  if (range) {
    RICH_TEXT_SELECTIONS.set(area, range);
  }
}

function getStoredRichTextSelection(area) {
  const range = area ? RICH_TEXT_SELECTIONS.get(area) : null;
  return range ? range.cloneRange() : null;
}

function getRangeHtml(range) {
  if (!range) return '';
  const fragment = range.cloneContents();
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

function createHtmlInsertDialog() {
  const modal = document.getElementById('htmlInsertModal');
  if (!modal) return null;

  const textarea = modal.querySelector('#htmlInsertTextarea');
  const preview = modal.querySelector('#htmlInsertPreview');
  const previewWrapper = modal.querySelector('.html-insert-modal__preview');
  const render = modal.querySelector('#htmlInsertRender');
  const confirmBtn = modal.querySelector('[data-html-action="confirm"]');
  const cancelButtons = Array.from(modal.querySelectorAll('[data-html-action="cancel"]'));

  let resolver = null;
  let lastActiveElement = null;

  const resetPreviewClasses = () => {
    if (!preview) return;
    preview.className = 'html-insert-modal__code language-html';
  };

  const updatePreview = () => {
    if (!textarea) return;
    const rawValue = textarea.value || '';
    const sanitized = sanitizeRichText(rawValue);
    const hasContent = sanitized.trim().length > 0;

    if (previewWrapper) {
      previewWrapper.dataset.empty = hasContent ? 'false' : 'true';
    }

    if (preview) {
      resetPreviewClasses();
      preview.textContent = sanitized;
      if (window.hljs && typeof window.hljs.highlightElement === 'function') {
        window.hljs.highlightElement(preview);
      }
    }

    if (render) {
      render.innerHTML = sanitized;
      render.dataset.empty = hasContent ? 'false' : 'true';
    }
  };

  const handleModalKeydown = (event) => {
    if (!resolver) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog(null);
    }
  };

  const closeDialog = (result) => {
    if (!resolver) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('hidden', '');
    document.body.classList.remove('html-insert-modal-open');
    modal.removeEventListener('keydown', handleModalKeydown);

    const resolve = resolver;
    resolver = null;

    const returnFocus = lastActiveElement;
    lastActiveElement = null;

    if (textarea) {
      textarea.value = '';
    }
    updatePreview();

    if (returnFocus && typeof returnFocus.focus === 'function') {
      setTimeout(() => {
        returnFocus.focus();
      }, 0);
    }

    resolve(result);
  };

  const openDialog = (initialValue = '') => {
    if (!textarea) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      resolver = resolve;
      lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      modal.removeAttribute('hidden');
      modal.classList.add('is-visible');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('html-insert-modal-open');

      textarea.value = initialValue || '';
      updatePreview();

      modal.addEventListener('keydown', handleModalKeydown);

      requestAnimationFrame(() => {
        textarea.focus();
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      });
    });
  };

  textarea?.addEventListener('input', updatePreview);
  textarea?.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'enter') {
      event.preventDefault();
      closeDialog(textarea.value);
    }
  });

  confirmBtn?.addEventListener('click', () => closeDialog(textarea ? textarea.value : ''));
  cancelButtons.forEach((button) => {
    button.addEventListener('click', () => closeDialog(null));
  });

  modal.addEventListener('mousedown', (event) => {
    if (!resolver) return;
    if (event.target === modal) {
      closeDialog(null);
    }
  });

  return {
    open: openDialog
  };
}

function requestHtmlInsert(initialValue = '') {
  if (htmlInsertDialog && typeof htmlInsertDialog.open === 'function') {
    return htmlInsertDialog.open(initialValue);
  }
  const fallback = window.prompt('Wklej kod HTML do wstawienia', initialValue || '');
  return Promise.resolve(fallback === null ? null : fallback);
}

function placeCaretAtEnd(element) {
  if (!element) return;
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function isRichTextBlock(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const tag = node.tagName.toLowerCase();
  return tag === 'p'
    || tag === 'div'
    || tag === 'li'
    || tag === 'blockquote'
    || tag === 'pre'
    || tag === 'ul'
    || tag === 'ol';
}

function findClosestBlock(node, root) {
  let current = node;
  while (current && current !== root) {
    if (isRichTextBlock(current)) {
      return current;
    }
    current = current.parentNode;
  }
  if (root && root.nodeType === Node.ELEMENT_NODE && isRichTextBlock(root)) {
    return root;
  }
  return null;
}

function getSelectionBlocks(root) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return root ? [root] : [];
  }
  const range = selection.getRangeAt(0);
  if (!root || !root.contains(range.commonAncestorContainer)) {
    return [];
  }

  const blocks = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (!isRichTextBlock(node)) {
        return NodeFilter.FILTER_SKIP;
      }
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });

  while (walker.nextNode()) {
    blocks.add(walker.currentNode);
  }

  if (!blocks.size) {
    const block = findClosestBlock(range.startContainer, root);
    if (block) {
      blocks.add(block);
    }
  }

  if (!blocks.size && root) {
    blocks.add(root);
  }

  return Array.from(blocks);
}

function applyRichTextAlignment(area, value) {
  const blocks = getSelectionBlocks(area);
  const targetClass = value ? `rt-align-${value}` : '';
  blocks.forEach(block => {
    RICH_TEXT_ALIGN_CLASSES.forEach(cls => block.classList.remove(cls));
    if (targetClass) {
      block.classList.add(targetClass);
    }
  });
}

function applyRichTextFontSize(area, value) {
  const blocks = getSelectionBlocks(area);
  const targetClass = value && value !== 'normal' ? `rt-size-${value}` : '';
  blocks.forEach(block => {
    RICH_TEXT_SIZE_CLASSES.forEach(cls => block.classList.remove(cls));
    if (targetClass) {
      block.classList.add(targetClass);
    }
  });
}

function clearRichTextFormatting(area) {
  const blocks = getSelectionBlocks(area);
  blocks.forEach(block => {
    RICH_TEXT_ALIGN_CLASSES.forEach(cls => block.classList.remove(cls));
    RICH_TEXT_SIZE_CLASSES.forEach(cls => block.classList.remove(cls));
  });
}

function handleRichTextAction(area, action, value = '') {
  if (!area) return;
  clearRichTextPlaceholder(area);
  let range = cloneSelectionRange(area);
  if (!range) {
    range = getStoredRichTextSelection(area);
  }

  if (action === 'insertHtml') {
    const storedRange = range ? range.cloneRange() : null;
    const defaultValue = storedRange ? sanitizeRichText(getRangeHtml(storedRange)) : '';
    requestHtmlInsert(defaultValue).then((html) => {
      area.focus();
      const activeRange = storedRange ? storedRange.cloneRange() : null;
      if (html !== null) {
        const sanitized = sanitizeRichText(html);
        if (activeRange) {
          restoreSelectionRange(activeRange);
        } else {
          placeCaretAtEnd(area);
        }
        document.execCommand('insertHTML', false, sanitized);
        const selectionAfterInsert = cloneSelectionRange(area) || activeRange;
        commitRichTextValue(area, { restoreRange: selectionAfterInsert });
      } else {
        if (activeRange) {
          restoreSelectionRange(activeRange);
        } else {
          placeCaretAtEnd(area);
        }
        commitRichTextValue(area, { restoreRange: activeRange || null });
      }
    });
    return;
  }

  area.focus();
  if (range) {
    restoreSelectionRange(range);
  } else {
    placeCaretAtEnd(area);
  }

  if (action === 'align' || action === 'fontSize' || action === 'clear') {
    normalizeRichTextStructure(area);
    const normalizedRange = cloneSelectionRange(area);
    if (normalizedRange) {
      range = normalizedRange;
      restoreSelectionRange(range);
    }
  }

  if (action === 'bold' || action === 'italic' || action === 'underline') {
    document.execCommand(action);
  } else if (action === 'orderedList') {
    document.execCommand('insertOrderedList');
  } else if (action === 'unorderedList') {
    document.execCommand('insertUnorderedList');
  } else if (action === 'align') {
    applyRichTextAlignment(area, value || 'left');
  } else if (action === 'fontSize') {
    applyRichTextFontSize(area, value || 'normal');
  } else if (action === 'clear') {
    document.execCommand('removeFormat');
    clearRichTextFormatting(area);
  }

  const selectionAfterAction = cloneSelectionRange(area) || range;
  commitRichTextValue(area, { restoreRange: selectionAfterAction });
}

function setupRichTextEditors() {
  const editors = Array.from(document.querySelectorAll('.rich-text-editor'));
  editors.forEach(editor => {
    const targetId = editor.dataset.editorTarget;
    if (!targetId) return;
    const area = document.getElementById(targetId);
    if (!area) return;

    editor.querySelectorAll('.rich-text-btn[data-action]').forEach(button => {
      const action = button.dataset.action;
      button.addEventListener('mousedown', event => {
        event.preventDefault();
        area.focus();
        rememberRichTextSelection(area);
      });
      button.addEventListener('click', () => {
        handleRichTextAction(area, action, button.dataset.value || '');
      });
    });

    const sizeSelect = editor.querySelector('.rich-text-select[data-action="fontSize"]');
    if (sizeSelect) {
      sizeSelect.addEventListener('mousedown', () => {
        rememberRichTextSelection(area);
      });
      sizeSelect.addEventListener('change', (event) => {
        handleRichTextAction(area, 'fontSize', event.target.value || 'normal');
      });
    }
  });
}

function attachEditorListeners() {
  if (elements.priceValueText) {
    elements.priceValueText.addEventListener('focus', () => {
      if (state.price !== null) {
        elements.priceValueText.textContent = String(state.price);
        selectAllText(elements.priceValueText);
      } else {
        elements.priceValueText.textContent = '';
      }
    });
    elements.priceValueText.addEventListener('input', () => {
      const value = parseNumberFromText(elements.priceValueText.textContent);
      state.price = Number.isFinite(value) ? value : null;
      updatePricePerSqm();
    });
    elements.priceValueText.addEventListener('blur', () => {
      const value = parseNumberFromText(elements.priceValueText.textContent);
      state.price = Number.isFinite(value) ? value : null;
      elements.priceValueText.textContent = formatPrice(state.price);
      updatePricePerSqm();
    });
  }

  const handleAreaFocus = (element) => {
    element.addEventListener('focus', () => {
      if (state.area !== null) {
        element.textContent = String(state.area);
        selectAllText(element);
      } else {
        element.textContent = '';
      }
    });
  };

  const handleAreaBlur = (element) => {
    element.addEventListener('blur', () => {
      const value = parseNumberFromText(element.textContent);
      state.area = Number.isFinite(value) ? value : null;
      updateAreaDisplay();
      updatePricePerSqm();
    });
  };

  const handleAreaInput = (element) => {
    element.addEventListener('input', () => {
      if (updatingArea) return;
      const value = parseNumberFromText(element.textContent);
      state.area = Number.isFinite(value) ? value : null;
      updatePricePerSqm();
    });
  };

  [elements.propertyArea, elements.plotAreaStat].forEach(element => {
    if (!element || !element.isContentEditable) return;
    handleAreaFocus(element);
    handleAreaBlur(element);
    handleAreaInput(element);
  });

  [
    elements.propertyTitle,
    elements.propertyLocation,
    elements.plotNumber,
    elements.landRegister,
    elements.planDesignation,
    elements.planHeight,
    elements.planIntensity,
    elements.planGreen,
    elements.contactName,
    elements.contactPhoneLink,
    elements.contactEmailLink
  ].forEach(element => {
    if (!element || !element.isContentEditable) return;
    element.addEventListener('blur', () => {
      const text = stripHtml(element.innerHTML).trim();
      element.textContent = text;
      if (element === elements.contactPhoneLink) {
        updateContactPhoneHref();
      }
      if (element === elements.contactEmailLink) {
        updateContactEmailHref();
      }
    });
  });

  const richTextElements = RICH_TEXT_FIELD_IDS
    .map(id => elements[id])
    .filter(element => element && element.isContentEditable);

  richTextElements.forEach(element => {
    element.addEventListener('focus', () => {
      clearRichTextPlaceholder(element);
      normalizeRichTextStructure(element);
      rememberRichTextSelection(element);
    });
    element.addEventListener('blur', () => {
      commitRichTextValue(element);
      rememberRichTextSelection(element);
    });
    element.addEventListener('input', () => {
      element.dataset.placeholderActive = 'false';
      normalizeRichTextStructure(element);
      rememberRichTextSelection(element);
    });
    ['mouseup', 'keyup', 'touchend'].forEach(eventName => {
      element.addEventListener(eventName, () => {
        rememberRichTextSelection(element);
      });
    });
  });

  setupRichTextEditors();

  elements.plotOwnershipSelect?.addEventListener('change', () => {
    const value = elements.plotOwnershipSelect.value;
    if (!elements.ownershipFormSelect) return;
    if (/użytkowanie/i.test(value)) {
      setSelectValue(elements.ownershipFormSelect, 'Użytkowanie wieczyste', 'Użytkowanie wieczyste');
    } else if (value) {
      setSelectValue(elements.ownershipFormSelect, 'Własność', 'Własność');
    }
  });

  elements.ownershipFormSelect?.addEventListener('change', () => {
    if (!elements.plotOwnershipSelect) return;
    const ownershipValue = elements.ownershipFormSelect.value;
    const currentStatus = elements.plotOwnershipSelect.value;
    if (!currentStatus) {
      const derived = deriveStatusFromOwnership(ownershipValue);
      if (derived) {
        setSelectValue(elements.plotOwnershipSelect, derived, derived);
      }
      return;
    }
    if (ownershipValue === 'Użytkowanie wieczyste' && !/użytkowanie/i.test(currentStatus)) {
      setSelectValue(elements.plotOwnershipSelect, 'Użytkowanie wieczyste', 'Użytkowanie wieczyste');
    } else if (ownershipValue === 'Własność' && /użytkowanie/i.test(currentStatus)) {
      setSelectValue(elements.plotOwnershipSelect, 'Własność (pełna)', 'Własność (pełna)');
    }
  });

  if (elements.contactPhoneLink?.isContentEditable) {
    elements.contactPhoneLink.addEventListener('input', () => {
      const formatted = formatPhoneNumber(stripHtml(elements.contactPhoneLink.innerHTML));
      if (formatted) {
        elements.contactPhoneLink.textContent = formatted;
        selectAllText(elements.contactPhoneLink);
      }
    });
  }

  elements.utilitiesGrid?.addEventListener('click', (event) => {
    const card = event.target.closest('.utility-card');
    if (!card) return;
    const key = card.dataset.utility;
    const current = card.dataset.status || 'missing';
    const index = UTILITY_ORDER.indexOf(current);
    const next = UTILITY_ORDER[(index + 1) % UTILITY_ORDER.length];
    card.dataset.status = next;
    const label = card.querySelector('.utility-status');
    if (label) {
      label.textContent = getUtilityLabel(next, 'edit');
    }
    state.utilities[key] = next;
  });

  elements.addTagBtn?.addEventListener('click', () => {
    addTag(elements.tagInput?.value || '');
  });

  elements.tagInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag(elements.tagInput.value || '');
    }
  });

  elements.tagsList?.addEventListener('click', (event) => {
    const button = event.target.closest('.tag-remove');
    if (!button) return;
    const index = Number.parseInt(button.dataset.index, 10);
    if (Number.isInteger(index)) {
      state.tags.splice(index, 1);
      renderTagsEdit();
    }
  });

  elements.tagSuggestionsList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tag]');
    if (!button) return;
    const tag = button.dataset.tag;
    if (tag) {
      addTag(tag);
    }
  });
}

function normalizeTag(rawValue) {
  if (rawValue === undefined || rawValue === null) return '';
  let text = String(rawValue).trim();
  if (!text) return '';
  text = text.replace(/^#+/, '');
  text = text.replace(/[_\s]+/g, '-');
  text = text.replace(/-+/g, '-');
  text = text.replace(/[^0-9A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż-]/g, '');
  if (!text) return '';
  const segments = text.split('-').filter(Boolean);
  if (!segments.length) return '';
  const formatted = segments.map((segment, index) => {
    if (/^[0-9]+$/.test(segment)) {
      return segment;
    }
    if (segment === segment.toUpperCase() && segment.length > 1) {
      if (index === 0) {
        const lower = segment.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return segment.toUpperCase();
    }
    const lower = segment.toLowerCase();
    if (index === 0) {
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    return lower;
  });
  return `#${formatted.join('-')}`;
}

function addTag(rawValue) {
  const normalized = normalizeTag(rawValue);
  if (!normalized) {
    showToast('Podaj treść znacznika.', 'warning');
    return;
  }
  if (state.tags.some(existing => existing.toLowerCase() === normalized.toLowerCase())) {
    showToast('Taki znacznik już istnieje.', 'info');
    if (elements.tagInput) elements.tagInput.value = '';
    return;
  }
  state.tags.push(normalized);
  renderTagsEdit();
  if (elements.tagInput) elements.tagInput.value = '';
}

async function loadTagSuggestions() {
  if (state.loadingTagSuggestions || state.tagSuggestionsLoaded) {
    return;
  }
  state.loadingTagSuggestions = true;
  try {
    const { db } = initFirebase();
    const snapshot = await getDocs(collection(db, 'propertyListings'));
    const accumulator = new Map();

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const plots = Array.isArray(data?.plots) ? data.plots : [];
      plots.forEach(plot => {
        const normalizedTags = ensureArray(plot?.tags)
          .map(normalizeTag)
          .filter(Boolean);
        const uniqueTags = [];
        normalizedTags.forEach(tag => {
          if (!uniqueTags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
            uniqueTags.push(tag);
          }
        });
        uniqueTags.forEach(tag => {
          const key = tag.toLowerCase();
          const entry = accumulator.get(key);
          if (entry) {
            entry.count += 1;
          } else {
            accumulator.set(key, { tag, count: 1 });
          }
        });
      });
    });

    state.tagSuggestions = Array.from(accumulator.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.tag.localeCompare(b.tag, 'pl', { sensitivity: 'base' });
      })
      .map(entry => entry.tag);
    state.tagSuggestionsLoaded = true;
    renderTagSuggestions();
  } catch (error) {
    console.error('loadTagSuggestions', error);
  } finally {
    state.loadingTagSuggestions = false;
  }
}

function renderEditor(data, plot) {
  const rebind = !!state.plotData;
  state.offerData = data;
  state.plotData = cloneDeep(plot);

  const title = pickValue(plot.title, plot.name, plot.Id, `Działka ${state.plotIndex + 1}`);
  elements.propertyTitle.textContent = textContentOrFallback(title, 'Działka');
  document.title = `Edycja działki - ${textContentOrFallback(title, 'Działka')}`;

  const location = pickValue(plot.location, plot.city, data.city, data.location);
  applyPlaceholder(elements.propertyLocation, location);

  let propertyType = pickValue(plot.propertyType, plot.type, data.propertyType, '');
  if (typeof propertyType === 'string' && propertyType.trim().toLowerCase() === 'rodzaj') {
    propertyType = '';
  }
  setSelectValue(elements.propertyTypeSelect, propertyType, '');

  const ownershipRaw = pickValue(plot.ownershipStatus, plot.ownership, data.ownershipStatus, 'Własność');
  const normalizedOwnership = normalizeOwnershipForm(ownershipRaw) || 'Własność';
  setSelectValue(elements.ownershipFormSelect, normalizedOwnership, 'Własność');

  const price = parseNumberFromText(pickValue(plot.price, data.price));
  setPriceEdit(price);

  const area = parseNumberFromText(pickValue(plot.pow_dzialki_m2_uldk, plot.area, data.area));
  setAreaEdit(area);

  renderPriceUpdatedAt(pickValue(plot.priceUpdatedAt, data.updatedAt, data.timestamp));

  const plotNumberValue = pickValue(plot.plotNumber, plot.Id, plot.number);
  applyPlaceholder(elements.plotNumber, extractPlotNumberSegment(plotNumberValue));
  applyPlaceholder(elements.landRegister, pickValue(plot.landRegister, plot.kwNumber, plot.landRegistry, plot.numer_kw));
  const statusValue = pickValue(plot.status, plot.offerStatus, data.status, '');
  setSelectValue(elements.plotOwnershipSelect, statusValue, '');
  if (!elements.plotOwnershipSelect?.value) {
    const derivedStatus = deriveStatusFromOwnership(normalizedOwnership);
    if (derivedStatus) {
      setSelectValue(elements.plotOwnershipSelect, derivedStatus, derivedStatus);
    }
  }

  applyMultilinePlaceholder(elements.locationAddress, pickValue(plot.locationAddress, data.address, plot.address));
  applyRichTextPlaceholder(elements.locationAccess, pickValue(plot.locationAccess, plot.access, data.access));

  updateMapImages(collectMapImages(plot, data, state.plotIndex, state.offerId));

  state.planBadges = cloneDeep(pickValue(plot.planBadges, data.planBadges));
  renderPlanBadges(state.planBadges);
  applyPlaceholder(elements.planDesignation, pickValue(plot.planDesignation, plot.planUsage, data.planDesignation));
  applyPlaceholder(elements.planHeight, pickValue(plot.planHeight, data.planHeight));
  applyPlaceholder(elements.planIntensity, pickValue(plot.planIntensity, data.planIntensity));
  applyPlaceholder(elements.planGreen, pickValue(plot.planGreen, data.planGreen));
  applyRichTextPlaceholder(elements.planNotes, pickValue(plot.planNotes, data.planNotes));

  state.utilities = mergeUtilities(data.utilities, plot.utilities);
  renderUtilitiesEdit();

  applyRichTextPlaceholder(elements.descriptionText, pickValue(plot.description, data.description));

  const normalizedTags = ensureArray(pickValue(plot.tags, data.tags))
    .map(normalizeTag)
    .filter(Boolean);
  const uniqueTags = [];
  normalizedTags.forEach(tag => {
    if (!uniqueTags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      uniqueTags.push(tag);
    }
  });
  state.tags = uniqueTags;
  renderTagsEdit();

  const contactName = pickValue(plot.contactName, data.contactName, data.firstName, 'Właściciel');
  elements.contactName.textContent = textContentOrFallback(contactName, 'Właściciel');

  const phone = pickValue(plot.contactPhone, data.contactPhone, data.phone);
  if (phone) {
    elements.contactPhoneLink.textContent = formatPhoneNumber(phone);
  } else {
    elements.contactPhoneLink.textContent = 'Brak numeru';
  }
  updateContactPhoneHref();

  const email = pickValue(plot.contactEmail, data.contactEmail, data.email);
  elements.contactEmailLink.textContent = textContentOrFallback(email, 'Brak adresu');
  updateContactEmailHref();

  if (!rebind) {
    attachEditorListeners();
  }
}

function setupMapModeButtons() {
  elements.mapModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      setMapMode(btn.dataset.mode);
    });
  });
}

function getMapModeLabel(mode) {
  const button = elements.mapModeButtons.find(btn => btn.dataset.mode === mode);
  return button ? button.textContent.trim() : '';
}

function setActiveMapButton(mode) {
  elements.mapModeButtons.forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function showMapCanvas(mapType) {
  if (elements.mapImageContainer) {
    elements.mapImageContainer.classList.add('hidden');
  }
  if (elements.mapImageElement) {
    elements.mapImageElement.src = '';
    elements.mapImageElement.alt = '';
    elements.mapImageElement.classList.add('hidden');
    elements.mapImageElement.classList.remove('is-interactive');
    elements.mapImageElement.removeAttribute('tabindex');
    elements.mapImageElement.removeAttribute('role');
    elements.mapImageElement.removeAttribute('aria-label');
    delete elements.mapImageElement.dataset.layerLabel;
  }
  if (elements.mapImagePlaceholder) {
    elements.mapImagePlaceholder.classList.add('hidden');
  }
  if (elements.mapElement) {
    elements.mapElement.classList.remove('hidden');
  }
  if (!state.map || typeof google === 'undefined' || !google?.maps) return;
  const type = typeof mapType === 'string' ? mapType.toLowerCase() : 'hybrid';
  const mapTypeId = type === 'terrain'
    ? google.maps.MapTypeId.TERRAIN
    : type === 'satellite'
      ? google.maps.MapTypeId.SATELLITE
      : google.maps.MapTypeId.HYBRID;
  state.map.setMapTypeId(mapTypeId);
  if (google.maps.event && typeof google.maps.event.trigger === 'function') {
    const center = typeof state.map.getCenter === 'function' ? state.map.getCenter() : null;
    requestAnimationFrame(() => {
      google.maps.event.trigger(state.map, 'resize');
      if (center && typeof state.map.setCenter === 'function') {
        state.map.setCenter(center);
      }
    });
  }
}

function showMapImage(key, label) {
  if (!elements.mapImageContainer || !elements.mapImageElement) return;
  const url = key ? state.mapImages[key] : '';
  const hasUrl = typeof url === 'string' && url.trim().length > 0;

  if (elements.mapElement) {
    elements.mapElement.classList.add('hidden');
  }
  elements.mapImageContainer.classList.remove('hidden');

  if (hasUrl) {
    elements.mapImageElement.src = url;
    elements.mapImageElement.alt = label ? `Warstwa „${label}”` : 'Podgląd warstwy mapy';
    elements.mapImageElement.dataset.layerLabel = label || '';
    elements.mapImageElement.classList.remove('hidden');
    elements.mapImageElement.classList.add('is-interactive');
    elements.mapImageElement.setAttribute('tabindex', '0');
    elements.mapImageElement.setAttribute('role', 'button');
    const accessibleLabel = label ? `Powiększ warstwę „${label}”` : 'Powiększ podgląd warstwy mapy';
    elements.mapImageElement.setAttribute('aria-label', accessibleLabel);
    elements.mapImagePlaceholder?.classList.add('hidden');
  } else {
    elements.mapImageElement.src = '';
    elements.mapImageElement.alt = '';
    delete elements.mapImageElement.dataset.layerLabel;
    elements.mapImageElement.classList.add('hidden');
    elements.mapImageElement.classList.remove('is-interactive');
    elements.mapImageElement.removeAttribute('tabindex');
    elements.mapImageElement.removeAttribute('role');
    elements.mapImageElement.removeAttribute('aria-label');
    if (elements.mapImagePlaceholder) {
      const name = label ? `warstwy „${label}”` : 'tej warstwy';
      elements.mapImagePlaceholder.textContent = `Brak obrazu dla ${name}.`;
      elements.mapImagePlaceholder.classList.remove('hidden');
    }
  }
}

function handleMapImageError() {
  if (!elements.mapImageElement || !elements.mapImagePlaceholder) return;
  const label = elements.mapImageElement.dataset?.layerLabel;
  const name = label ? `warstwy „${label}”` : 'tej warstwy';
  elements.mapImageElement.src = '';
  elements.mapImageElement.alt = '';
  elements.mapImageElement.classList.add('hidden');
  elements.mapImageElement.classList.remove('is-interactive');
  elements.mapImageElement.removeAttribute('tabindex');
  elements.mapImageElement.removeAttribute('role');
  elements.mapImageElement.removeAttribute('aria-label');
  elements.mapImagePlaceholder.textContent = `Brak obrazu dla ${name}.`;
  elements.mapImagePlaceholder.classList.remove('hidden');
}

function canOpenMapImageLightbox() {
  if (!elements.mapImageElement) return false;
  if (elements.mapImageElement.classList.contains('hidden')) return false;
  const src = elements.mapImageElement.getAttribute('src');
  return Boolean(src);
}

function computeLightboxBaseSize() {
  if (!elements.mapImageLightboxPicture) return null;
  const naturalWidth = elements.mapImageLightboxPicture.naturalWidth || elements.mapImageElement?.naturalWidth || 0;
  const naturalHeight = elements.mapImageLightboxPicture.naturalHeight || elements.mapImageElement?.naturalHeight || 0;
  if (!naturalWidth || !naturalHeight) return null;

  const viewportWidth = Math.max((window.innerWidth || naturalWidth) - 64, 320);
  const viewportHeight = Math.max((window.innerHeight || naturalHeight) - 160, 320);
  const ratio = Math.min(1, viewportWidth / naturalWidth, viewportHeight / naturalHeight);

  return {
    width: naturalWidth * ratio,
    height: naturalHeight * ratio
  };
}

function applyLightboxZoom() {
  if (!elements.mapImageLightboxPicture) return;
  const baseWidth = state.lightboxBaseWidth || elements.mapImageLightboxPicture.naturalWidth || elements.mapImageLightboxPicture.clientWidth;
  if (!baseWidth) {
    updateZoomButtonsState();
    return;
  }
  const width = baseWidth * state.lightboxZoom;
  elements.mapImageLightboxPicture.style.width = `${width}px`;
  elements.mapImageLightboxPicture.style.height = 'auto';
  elements.mapImageLightboxPicture.style.maxWidth = 'none';
  elements.mapImageLightboxPicture.style.maxHeight = 'none';
  updateZoomButtonsState();
}

function initializeLightboxZoom() {
  state.lightboxBaseWidth = 0;
  state.lightboxBaseHeight = 0;
  if (!elements.mapImageLightboxPicture) {
    updateZoomButtonsState();
    return;
  }

  const size = computeLightboxBaseSize();
  if (size) {
    state.lightboxBaseWidth = size.width;
    state.lightboxBaseHeight = size.height;
  } else {
    const fallbackWidth = elements.mapImageElement?.clientWidth || elements.mapImageLightboxPicture.clientWidth || 0;
    const fallbackHeight = elements.mapImageElement?.clientHeight || elements.mapImageLightboxPicture.clientHeight || 0;
    state.lightboxBaseWidth = fallbackWidth;
    state.lightboxBaseHeight = fallbackHeight;
  }

  state.lightboxZoom = LIGHTBOX_ZOOM_DEFAULT;
  applyLightboxZoom();
}

function prepareLightboxZoom() {
  if (!elements.mapImageLightboxPicture) {
    updateZoomButtonsState();
    return;
  }

  const apply = () => {
    initializeLightboxZoom();
  };

  if (elements.mapImageLightboxPicture.complete && elements.mapImageLightboxPicture.naturalWidth) {
    apply();
  } else {
    elements.mapImageLightboxPicture.addEventListener('load', apply, { once: true });
  }
}

function adjustLightboxZoom(delta) {
  if (!state.isLightboxOpen) {
    updateZoomButtonsState();
    return;
  }
  const next = clamp(state.lightboxZoom + delta, LIGHTBOX_ZOOM_MIN, LIGHTBOX_ZOOM_MAX);
  if (Math.abs(next - state.lightboxZoom) < 0.001) {
    updateZoomButtonsState();
    return;
  }
  state.lightboxZoom = next;
  applyLightboxZoom();
}

function handleLightboxZoomIn(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  adjustLightboxZoom(LIGHTBOX_ZOOM_STEP);
}

function handleLightboxZoomOut(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  adjustLightboxZoom(-LIGHTBOX_ZOOM_STEP);
}

function resetLightboxZoomState() {
  state.lightboxZoom = LIGHTBOX_ZOOM_DEFAULT;
  state.lightboxBaseWidth = 0;
  state.lightboxBaseHeight = 0;
  if (elements.mapImageLightboxPicture) {
    elements.mapImageLightboxPicture.style.width = '';
    elements.mapImageLightboxPicture.style.height = '';
    elements.mapImageLightboxPicture.style.maxWidth = '';
    elements.mapImageLightboxPicture.style.maxHeight = '';
  }
  updateZoomButtonsState();
}

function updateZoomButtonsState() {
  const zoomIn = elements.mapImageLightboxZoomIn;
  const zoomOut = elements.mapImageLightboxZoomOut;
  if (!zoomIn || !zoomOut) return;

  const isOpen = state.isLightboxOpen;
  const canZoomIn = isOpen && state.lightboxZoom < (LIGHTBOX_ZOOM_MAX - 0.001);
  const canZoomOut = isOpen && state.lightboxZoom > (LIGHTBOX_ZOOM_MIN + 0.001);

  zoomIn.disabled = !canZoomIn;
  zoomOut.disabled = !canZoomOut;
  zoomIn.setAttribute('aria-disabled', (!canZoomIn).toString());
  zoomOut.setAttribute('aria-disabled', (!canZoomOut).toString());
  zoomIn.classList.toggle('is-disabled', !canZoomIn);
  zoomOut.classList.toggle('is-disabled', !canZoomOut);
}

function openMapImageLightbox() {
  if (!canOpenMapImageLightbox() || !elements.mapImageLightbox || !elements.mapImageLightboxPicture) {
    return;
  }

  const src = elements.mapImageElement.getAttribute('src');
  const baseAlt = elements.mapImageElement.getAttribute('alt') || '';
  const label = elements.mapImageElement.dataset?.layerLabel;
  const accessibleLabel = label
    ? `Powiększony widok warstwy „${label}”`
    : baseAlt || 'Powiększony podgląd warstwy mapy';

  state.lightboxReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  elements.mapImageLightboxPicture.src = src;
  elements.mapImageLightboxPicture.alt = accessibleLabel;
  state.isLightboxOpen = true;
  prepareLightboxZoom();
  elements.mapImageLightbox.classList.remove('hidden');
  elements.mapImageLightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
  updateZoomButtonsState();
  requestAnimationFrame(() => {
    elements.mapImageLightbox?.focus();
  });
}

function closeMapImageLightbox() {
  if (!state.isLightboxOpen) return;
  if (elements.mapImageLightbox) {
    elements.mapImageLightbox.classList.add('hidden');
    elements.mapImageLightbox.setAttribute('aria-hidden', 'true');
  }
  if (elements.mapImageLightboxPicture) {
    elements.mapImageLightboxPicture.src = '';
    elements.mapImageLightboxPicture.alt = '';
  }
  document.body.classList.remove('lightbox-open');
  state.isLightboxOpen = false;
  resetLightboxZoomState();
  if (state.lightboxReturnFocus instanceof HTMLElement) {
    state.lightboxReturnFocus.focus();
  }
  state.lightboxReturnFocus = null;
}

function handleMapImageClick(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  openMapImageLightbox();
}

function handleMapImageKeydown(event) {
  if (!event) return;
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    openMapImageLightbox();
  }
}

function handleLightboxBackdropClick(event) {
  if (!elements.mapImageLightbox || !event) return;
  if (event.target === elements.mapImageLightbox) {
    closeMapImageLightbox();
  }
}

function handleLightboxKeydown(event) {
  if (!state.isLightboxOpen || !event) return;
  if (event.key === '+' || event.key === '=' || event.key === 'Add') {
    event.preventDefault();
    adjustLightboxZoom(LIGHTBOX_ZOOM_STEP);
    return;
  }
  if (event.key === '-' || event.key === '_' || event.key === 'Subtract') {
    event.preventDefault();
    adjustLightboxZoom(-LIGHTBOX_ZOOM_STEP);
    return;
  }
  if (event.key === 'Escape' || event.key === 'Esc') {
    event.preventDefault();
    closeMapImageLightbox();
  }
}

function updateMapImages(images) {
  const nextImages = images && typeof images === 'object' && !Array.isArray(images)
    ? { ...images }
    : {};
  state.mapImages = nextImages;
  elements.mapModeButtons.forEach(btn => {
    const mode = btn.dataset.mode;
    const config = MAP_MODES[mode];
    if (config?.type === 'image') {
      const hasImage = Boolean(state.mapImages[config.key]);
      btn.classList.toggle('is-disabled', !hasImage);
      if (!hasImage) {
        btn.setAttribute('title', 'Brak obrazu dla tej warstwy');
      } else {
        btn.removeAttribute('title');
      }
    } else {
      btn.classList.remove('is-disabled');
      btn.removeAttribute('title');
    }
  });
  if (!state.currentMapMode) {
    state.currentMapMode = MAP_MODE_DEFAULT;
  }
  setMapMode(state.currentMapMode);
}

function setMapMode(mode) {
  const targetMode = MAP_MODES[mode] ? mode : MAP_MODE_DEFAULT;
  const config = MAP_MODES[targetMode] || MAP_MODES[MAP_MODE_DEFAULT];
  state.currentMapMode = targetMode;
  setActiveMapButton(targetMode);
  if (config.type === 'image') {
    showMapImage(config.key, getMapModeLabel(targetMode));
  } else {
    showMapCanvas(config.mapType);
  }
}

function ensureProjDefinition() {
  if (typeof proj4 === 'undefined' || typeof proj4.defs !== 'function') {
    return false;
  }
  if (!proj4.defs('EPSG:2180')) {
    proj4.defs('EPSG:2180', '+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +units=m +no_defs');
  }
  return true;
}

function parsePlotGeometry(geometryString) {
  if (!geometryString || typeof geometryString !== 'string') return [];
  if (!ensureProjDefinition()) return [];
  const coords = [];
  try {
    const match = geometryString.match(/\(\(([^)]+)\)\)/);
    const coordString = match ? match[1] : '';
    if (!coordString) return [];
    const points = coordString.split(',');
    points.forEach(point => {
      const parts = point.trim().split(/\s+/);
      if (parts.length < 2) return;
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const [lng, lat] = proj4('EPSG:2180', 'WGS84', [x, y]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coords.push({ lat, lng });
      }
    });
  } catch (error) {
    console.error('Nie udało się przetworzyć geometrii działki.', error);
  }
  return coords;
}

function computePolygonCenter(coords) {
  if (!coords.length) return null;
  const total = coords.reduce((acc, point) => {
    acc.lat += point.lat;
    acc.lng += point.lng;
    return acc;
  }, { lat: 0, lng: 0 });
  return {
    lat: total.lat / coords.length,
    lng: total.lng / coords.length
  };
}

async function renderMap(plot) {
  if (!elements.mapElement) return;
  const lat = parseFloat(pickValue(plot.lat, plot.latitude, plot.coords?.lat));
  const lng = parseFloat(pickValue(plot.lng, plot.longitude, plot.coords?.lng));
  const geometryRaw = pickValue(
    plot.geometry_uldk_wkt,
    plot.geometry_uldk?.wkt,
    plot.geometry_uldk,
    plot.geometry,
    plot.geometryWkt,
    plot.geometry_wkt
  );
  const geometryCoords = typeof geometryRaw === 'string' ? parsePlotGeometry(geometryRaw) : [];
  const hasLatLng = Number.isFinite(lat) && Number.isFinite(lng);
  if (!hasLatLng && !geometryCoords.length) {
    elements.mapElement.innerHTML = '<p style="padding:1rem;color:var(--gray);">Brak współrzędnych do wyświetlenia mapy.</p>';
    return;
  }
  try {
    await loadGoogleMaps();
  } catch (error) {
    elements.mapElement.innerHTML = '<p style="padding:1rem;color:#c53030;">Nie udało się załadować mapy.</p>';
    return;
  }

  const title = textContentOrFallback(elements.propertyTitle?.textContent, 'Działka');
  const geometryCenter = geometryCoords.length ? computePolygonCenter(geometryCoords) : null;
  const center = hasLatLng ? { lat, lng } : (geometryCenter || geometryCoords[0]);
  if (!center) {
    elements.mapElement.innerHTML = '<p style="padding:1rem;color:var(--gray);">Brak współrzędnych do wyświetlenia mapy.</p>';
    return;
  }

  if (state.marker) {
    state.marker.setMap(null);
    state.marker = null;
  }
  if (state.polygon) {
    state.polygon.setMap(null);
    state.polygon = null;
  }

  elements.mapElement.innerHTML = '';
  state.map = new google.maps.Map(elements.mapElement, {
    center,
    zoom: hasLatLng ? 15 : 16,
    mapTypeId: google.maps.MapTypeId.HYBRID,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false
  });

  state.marker = new google.maps.Marker({
    map: state.map,
    position: center,
    title
  });

  if (geometryCoords.length) {
    state.polygon = new google.maps.Polygon({
      paths: geometryCoords,
      strokeColor: '#ff3b30',
      strokeOpacity: 0.95,
      strokeWeight: 3,
      fillColor: '#ff3b30',
      fillOpacity: 0.18,
      map: state.map,
      clickable: false
    });
    const bounds = new google.maps.LatLngBounds();
    geometryCoords.forEach(coord => bounds.extend(coord));
    if (!bounds.isEmpty()) {
      state.map.fitBounds(bounds, { top: 32, right: 32, bottom: 32, left: 32 });
    }
  }

  setMapMode(state.currentMapMode || MAP_MODE_DEFAULT);
}

function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
}

function closeModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
}

function setupModalHandlers() {
  elements.modalCloseButtons.forEach(button => {
    button.addEventListener('click', () => closeModal(button.closest('.modal')));
  });
  [elements.loginModal, elements.registerModal].forEach(modal => {
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
}

function updateAuthUI(user) {
  state.user = user;
  if (elements.authButtons) {
    elements.authButtons.style.display = user ? 'none' : 'flex';
  }
  if (elements.userMenu) {
    elements.userMenu.style.display = user ? 'flex' : 'none';
  }
  if (elements.mobileAuth) {
    if (user) {
      const label = user.displayName ? user.displayName.split(' ')[0] : (user.email || 'Konto');
      elements.mobileAuth.innerHTML = `
        <div class="nav-link" style="font-weight:600;"><i class="fas fa-user"></i> ${label}</div>
        <a href="index.html#userDashboard" class="nav-link" id="mobileAccountLink">Moje konto</a>
        <button class="btn btn-secondary" id="mobileLogoutBtn" style="width:100%;"><i class="fas fa-sign-out-alt"></i> Wyloguj</button>
      `;
      document.getElementById('mobileLogoutBtn')?.addEventListener('click', () => performLogout());
      document.getElementById('mobileAccountLink')?.addEventListener('click', () => {
        window.location.href = 'index.html#userDashboard';
      });
    } else {
      elements.mobileAuth.innerHTML = `
        <button class="btn btn-outline-primary btn-sm" id="mobileLoginBtn" style="width:100%;margin-bottom:.5rem;">
          <i class="fas fa-sign-in-alt"></i> Zaloguj się
        </button>
        <button class="btn btn-primary btn-sm" id="mobileRegisterBtn" style="width:100%;">
          <i class="fas fa-user-plus"></i> Zarejestruj się
        </button>
      `;
      document.getElementById('mobileLoginBtn')?.addEventListener('click', () => openModal(elements.loginModal));
      document.getElementById('mobileRegisterBtn')?.addEventListener('click', () => openModal(elements.registerModal));
    }
  }
}

async function performLogout() {
  try {
    const { auth } = initFirebase();
    await signOut(auth);
    showToast('Wylogowano pomyślnie.', 'success');
  } catch (error) {
    showToast('Nie udało się wylogować. Spróbuj ponownie.', 'error');
  }
}

function setupAuthUI() {
  const { auth } = initFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  elements.loginBtn?.addEventListener('click', () => openModal(elements.loginModal));
  elements.registerBtn?.addEventListener('click', () => openModal(elements.registerModal));
  elements.accountBtn?.addEventListener('click', () => {
    window.location.href = 'index.html#userDashboard';
  });
  elements.logoutBtn?.addEventListener('click', () => performLogout());

  setupModalHandlers();

  elements.switchToRegister?.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal(elements.loginModal);
    openModal(elements.registerModal);
  });
  elements.switchToLogin?.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal(elements.registerModal);
    openModal(elements.loginModal);
  });

  elements.loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = event.target.loginEmail?.value?.trim();
    const password = event.target.loginPassword?.value;
    if (!email || !password) {
      showToast('Podaj adres email i hasło.', 'warning');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Zalogowano pomyślnie.', 'success');
      closeModal(elements.loginModal);
      event.target.reset();
    } catch (error) {
      showToast('Nie udało się zalogować: ' + (error.message || ''), 'error');
    }
  });

  elements.registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = event.target.registerEmail?.value?.trim();
    const password = event.target.registerPassword?.value;
    if (!email || !password) {
      showToast('Podaj adres email i hasło.', 'warning');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showToast('Konto zostało utworzone.', 'success');
      closeModal(elements.registerModal);
      event.target.reset();
    } catch (error) {
      showToast('Nie udało się utworzyć konta: ' + (error.message || ''), 'error');
    }
  });

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      showToast('Zalogowano przez Google.', 'success');
      closeModal(elements.loginModal);
      closeModal(elements.registerModal);
    } catch (error) {
      showToast('Nie udało się zalogować przez Google.', 'error');
    }
  };

  elements.googleRegisterBtn?.addEventListener('click', handleGoogleLogin);
  elements.googleLoginBtn?.addEventListener('click', handleGoogleLogin);

  onAuthStateChanged(auth, async (user) => {
    updateAuthUI(user);
    if (!user) {
      showToast('Zaloguj się, aby edytować ofertę.', 'info');
      redirectToDetails();
      return;
    }
    state.user = user;
    if (!state.hasLoaded) {
      await loadProperty();
      state.hasLoaded = true;
    }
  });
}

function validatePlot(plot) {
  if (plot.price !== null && plot.price < 0) {
    showToast('Cena nie może być ujemna.', 'error');
    return false;
  }
  if (plot.pow_dzialki_m2_uldk !== null && plot.pow_dzialki_m2_uldk <= 0) {
    showToast('Powierzchnia musi być większa od zera.', 'error');
    return false;
  }
  return true;
}

function buildUpdatedPlot() {
  const base = cloneDeep(state.plotData || {});
  base.title = stripHtml(elements.propertyTitle.innerHTML).trim() || 'Działka';
  const locationText = normalizePlaceholderValue(stripHtml(elements.propertyLocation.innerHTML));
  base.location = locationText;
  base.city = locationText;
  base.propertyType = (elements.propertyTypeSelect?.value || '').trim();
  base.ownershipStatus = (elements.ownershipFormSelect?.value || '').trim();
  base.price = state.price;
  base.pricePerSqm = state.price && state.area ? Math.round(state.price / state.area) : null;
  base.priceUpdatedAt = new Date().toISOString();
  base.pow_dzialki_m2_uldk = state.area;
  base.area = state.area;
  base.landRegister = normalizePlaceholderValue(stripHtml(elements.landRegister.innerHTML));
  base.status = (elements.plotOwnershipSelect?.value || '').trim();
  base.locationAddress = normalizeMultilineValue(elements.locationAddress.textContent || '');
  base.locationAccess = normalizeRichTextValue(getRichTextContent(elements.locationAccess));
  base.planDesignation = normalizePlaceholderValue(stripHtml(elements.planDesignation.innerHTML));
  base.planHeight = normalizePlaceholderValue(stripHtml(elements.planHeight.innerHTML));
  base.planIntensity = normalizePlaceholderValue(stripHtml(elements.planIntensity.innerHTML));
  base.planGreen = normalizePlaceholderValue(stripHtml(elements.planGreen.innerHTML));
  base.planNotes = normalizeRichTextValue(getRichTextContent(elements.planNotes));
  base.description = normalizeRichTextValue(getRichTextContent(elements.descriptionText));
  base.utilities = { ...state.utilities };
  base.tags = [...state.tags];
  base.planBadges = state.planBadges || base.planBadges || [];
  return base;
}

async function handleSave() {
  if (state.saving) return;
  const updatedPlot = buildUpdatedPlot();
  if (!validatePlot(updatedPlot)) return;

  try {
    state.saving = true;
    if (elements.saveChangesBtn) elements.saveChangesBtn.disabled = true;
    const { db } = initFirebase();
    const offerRef = doc(db, 'propertyListings', state.offerId);
    const plots = Array.isArray(state.offerData?.plots) ? cloneDeep(state.offerData.plots) : [];
    plots[state.plotIndex] = updatedPlot;

    const locationValue = typeof updatedPlot.location === 'string' ? updatedPlot.location.trim() : '';
    const updatePayload = { plots, updatedAt: serverTimestamp(), city: locationValue };
    if (typeof state.offerData?.location === 'string' || state.offerData?.location === undefined || state.offerData?.location === null) {
      updatePayload.location = locationValue;
    } else if (state.offerData?.location && typeof state.offerData.location === 'object') {
      updatePayload['location.city'] = locationValue;
    }

    await updateDoc(offerRef, updatePayload);
    showToast('Zapisano zmiany.', 'success');
    state.offerData.plots = plots;
    if (state.offerData) {
      state.offerData.city = locationValue;
      if (typeof state.offerData.location === 'string' || state.offerData.location === undefined || state.offerData.location === null) {
        state.offerData.location = locationValue;
      } else if (typeof state.offerData.location === 'object') {
        state.offerData.location = { ...state.offerData.location, city: locationValue };
      }
    }
    state.plotData = cloneDeep(updatedPlot);
    renderPriceUpdatedAt(new Date());
    setPriceEdit(state.price);
    setAreaEdit(state.area);
    renderUtilitiesEdit();
    renderTagsEdit();
  } catch (error) {
    console.error('handleSave', error);
    showToast('Nie udało się zapisać zmian. Spróbuj ponownie.', 'error');
  } finally {
    state.saving = false;
    if (elements.saveChangesBtn) elements.saveChangesBtn.disabled = false;
  }
}

async function loadProperty() {
  if (!state.offerId) {
    showError('Nie wskazano oferty do edycji.');
    return;
  }
  const { db } = initFirebase();
  try {
    const offerRef = doc(db, 'propertyListings', state.offerId);
    const snap = await getDoc(offerRef);
    if (!snap.exists()) {
      showError('Ogłoszenie nie istnieje lub zostało usunięte.');
      return;
    }
    const data = snap.data();
    const ownerUid = pickValue(data.ownerUid, data.userUid, data.uid, data.ownerId);
    if (ownerUid && ownerUid !== state.user?.uid) {
      showToast('Nie masz uprawnień do edycji tej oferty.', 'error');
      redirectToDetails();
      return;
    }
    const plots = Array.isArray(data.plots) ? data.plots : [];
    const plot = plots[state.plotIndex];
    if (!plot) {
      showError('Nie odnaleziono wskazanej działki.');
      return;
    }
    renderEditor(data, plot);
    await renderMap(plot);
    showContent();
  } catch (error) {
    console.error('loadProperty', error);
    showError('Wystąpił błąd podczas wczytywania danych.');
  }
}

async function init() {
  syncMobileMenu();
  const { offerId, plotIndex } = parseQueryParams();
  state.offerId = offerId;
  state.plotIndex = plotIndex;
  if (!offerId) {
    showError('Nie wskazano oferty do edycji.');
    return;
  }
  initFirebase();
  loadTagSuggestions();
  setupAuthUI();
  setupMapModeButtons();
  elements.saveChangesBtn?.addEventListener('click', () => handleSave());
}

init();
