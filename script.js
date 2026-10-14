/* ==========================================
   مملكة العقار المباشر DZ
   Main JavaScript
   Supabase + Property Search + Navigation
   ========================================== */

"use strict";

/* ==========================================
   SUPABASE CONFIGURATION
   ========================================== */

const SUPABASE_URL =
  "https://fppzejxdggnlscjcqmgk.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_qhAVIMpyEcE_Y_7L_9irrQ_Naru1RBC";

const PROPERTY_FIELDS = [
  "id",
  "title",
  "description",
  "category",
  "operation",
  "wilaya",
  "commune",
  "price",
  "area_m2",
  "bedrooms",
  "bathrooms",
  "created_at"
].join(",");

/* ==========================================
   ALGERIAN WILAYAS
   ========================================== */

const WILAYAS = [
  "أدرار",
  "الشلف",
  "الأغواط",
  "أم البواقي",
  "باتنة",
  "بجاية",
  "بسكرة",
  "بشار",
  "البليدة",
  "البويرة",
  "تمنراست",
  "تبسة",
  "تلمسان",
  "تيارت",
  "تيزي وزو",
  "الجزائر",
  "الجلفة",
  "جيجل",
  "سطيف",
  "سعيدة",
  "سكيكدة",
  "سيدي بلعباس",
  "عنابة",
  "قالمة",
  "قسنطينة",
  "المدية",
  "مستغانم",
  "المسيلة",
  "معسكر",
  "ورقلة",
  "وهران",
  "البيض",
  "إليزي",
  "برج بوعريريج",
  "بومرداس",
  "الطارف",
  "تندوف",
  "تيسمسيلت",
  "الوادي",
  "خنشلة",
  "سوق أهراس",
  "تيبازة",
  "ميلة",
  "عين الدفلى",
  "النعامة",
  "عين تموشنت",
  "غرداية",
  "غليزان",
  "تيميمون",
  "برج باجي مختار",
  "أولاد جلال",
  "بني عباس",
  "عين صالح",
  "عين قزام",
  "تقرت",
  "جانت",
  "المغير",
  "المنيعة"
];

/* ==========================================
   CATEGORY LABELS
   ========================================== */

const CATEGORY_LABELS = {
  apartment: "شقة",
  house: "منزل",
  land: "أرض للبناء",
  farm: "أرض فلاحية",
  commercial: "محل تجاري"
};

const OPERATION_LABELS = {
  sale: "للبيع",
  rent: "للكراء"
};

/* ==========================================
   GENERAL HELPERS
   ========================================== */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
}

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "السعر غير محدد";
  }

  return new Intl.NumberFormat("fr-DZ", {
    maximumFractionDigits: 2
  }).format(number) + " دج";
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[normalizeCategory(category)] || "عقار";
}

function getOperationLabel(operation) {
  return OPERATION_LABELS[operation] || "عقار";
}

/* ==========================================
   SESSION MANAGEMENT
   ========================================== */

function getSession() {
  try {
    const raw = localStorage.getItem("supabaseSession");

    if (!raw) return null;

    const session = JSON.parse(raw);

    if (!session || typeof session !== "object") {
      return null;
    }

    if (!session.access_token) {
      return null;
    }

    if (
      session.expires_at &&
      Number(session.expires_at) * 1000 <= Date.now()
    ) {
      return null;
    }

    if (
      session.expires_at &&
      !Number.isFinite(Number(session.expires_at))
    ) {
      return null;
    }

    if (!session.user || !session.user.id) {
      return null;
    }

    return session;
  } catch (error) {
    console.warn("تعذرت قراءة جلسة المستخدم.");
    return null;
  }
}

function getCurrentUserId() {
  const session = getSession();

  return session?.user?.id || null;
}

function isLoggedIn() {
  return Boolean(getCurrentUserId());
}

function getCurrentUserName() {
  const session = getSession();
  const user = session?.user;

  if (!user) return "";

  const metadata = user.user_metadata || {};

  return (
    metadata.full_name ||
    metadata.name ||
    metadata.fullName ||
    user.email ||
    ""
  );
}

/* ==========================================
   SUPABASE REST HELPERS
   ========================================== */

async function supabaseRequest(path, options = {}) {
  const session = getSession();

  const headers = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (session?.access_token) {
    headers.Authorization = "Bearer " + session.access_token;
  } else {
    headers.Authorization = "Bearer " + SUPABASE_KEY;
  }

  const response = await fetch(
    SUPABASE_URL + path,
    {
      ...options,
      headers
    }
  );

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error_description ||
      data?.error ||
      "حدث خطأ أثناء الاتصال بالخادم.";

    throw new Error(message);
  }

  return data;
}

/* ==========================================
   NOTIFICATIONS
   ========================================== */

function showMessage(
  message,
  type = "info",
  containerId = null
) {
  const container = containerId
    ? document.getElementById(containerId)
    : null;

  const target =
    container || document.getElementById("globalMessage");

  if (!target) {
    console.log(message);
    return;
  }

  target.textContent = message;

  target.className =
    "alert " +
    (
      type === "success"
        ? "alert-success"
        : type === "error"
          ? "alert-error"
          : type === "warning"
            ? "alert-warning"
            : "alert-info"
    );

  target.hidden = false;
}

function clearMessage(containerId) {
  const target = document.getElementById(containerId);

  if (target) {
    target.textContent = "";
    target.hidden = true;
  }
}

/* ==========================================
   WILAYA SELECTS
   ========================================== */

function populateWilayaSelects() {
  const selects = document.querySelectorAll(
    'select[name="wilaya"], #wilayaFilter, #wilaya'
  );

  selects.forEach(function (select) {
    const currentValue = select.value;
    const existingOptions = Array.from(select.options);

    const hasDefaultOption = existingOptions.some(
      function (option) {
        return option.value === "";
      }
    );

    select.innerHTML = "";

    if (hasDefaultOption) {
      const placeholder = document.createElement("option");

      placeholder.value = "";
      placeholder.textContent =
        select.dataset.placeholder || "كل الولايات";

      select.appendChild(placeholder);
    }

    WILAYAS.forEach(function (wilaya) {
      const option = document.createElement("option");

      option.value = wilaya;
      option.textContent = wilaya;

      select.appendChild(option);
    });

    if (
      currentValue &&
      Array.from(select.options).some(
        option => option.value === currentValue
      )
    ) {
      select.value = currentValue;
    }
  });
}

/* ==========================================
   PROPERTY QUERY
   ========================================== */

async function fetchPublishedProperties(filters = {}) {
  const params = new URLSearchParams();

  params.set("select", PROPERTY_FIELDS);
  params.set("status", "eq.published");
  params.set("order", "created_at.desc");
  params.set("limit", "60");

  if (filters.operation) {
    params.set("operation", "eq." + filters.operation);
  }

  if (filters.category) {
    params.set(
      "category",
      "eq." + normalizeCategory(filters.category)
    );
  }

  if (filters.wilaya) {
    params.set("wilaya", "eq." + filters.wilaya);
  }

  if (filters.search) {
    const search = filters.search.trim();

    if (search) {
      const safeSearch = search.replace(/[(),]/g, " ");

      params.set(
        "or",
        "(title.ilike.*" +
          safeSearch +
          "*,commune.ilike.*" +
          safeSearch +
          "*,wilaya.ilike.*" +
          safeSearch +
          "*)"
      );
    }
  }

  return await supabaseRequest(
    "/rest/v1/properties?" + params.toString()
  );
}

/* ==========================================
   PROPERTY CARD
   ========================================== */

function createPropertyCard(property) {
  const card = document.createElement("article");

  card.className = "property-card";

  const category = getCategoryLabel(property.category);
  const operation = getOperationLabel(property.operation);

  const location = [
    property.commune,
    property.wilaya
  ].filter(Boolean).join("، ");

  const area = property.area_m2
    ? escapeHTML(property.area_m2) + " م²"
    : "";

  const bedrooms =
    property.bedrooms !== null &&
    property.bedrooms !== undefined
      ? escapeHTML(property.bedrooms) + " غرف"
      : "";

  const bathrooms =
    property.bathrooms !== null &&
    property.bathrooms !== undefined
      ? escapeHTML(property.bathrooms) + " حمامات"
      : "";

  const meta = [area, bedrooms, bathrooms]
    .filter(Boolean)
    .map(item => "<span>" + item + "</span>")
    .join("");

  const description = String(property.description || "");

  const shortDescription =
    description.length > 115
      ? description.slice(0, 115) + "…"
      : description;

  card.innerHTML = `
    <div class="property-image">
      <div class="property-placeholder"
           style="
             height:100%;
             display:flex;
             flex-direction:column;
             align-items:center;
             justify-content:center;
             gap:8px;
             color:#087fa3;
             background:linear-gradient(135deg,#e6f5fa,#fff9eb);
           ">
        <span style="font-size:42px" aria-hidden="true">⌂</span>
        <span style="font-size:12px">مملكة العقار المباشر</span>
      </div>

      <span
        style="
          position:absolute;
          top:12px;
          right:12px;
          background:#087fa3;
          color:#fff;
          padding:5px 11px;
          border-radius:7px;
          font-size:12px;
          font-weight:bold;
        "
      >${escapeHTML(operation)}</span>
    </div>

    <div class="property-card-content">
      <div class="property-meta">
        <span>${escapeHTML(category)}</span>
      </div>

      <h3 class="property-title">
        ${escapeHTML(property.title)}
      </h3>

      <div class="property-location">
        <span aria-hidden="true">📍</span>
        <span>${escapeHTML(location || "الجزائر")}</span>
      </div>

      <div class="property-price">
        ${escapeHTML(formatPrice(property.price))}
      </div>

      ${
        meta
          ? `<div class="property-meta">${meta}</div>`
          : ""
      }

      ${
        shortDescription
          ? `<p>${escapeHTML(shortDescription)}</p>`
          : ""
      }

      <a
        class="btn btn-primary"
        href="property-details.html?id=${encodeURIComponent(property.id)}"
      >عرض تفاصيل العقار</a>
    </div>
  `;

  return card;
}

/* ==========================================
   EMPTY STATE
   ========================================== */

function showEmptyProperties(container, message) {
  container.innerHTML = "";

  const empty = document.createElement("div");

  empty.className = "empty-state";
  empty.style.gridColumn = "1 / -1";

  const title = document.createElement("h3");

  title.textContent = "لا توجد إعلانات لعرضها";

  const paragraph = document.createElement("p");

  paragraph.textContent =
    message ||
    "لم نعثر على عقارات مطابقة للبحث. جرّب تغيير خيارات البحث.";

  empty.appendChild(title);
  empty.appendChild(paragraph);

  container.appendChild(empty);
}

/* ==========================================
   RENDER PROPERTIES
   ========================================== */

async function renderProperties(filters = {}) {
  const container = document.getElementById("propertiesGrid");

  if (!container) return;

  container.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1">
      <p>جارٍ تحميل العقارات المنشورة...</p>
    </div>
  `;

  try {
    const properties = await fetchPublishedProperties(filters);

    container.innerHTML = "";

    if (!Array.isArray(properties) || properties.length === 0) {
      showEmptyProperties(
        container,
        "لا توجد إعلانات منشورة تطابق خيارات البحث حاليًا."
      );

      return;
    }

    properties.forEach(function (property) {
      container.appendChild(createPropertyCard(property));
    });
  } catch (error) {
    console.error("تعذر تحميل العقارات:", error);

    showEmptyProperties(
      container,
      "تعذر تحميل العقارات الآن. تحقق من اتصال الإنترنت وحاول مجددًا."
    );

    const retry = document.createElement("button");

    retry.type = "button";
    retry.className = "btn btn-outline";
    retry.textContent = "إعادة المحاولة";

    retry.addEventListener("click", function () {
      renderProperties(filters);
    });

    container.appendChild(retry);
  }
}

/* ==========================================
   SEARCH FORM
   ========================================== */

function setupSearchForm() {
  const form =
    document.getElementById("searchForm") ||
    document.querySelector(".search-form");

  if (!form || form.dataset.searchInitialized === "true") {
    return;
  }

  form.dataset.searchInitialized = "true";

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const operation =
      form.querySelector('[name="operation"]')?.value || "";

    const category =
      form.querySelector('[name="category"]')?.value || "";

    const wilaya =
      form.querySelector('[name="wilaya"]')?.value || "";

    const search =
      form.querySelector(
        '[name="search"], [name="keyword"], [name="query"]'
      )?.value || "";

    renderProperties({
      operation,
      category,
      wilaya,
      search
    });

    const propertiesSection =
      document.getElementById("propertiesSection") ||
      document.getElementById("propertiesGrid");

    propertiesSection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

/* ==========================================
   CATEGORY FILTERS
   ========================================== */

function setupCategoryCards() {
  const categoryCards = document.querySelectorAll(
    "[data-category], .category-card"
  );

  categoryCards.forEach(function (card) {
    if (card.dataset.categoryInitialized === "true") {
      return;
    }

    card.dataset.categoryInitialized = "true";

    card.addEventListener("click", function () {
      const category =
        card.dataset.category ||
        card.getAttribute("data-filter") ||
        "";

      if (!category) return;

      renderProperties({
        category: normalizeCategory(category)
      });

      const propertiesSection =
        document.getElementById("propertiesSection") ||
        document.getElementById("propertiesGrid");

      propertiesSection?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

/* ==========================================
   MOBILE NAVIGATION
   ========================================== */

function setupMobileNavigation() {
  const toggle =
    document.querySelector(".nav-toggle") ||
    document.querySelector(".menu-toggle") ||
    document.querySelector(".mobile-menu-btn");

  const nav =
    document.querySelector(".nav-links") ||
    document.querySelector(".nav-menu") ||
    document.querySelector("header nav");

  if (!toggle || !nav) return;

  if (toggle.dataset.navigationInitialized === "true") {
    return;
  }

  toggle.dataset.navigationInitialized = "true";

  toggle.addEventListener("click", function () {
    const isOpen = nav.classList.toggle("active");

    nav.classList.toggle("open", isOpen);

    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("active", "open");

      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ==========================================
   PROPERTY LINKS
   ========================================== */

function setupPropertyLinks() {
  const propertyLinks = document.querySelectorAll(
    "#addPropertyLink, " +
    "#ownerAddPropertyLink, " +
    "[data-property-link], " +
    'a[href="add-property.html"], ' +
    'a[href="./add-property.html"]'
  );

  propertyLinks.forEach(function (link) {
    if (link.dataset.propertyNavigationInitialized === "true") {
      return;
    }

    link.dataset.propertyNavigationInitialized = "true";

    link.addEventListener("click", function (event) {
      event.preventDefault();

      if (isLoggedIn()) {
        window.location.href = "add-property.html";
        return;
      }

      window.location.href = "register.html";
    });
  });
}

/* ==========================================
   AUTHENTICATION NAVIGATION
   ========================================== */

function setupAuthenticationLinks() {
  const session = getSession();
  const loggedIn = Boolean(session);
  const user = session?.user || {};
  const metadata = user.user_metadata || {};

  const userName =
    metadata.full_name ||
    metadata.name ||
    metadata.fullName ||
    user.email ||
    getCurrentUserName() ||
    "";

  document.querySelectorAll("[data-auth-link]").forEach(
    function (link) {
      const type = link.dataset.authLink;

      if (type === "login") {
        link.textContent = loggedIn
          ? "حسابي"
          : "تسجيل الدخول";

        link.href = loggedIn
          ? "add-property.html"
          : "login.html";
      }

      if (type === "register") {
        if (loggedIn) {
          link.textContent = "إعلاناتي";
          link.href = "add-property.html";
        }
      }

      if (type === "my-properties") {
        link.hidden = !loggedIn;
      }

      if (type === "logout") {
        link.hidden = !loggedIn;
      }
    }
  );

  const loginLink = document.getElementById("loginLink");

  if (loginLink) {
    loginLink.textContent = loggedIn
      ? "حسابي"
      : "تسجيل الدخول";

    loginLink.href = loggedIn
      ? "add-property.html"
      : "login.html";
  }

  const accountName = document.getElementById("accountName");

  if (accountName) {
    if (loggedIn && userName) {
      accountName.textContent = "👤 " + userName;
      accountName.hidden = false;
      accountName.style.display = "inline-block";
    } else {
      accountName.textContent = "";
      accountName.hidden = true;
      accountName.style.display = "none";
    }
  }

  document.querySelectorAll("[data-logout]").forEach(
    function (button) {
      if (button.dataset.logoutInitialized === "true") {
        return;
      }

      button.dataset.logoutInitialized = "true";

      button.addEventListener("click", function (event) {
        event.preventDefault();

        localStorage.removeItem("supabaseSession");

        window.location.href = "index.html";
      });
    }
  );
}

/* ==========================================
   SITE INITIALIZATION
   ========================================== */

function initializeRealEstateSite() {
  setupAuthenticationLinks();
  setupPropertyLinks();
  setupSearchForm();
  setupCategoryCards();
  setupMobileNavigation();
  populateWilayaSelects();

  if (document.getElementById("propertiesGrid")) {
    renderProperties();
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeRealEstateSite,
    { once: true }
  );
} else {
   /* ==========================================
   ADMIN DASHBOARD BUTTON
   يظهر للمسؤول المعتمد فقط
   ========================================== */

async function setupAdminDashboardButton() {
  const session = getSession();

  // لا تعرض الزر إذا لم توجد جلسة دخول
  if (!session || !session.access_token) {
    return;
  }

  try {
    // التحقق من صلاحية المسؤول من قاعدة البيانات
    const response = await fetch(
      SUPABASE_URL + "/rest/v1/rpc/is_admin",
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + session.access_token,
          "Content-Type": "application/json"
        },
        body: "{}"
      }
    );

    if (!response.ok) {
      console.warn("تعذر التحقق من صلاحية المسؤول.");
      return;
    }

    const isAdmin = await response.json();

    // لا تنشئ الزر إلا إذا أكد الخادم صلاحية المسؤول
    if (isAdmin !== true) {
      return;
    }

    // منع إنشاء الزر أكثر من مرة
    if (document.getElementById("adminDashboardLink")) {
      return;
    }

    const loginLink = document.getElementById("loginLink");

    if (!loginLink || !loginLink.parentElement) {
      return;
    }

    const adminLink = document.createElement("a");

    adminLink.id = "adminDashboardLink";
    adminLink.href = "admin.html";
    adminLink.textContent = "لوحة التحكم";
    adminLink.setAttribute("aria-label", "فتح لوحة تحكم المسؤول");

    adminLink.style.cssText = [
      "display:inline-block",
      "padding:8px 12px",
      "margin:4px",
      "border-radius:8px",
      "background:#176b45",
      "color:#ffffff",
      "font-size:13px",
      "font-weight:bold",
      "text-decoration:none",
      "white-space:nowrap"
    ].join(";");

    loginLink.parentElement.insertBefore(
      adminLink,
      loginLink
    );

  } catch (error) {
    console.error(
      "تعذر التحقق من صلاحية المسؤول:",
      error
    );
  }
}

// تشغيل التحقق بعد تجهيز الصفحة
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    setupAdminDashboardButton,
    { once: true }
  );
} else {
  /* ==========================================
   ADMIN DASHBOARD BUTTON
   التحقق من جدول admin_users
   ========================================== */

async function setupAdminDashboardButton() {
  const session = getSession();

  if (!session || !session.access_token || !session.user?.id) {
    return;
  }

  try {
    const params = new URLSearchParams({
      select: "user_id",
      user_id: "eq." + session.user.id,
      limit: "1"
    });

    const response = await fetch(
      SUPABASE_URL + "/rest/v1/admin_users?" + params.toString(),
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + session.access_token
        }
      }
    );

    if (!response.ok) {
      console.warn(
        "تعذر التحقق من صلاحيات المسؤول:",
        response.status
      );
      return;
    }

    const admins = await response.json();

    // لا يظهر الزر إلا إذا كان الحساب مسجلاً ضمن المسؤولين
    if (
      !Array.isArray(admins) ||
      !admins.some(function (admin) {
        return String(admin.user_id) === String(session.user.id);
      })
/* ==========================================
   ADMIN DASHBOARD BUTTON
   التحقق من جدول admin_users
   ========================================== */

async function setupAdminDashboardButton() {
  const session = getSession();

  if (!session || !session.access_token || !session.user?.id) {
    return;
  }

  try {
    const params = new URLSearchParams({
      select: "user_id",
      user_id: "eq." + session.user.id,
      limit: "1"
    });

    const response = await fetch(
      SUPABASE_URL + "/rest/v1/admin_users?" + params.toString(),
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + session.access_token
        }
      }
    );

    if (!response.ok) {
      console.warn(
        "تعذر التحقق من صلاحيات المسؤول:",
        response.status
      );
      return;
    }

    const admins = await response.json();

    if (
      !Array.isArray(admins) ||
      !admins.some(function (admin) {
        return String(admin.user_id) === String(session.user.id);
      })
    ) {
      return;
    }

    if (document.getElementById("adminDashboardLink")) {
      return;
    }

    const loginLink = document.getElementById("loginLink");

    if (!loginLink || !loginLink.parentElement) {
      return;
    }

    const adminLink = document.createElement("a");

    adminLink.id = "adminDashboardLink";
    adminLink.href = "admin.html";
    adminLink.textContent = "لوحة التحكم";
    adminLink.setAttribute("aria-label", "لوحة تحكم المسؤول");

    adminLink.style.cssText = [
      "display:inline-block",
      "padding:8px 12px",
      "margin:4px",
      "border-radius:8px",
      "background:#176b45",
      "color:#ffffff",
      "font-size:13px",
      "font-weight:bold",
      "text-decoration:none",
      "white-space:nowrap"
    ].join(";");

    loginLink.parentElement.insertBefore(adminLink, loginLink);

  } catch (error) {
    console.error(
      "حدث خطأ أثناء التحقق من المسؤول:",
      error
    );
  }
}


/* ==========================================
   LOGOUT BUTTON
   زر تسجيل الخروج
   ========================================== */

function setupLogoutButton() {
  const session = getSession();
  const loginLink = document.getElementById("loginLink");

  let logoutButton = document.getElementById("siteLogoutButton");

  if (!session) {
    if (logoutButton) {
      logoutButton.remove();
    }

    return;
  }

  if (!loginLink || !loginLink.parentElement) {
    return;
  }

  if (logoutButton) {
    return;
  }

  logoutButton = document.createElement("button");

  logoutButton.id = "siteLogoutButton";
  logoutButton.type = "button";
  logoutButton.textContent = "تسجيل الخروج";
  logoutButton.setAttribute("aria-label", "تسجيل الخروج من الحساب");

  logoutButton.style.cssText = [
    "display:inline-block",
    "padding:8px 12px",
    "margin:4px",
    "border:1px solid #ddd",
    "border-radius:8px",
    "background:#ffffff",
    "color:#b42318",
    "font-size:13px",
    "font-weight:bold",
    "cursor:pointer",
    "white-space:nowrap"
  ].join(";");

  logoutButton.addEventListener("click", function () {
    localStorage.removeItem("supabaseSession");

    window.location.replace("index.html");
  });

  loginLink.insertAdjacentElement("afterend", logoutButton);
}


/* ==========================================
   SITE INITIALIZATION
   تهيئة الموقع
   ========================================== */

function initializeRealEstateSite() {
  setupAuthenticationLinks();
  setupPropertyLinks();
  setupSearchForm();
  setupCategoryCards();
  setupMobileNavigation();
  populateWilayaSelects();

  setupLogoutButton();
  setupAdminDashboardButton();

  if (document.getElementById("propertiesGrid")) {
    renderProperties();
  }
}


/* ==========================================
   START APPLICATION
   ========================================== */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeRealEstateSite,
    { once: true }
  );
} else {
  initializeRealEstateSite();
}
