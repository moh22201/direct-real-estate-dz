/* ==========================================
   مملكة العقار المباشر DZ
   Main JavaScript — نسخة موحّدة ومنظّفة
   Supabase + Property Search + Navigation + Auth
   ========================================== */
"use strict";

/* SUPABASE CONFIGURATION */
const SUPABASE_URL = "https://fppzejxdggnlscjcqmgk.supabase.co";
const SUPABASE_KEY = "sb_publishable_qhAVIMpyEcE_Y_7L_9irrQ_Naru1RBC";

const PROPERTY_FIELDS = [
  "id", "title", "description", "category", "operation", "wilaya",
  "commune", "price", "area_m2", "bedrooms", "bathrooms", "created_at"
].join(",");

const WILAYAS = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة",
  "بشار", "البليدة", "البويرة", "تمنراست", "تبسة", "تلمسان", "تيارت",
  "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة", "سكيكدة",
  "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم", "المسيلة",
  "معسكر", "ورقلة", "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس",
  "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس", "تيبازة",
  "ميلة", "عين الدفلى", "النعامة", "عين تموشنت", "غرداية", "غليزان", "تيميمون",
  "برج باجي مختار", "أولاد جلال", "بني عباس", "عين صالح", "عين قزام", "تقرت",
  "جانت", "المغير", "المنيعة"
];

const CATEGORY_LABELS = {
  apartment: "شقة", house: "منزل", land: "أرض للبناء",
  farm: "أرض فلاحية", commercial: "محل تجاري"
};
const OPERATION_LABELS = { sale: "للبيع", rent: "للكراء" };

/* GENERAL HELPERS */
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function normalizeCategory(value) {
  const category = String(value ?? "").trim().toLowerCase();
  const aliases = {
    "شقة": "apartment", "شقق": "apartment", "منزل": "house", "منازل": "house",
    "أرض للبناء": "land", "أراضي للبناء": "land", "أرض فلاحية": "farm",
    "أراضٍ فلاحية": "farm", "عقار تجاري": "commercial", "عقارات تجارية": "commercial",
    "محل تجاري": "commercial"
  };
  return aliases[category] || category;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "السعر غير محدد";
  const number = Number(value);
  if (!Number.isFinite(number)) return "السعر غير محدد";
  return new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(number) + " دج";
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[normalizeCategory(category)] || "عقار";
}
function getOperationLabel(operation) {
  return OPERATION_LABELS[operation] || "عقار";
}

/* SESSION MANAGEMENT */
function getSession() {
  try {
    const raw = localStorage.getItem("supabaseSession");
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== "object" || !session.access_token || !session.user?.id) return null;
    if (session.expires_at && !Number.isFinite(Number(session.expires_at))) return null;
    if (session.expires_at && Number(session.expires_at) * 1000 <= Date.now()) return null;
    return session;
  } catch (error) {
    console.warn("تعذرت قراءة جلسة المستخدم.");
    return null;
  }
}
function getCurrentUserId() { return getSession()?.user?.id || null; }
function isLoggedIn() { return Boolean(getCurrentUserId()); }

/* SUPABASE REST HELPER */
async function supabaseRequest(path, options = {}) {
  const session = getSession();
  const headers = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  headers.Authorization = session?.access_token
    ? "Bearer " + session.access_token
    : "Bearer " + SUPABASE_KEY;

  const response = await fetch(SUPABASE_URL + path, { ...options, headers });
  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = raw; }
  }
  if (!response.ok) {
    throw new Error(data?.message || data?.error_description || data?.error || "حدث خطأ أثناء الاتصال بالخادم.");
  }
  return data;
}

/* NOTIFICATIONS */
function showMessage(message, type = "info", containerId = null) {
  const target = (containerId && document.getElementById(containerId)) || document.getElementById("globalMessage");
  if (!target) { console.log(message); return; }
  target.textContent = message;
  target.className = "alert " + ({ success: "alert-success", error: "alert-error", warning: "alert-warning" }[type] || "alert-info");
  target.hidden = false;
}
function clearMessage(containerId) {
  const target = document.getElementById(containerId);
  if (target) { target.textContent = ""; target.hidden = true; }
}

/* WILAYA SELECTS */
function populateWilayaSelects() {
  document.querySelectorAll('select[name="wilaya"], #wilayaFilter, #wilaya').forEach(select => {
    const currentValue = select.value;
    const hasDefault = Array.from(select.options).some(option => option.value === "");
    const defaultText = select.options[0]?.value === "" ? select.options[0].textContent : (select.dataset.placeholder || "كل الولايات");
    select.innerHTML = "";
    if (hasDefault) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = defaultText || "كل الولايات";
      select.appendChild(placeholder);
    }
    WILAYAS.forEach(wilaya => {
      const option = document.createElement("option");
      option.value = wilaya;
      option.textContent = wilaya;
      select.appendChild(option);
    });
    if (currentValue && Array.from(select.options).some(option => option.value === currentValue)) select.value = currentValue;
  });
}

/* PROPERTY QUERY */
async function fetchPublishedProperties(filters = {}) {
  const params = new URLSearchParams({ select: PROPERTY_FIELDS, status: "eq.published", order: "created_at.desc", limit: "60" });
  if (filters.operation) params.set("operation", "eq." + filters.operation);
  if (filters.category) params.set("category", "eq." + normalizeCategory(filters.category));
  if (filters.wilaya) params.set("wilaya", "eq." + filters.wilaya);
  if (filters.search) {
    const safeSearch = String(filters.search).trim().replace(/[(),]/g, " ");
    if (safeSearch) params.set("or", "(title.ilike.*" + safeSearch + "*,commune.ilike.*" + safeSearch + "*,wilaya.ilike.*" + safeSearch + "*)");
  }
  return supabaseRequest("/rest/v1/properties?" + params.toString());
}

/* PROPERTY CARD */
function createPropertyCard(property) {
  const card = document.createElement("article");
  card.className = "property-card";
  const category = getCategoryLabel(property.category);
  const operation = getOperationLabel(property.operation);
  const location = [property.commune, property.wilaya].filter(Boolean).join("، ");
  const area = property.area_m2 !== null && property.area_m2 !== undefined && property.area_m2 !== "" ? escapeHTML(property.area_m2) + " م²" : "";
  const bedrooms = property.bedrooms !== null && property.bedrooms !== undefined ? escapeHTML(property.bedrooms) + " غرف" : "";
  const bathrooms = property.bathrooms !== null && property.bathrooms !== undefined ? escapeHTML(property.bathrooms) + " حمامات" : "";
  const meta = [area, bedrooms, bathrooms].filter(Boolean).map(item => "<span>" + item + "</span>").join("");
  const description = String(property.description || "");
  const shortDescription = description.length > 115 ? description.slice(0, 115) + "…" : description;

  card.innerHTML = `
    <div class="property-image" style="position:relative;min-height:150px;overflow:hidden;border-radius:12px 12px 0 0;">
      <div class="property-placeholder" style="height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#087fa3;background:linear-gradient(135deg,#e6f5fa,#fff9eb);">
        <span style="font-size:42px" aria-hidden="true">⌂</span><span style="font-size:12px">مملكة العقار المباشر</span>
      </div>
      <span style="position:absolute;top:12px;right:12px;background:#087fa3;color:#fff;padding:5px 11px;border-radius:7px;font-size:12px;font-weight:bold">${escapeHTML(operation)}</span>
    </div>
    <div class="property-card-content" style="padding:16px;">
      <div class="property-meta"><span>${escapeHTML(category)}</span></div>
      <h3 class="property-title">${escapeHTML(property.title || "عقار")}</h3>
      <div class="property-location"><span aria-hidden="true">📍</span> <span>${escapeHTML(location || "الجزائر")}</span></div>
      <div class="property-price">${escapeHTML(formatPrice(property.price))}</div>
      ${meta ? `<div class="property-meta">${meta}</div>` : ""}
      ${shortDescription ? `<p>${escapeHTML(shortDescription)}</p>` : ""}
      <a class="btn btn-primary" href="property-details.html?id=${encodeURIComponent(property.id)}">عرض تفاصيل العقار</a>
    </div>`;
  return card;
}

function showEmptyProperties(container, message) {
  container.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.style.gridColumn = "1 / -1";
  const title = document.createElement("h3");
  title.textContent = "لا توجد إعلانات لعرضها";
  const paragraph = document.createElement("p");
  paragraph.textContent = message || "لم نعثر على عقارات مطابقة للبحث. جرّب تغيير خيارات البحث.";
  empty.append(title, paragraph);
  container.appendChild(empty);
}

async function renderProperties(filters = {}) {
  const container = document.getElementById("propertiesGrid");
  if (!container) return;
  container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>جارٍ تحميل العقارات المنشورة...</p></div>';
  try {
    const properties = await fetchPublishedProperties(filters);
    container.innerHTML = "";
    if (!Array.isArray(properties) || properties.length === 0) {
      showEmptyProperties(container, "لا توجد إعلانات منشورة تطابق خيارات البحث حاليًا.");
      return;
    }
    properties.forEach(property => container.appendChild(createPropertyCard(property)));
  } catch (error) {
    console.error("تعذر تحميل العقارات:", error);
    showEmptyProperties(container, "تعذر تحميل العقارات الآن. تحقق من اتصال الإنترنت وحاول مجددًا.");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "btn btn-outline";
    retry.textContent = "إعادة المحاولة";
    retry.addEventListener("click", () => renderProperties(filters));
    container.appendChild(retry);
  }
}

/* SEARCH */
function setupSearchForm() {
  const form = document.getElementById("searchForm") || document.querySelector(".search-form");
  if (!form || form.dataset.searchInitialized === "true") return;
  form.dataset.searchInitialized = "true";
  form.addEventListener("submit", event => {
    event.preventDefault();
    const operation = form.querySelector('[name="operation"]')?.value || "";
    const category = form.querySelector('[name="category"]')?.value || "";
    const wilaya = form.querySelector('[name="wilaya"]')?.value || "";
    const search = form.querySelector('[name="search"], [name="keyword"], [name="query"]')?.value || "";
    renderProperties({ operation, category, wilaya, search });
    (document.getElementById("latest") || document.getElementById("propertiesSection") || document.getElementById("propertiesGrid"))?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/* CATEGORY FILTERS */
function setupCategoryCards() {
  document.querySelectorAll("[data-category], .category-card").forEach(card => {
    if (card.dataset.categoryInitialized === "true") return;
    card.dataset.categoryInitialized = "true";
    card.addEventListener("click", event => {
      const category = card.dataset.category || card.getAttribute("data-filter") || "";
      const operation = card.dataset.operation || "";
      if (!category) return;
      event.preventDefault();
      renderProperties({ category: normalizeCategory(category), operation });
      (document.getElementById("latest") || document.getElementById("propertiesGrid"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* MOBILE NAVIGATION */
function setupMobileNavigation() {
  const toggle = document.querySelector(".nav-toggle, .menu-toggle, .mobile-menu-btn");
  const nav = document.getElementById("mainNav") || document.querySelector(".nav-links, .nav-menu, header nav");
  if (!toggle || !nav || toggle.dataset.navigationInitialized === "true") return;
  toggle.dataset.navigationInitialized = "true";
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    nav.classList.toggle("active", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("active", "open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}

/* ADD PROPERTY LINKS — preserve their position in the header */
function setupPropertyLinks() {
  document.querySelectorAll("#addPropertyLink, #ownerAddPropertyLink, [data-property-link], a[href='add-property.html'], a[href='./add-property.html']").forEach(link => {
    if (link.dataset.propertyNavigationInitialized === "true") return;
    link.dataset.propertyNavigationInitialized = "true";
    link.addEventListener("click", event => {
      event.preventDefault();
      window.location.href = isLoggedIn() ? "add-property.html" : "register.html";
    });
  });
}

/* AUTHENTICATION UI — show the signed-in user's name in the header */
function getHeaderUserName(session) {
  const user = session?.user || {};
  const metadata = user.user_metadata || {};
  const candidates = [
    metadata.full_name,
    metadata.fullName,
    metadata.name,
    metadata.display_name,
    metadata.username,
    metadata.first_name,
    user.full_name,
    user.name,
    user.email ? String(user.email).split("@")[0] : ""
  ];
  const name = candidates.find(value => typeof value === "string" && value.trim());
  return name ? name.trim() : "حسابي";
}

function setupStarsBalanceButton() {
  const starsLink = document.getElementById("starsBalanceLink");
  if (!starsLink) return;

  const loggedIn = Boolean(getSession());
  starsLink.hidden = !loggedIn;
  starsLink.style.display = loggedIn ? "inline-flex" : "none";

  const botUrl = String(starsLink.dataset.botUrl || "").trim();
  if (botUrl) {
    starsLink.href = botUrl;
    starsLink.target = "_blank";
    starsLink.rel = "noopener noreferrer";
  } else {
    starsLink.href = "#buy-stars";
    starsLink.removeAttribute("target");
    starsLink.removeAttribute("rel");
  }

  if (starsLink.dataset.clickInitialized === "true") return;
  starsLink.dataset.clickInitialized = "true";
  starsLink.addEventListener("click", event => {
    const currentBotUrl = String(starsLink.dataset.botUrl || "").trim();
    if (!currentBotUrl) {
      event.preventDefault();
      alert("زر رصيد النجوم جاهز، بقي إضافة رابط بوت شراء النجوم.");
      return;
    }
    event.preventDefault();
    window.open(currentBotUrl, "_blank", "noopener,noreferrer");
  });
}

function setupAuthenticationLinks() {
  const session = getSession();
  const loggedIn = Boolean(session);
  const loginLink = document.getElementById("loginLink");
  const accountName = document.getElementById("accountName");
  const logoutLink = document.getElementById("siteLogoutLink");
  const adminLink = document.getElementById("adminDashboardLink");
  const userName = loggedIn ? getHeaderUserName(session) : "";

  // Hide the hero sign-up/sign-in buttons after authentication; restore them for guests.
  document.querySelectorAll(".hero-register, .hero-login, [data-guest-only='auth']").forEach(link => {
    link.hidden = loggedIn;
    link.style.display = loggedIn ? "none" : "";
  });

  // Support either markup style: a dedicated account-name element or the existing login link.
  if (accountName) {
    accountName.textContent = userName;
    accountName.hidden = !loggedIn;
    accountName.style.display = loggedIn ? "" : "none";
  }
  if (loginLink) {
    if (loggedIn) {
      loginLink.textContent = userName;
      loginLink.href = "#account";
      loginLink.hidden = false;
      loginLink.style.display = "";
      loginLink.setAttribute("aria-label", "تم تسجيل الدخول باسم " + userName);
      loginLink.title = "تم تسجيل الدخول";
      if (loginLink.dataset.accountNameClickInitialized !== "true") {
        loginLink.dataset.accountNameClickInitialized = "true";
        loginLink.addEventListener("click", event => {
          if (getSession()) event.preventDefault();
        });
      }
    } else {
      loginLink.textContent = "تسجيل الدخول";
      loginLink.href = "login.html";
      loginLink.hidden = false;
      loginLink.style.display = "";
      loginLink.removeAttribute("aria-label");
      loginLink.removeAttribute("title");
    }
  }
  if (logoutLink) {
    logoutLink.hidden = !loggedIn;
    logoutLink.style.display = loggedIn ? "" : "none";
  }
  if (adminLink) {
    adminLink.hidden = true;
    adminLink.style.display = "none";
  }

  document.querySelectorAll('[data-auth-link="my-properties"]').forEach(link => { link.hidden = !loggedIn; });
  document.querySelectorAll('[data-auth-link="logout"]').forEach(link => { link.hidden = !loggedIn; });
  document.querySelectorAll('[data-auth-link="login"]').forEach(link => {
    link.textContent = loggedIn ? userName : "تسجيل الدخول";
    link.href = loggedIn ? "#account" : "login.html";
    link.hidden = false;
  });
  document.querySelectorAll('[data-auth-link="register"]').forEach(link => {
    if (loggedIn) { link.textContent = "إعلاناتي"; link.href = "add-property.html"; }
  });

  document.querySelectorAll("[data-logout], #siteLogoutLink").forEach(control => {
    if (control.dataset.logoutInitialized === "true") return;
    control.dataset.logoutInitialized = "true";
    control.addEventListener("click", event => {
      event.preventDefault();
      localStorage.removeItem("supabaseSession");
      window.location.replace("index.html");
    });
  });
}

/* ADMIN DASHBOARD — verify membership in admin_users; UI visibility is not authorization */
async function setupAdminDashboardButton() {
  const adminLink = document.getElementById("adminDashboardLink");
  const session = getSession();
  if (!adminLink || !session?.access_token || !session.user?.id) {
    if (adminLink) { adminLink.hidden = true; adminLink.style.display = "none"; }
    return;
  }
  try {
    const params = new URLSearchParams({ select: "user_id", user_id: "eq." + session.user.id, limit: "1" });
    const response = await fetch(SUPABASE_URL + "/rest/v1/admin_users?" + params.toString(), {
      method: "GET",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + session.access_token }
    });
    if (!response.ok) {
      console.warn("تعذر التحقق من صلاحيات المسؤول:", response.status);
      adminLink.hidden = true;
      adminLink.style.display = "none";
      return;
    }
    const admins = await response.json();
    const isAdmin = Array.isArray(admins) && admins.some(admin => String(admin.user_id) === String(session.user.id));
    adminLink.hidden = !isAdmin;
    adminLink.style.display = isAdmin ? "" : "none";
  } catch (error) {
    console.error("حدث خطأ أثناء التحقق من المسؤول:", error);
    adminLink.hidden = true;
    adminLink.style.display = "none";
  }
}

/* ONE INITIALIZATION PATH */
function initializeRealEstateSite() {
  setupAuthenticationLinks();
  setupStarsBalanceButton();
  setupPropertyLinks();
  setupSearchForm();
  setupCategoryCards();
  setupMobileNavigation();
  populateWilayaSelects();
  setupAdminDashboardButton();
  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());
  if (document.getElementById("propertiesGrid")) renderProperties();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeRealEstateSite, { once: true });
} else {
  initializeRealEstateSite();
}
