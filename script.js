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
  const userName = getCurrentUserName();

  document.querySelectorAll("[data-auth-link]").forEach(
    function (link) {
      const type = link.dataset.authLink;

      if (type === "login" && loggedIn) {
        link.textContent = "حسابي";
        link.href = "my-properties.html";
      }

      if (type === "register" && loggedIn) {
        link.textContent = "إعلاناتي";
        link.href = "my-properties.html";
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

  if (loginLink && loggedIn) {
    loginLink.textContent = "حسابي";
    loginLink.href = "my-properties.html";
  }

  const accountName = document.getElementById("accountName");

  if (accountName) {
    if (loggedIn && userName) {
      accountName.textContent = userName;
      accountName.hidden = false;
    } else {
      accountName.textContent = "";
      accountName.hidden = true;
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
   CATEGORY VALUE NORMALIZATION
   ========================================== */

function normalizeCategory(category) {
  const aliases = {
    building_land: "land",
    agricultural_land: "farm"
  };

  return aliases[category] || category;
}

/* ==========================================
   INITIALIZATION
   ========================================== */

function initializeRealEstateSite() {
  populateWilayaSelects();

  setupSearchForm();

  setupCategoryCards();

  setupMobileNavigation();

  setupAuthenticationLinks();

  setupPropertyLinks();

  renderProperties();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeRealEstateSite,
    { once: true }
  );
} else {
  initializeRealEstateSite();
}

/* ==========================================
   GLOBAL HELPERS
   ========================================== */

window.DZRealEstate = {
  fetchPublishedProperties,
  renderProperties,
  formatPrice,
  formatDate,
  getCategoryLabel,
  getOperationLabel,
  escapeHTML,
  getSession,
  getCurrentUserId,
  getCurrentUserName,
  isLoggedIn,
  supabaseRequest,
  showMessage,
  clearMessage,
  normalizeCategory,
  WILAYAS
};
