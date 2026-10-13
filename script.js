"use strict";

/*
 * مملكة العقار المباشر DZ
 * ربط البحث بقاعدة بيانات Supabase
 */

// ======================================
// 1. إعدادات الاتصال
// ======================================

const SUPABASE_URL = "https://fppzejxdggnlscjcqmgk.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_qhAVIMpyEcE_Y_7L_9irrQ_Naru1RBC";

const PROPERTIES_ENDPOINT =
    SUPABASE_URL + "/rest/v1/properties";


// ======================================
// 2. الولايات الجزائرية الـ 69
// ======================================

const wilayas = [
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
    "المنيعة",
    "أفلو",
    "بريكة",
    "القنطرة",
    "بئر العاتر",
    "العريشة",
    "قصر الشلالة",
    "عين وسارة",
    "مسعد",
    "قصر البخاري",
    "بوسعادة",
    "الأبيض سيدي الشيخ"
];


// ======================================
// 3. ترجمة أنواع العقارات
// ======================================

const categoryLabels = {
    apartment: "شقة",
    house: "منزل",
    land: "أرض للبناء",
    farm: "أرض فلاحية",
    commercial: "عقار تجاري"
};

const operationLabels = {
    sale: "للبيع",
    rent: "للكراء"
};


// ======================================
// 4. تحويل خيارات الواجهة إلى قاعدة البيانات
// ======================================

function normalizeCategory(category) {

    const categories = {
        apartment: "apartment",
        house: "house",
        building_land: "land",
        agricultural_land: "farm",
        commercial: "commercial"
    };

    return categories[category] || category;
}


// ======================================
// 5. حماية النصوص عند عرض الإعلانات
// ======================================

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        function (character) {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        }
    );
}


// ======================================
// 6. تنسيق السعر بالدينار الجزائري
// ======================================

function formatPrice(price) {

    if (price === null || price === undefined || price === "") {
        return "السعر عند الاتصال";
    }

    const number = Number(price);

    if (!Number.isFinite(number)) {
        return "السعر عند الاتصال";
    }

    return new Intl.NumberFormat("fr-DZ", {
        maximumFractionDigits: 2
    }).format(number) + " دج";
}


// ======================================
// 7. حالات العرض والرسائل
// ======================================

function showMessage(grid, title, message) {

    grid.innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">🏘️</span>
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}


// ======================================
// 8. تنسيق بطاقات العقارات
// دون تعديل ملف CSS
// ======================================

function installPropertyStyles() {

    if (document.getElementById("propertyDynamicStyles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "propertyDynamicStyles";

    style.textContent = `
        .property-card {
            background: #ffffff;
            border: 1px solid #e3e9e5;
            border-radius: 14px;
            padding: 20px;
            margin-bottom: 4px;
            box-shadow: 0 4px 16px rgba(18, 53, 43, 0.06);
            overflow-wrap: anywhere;
        }

        .property-card h3 {
            color: #12352b;
            margin: 10px 0;
            font-size: 1.15rem;
        }

        .property-card .property-price {
            color: #176b4b;
            font-size: 1.1rem;
            font-weight: 700;
            margin: 12px 0;
        }

        .property-card .property-location {
            color: #52645b;
            margin: 8px 0;
        }

        .property-card .property-description {
            color: #46564d;
            line-height: 1.8;
            overflow-wrap: anywhere;
        }

        .property-card .property-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 12px 0;
        }

        .property-card .property-tag {
            background: #eef5f0;
            color: #12352b;
            padding: 5px 10px;
            border-radius: 7px;
            font-size: 0.88rem;
        }

        .property-card .property-operation {
            display: inline-block;
            background: #12352b;
            color: #ffffff;
            padding: 5px 12px;
            border-radius: 7px;
            font-size: 0.9rem;
        }

        .property-card .property-contact-note {
            color: #66736b;
            font-size: 0.9rem;
            line-height: 1.7;
            margin-top: 12px;
        }

        .property-results-count {
            margin-bottom: 16px;
            color: #52645b;
        }
    `;

    document.head.appendChild(style);
}


// ======================================
// 9. عرض العقارات في الصفحة
// ======================================

function renderProperties(grid, properties) {

    if (!properties || properties.length === 0) {

        showMessage(
            grid,
            "لا توجد إعلانات مطابقة",
            "لم نعثر على عقارات منشورة بهذه المواصفات. جرّب تغيير خيارات البحث."
        );

        return;
    }

    grid.innerHTML = "";

    properties.forEach(function (property) {

        const category =
            categoryLabels[property.category] || "عقار";

        const operation =
            operationLabels[property.operation] || "";

        const location = [
            property.commune,
            property.wilaya
        ].filter(Boolean).join("، ");

        const details = [];

        if (property.area_m2 !== null &&
            property.area_m2 !== undefined) {

            details.push(
                "المساحة: " + escapeHTML(property.area_m2) + " م²"
            );
        }

        if (property.bedrooms !== null &&
            property.bedrooms !== undefined) {

            details.push(
                "الغرف: " + escapeHTML(property.bedrooms)
            );
        }

        if (property.bathrooms !== null &&
            property.bathrooms !== undefined) {

            details.push(
                "الحمامات: " + escapeHTML(property.bathrooms)
            );
        }

        const card = document.createElement("article");

        card.className = "property-card";

        card.innerHTML = `
            <span class="property-operation">
                ${escapeHTML(operation || category)}
            </span>

            <h3>${escapeHTML(property.title || "عقار معروض")}</h3>

            <p class="property-location">
                📍 ${escapeHTML(location || "الموقع غير محدد")}
            </p>

            <p>
                نوع العقار:
                ${escapeHTML(category)}
            </p>

            <p class="property-price">
                ${escapeHTML(formatPrice(property.price))}
            </p>

            ${
                details.length
                    ? `
                        <div class="property-tags">
                            ${details.map(function (detail) {
                                return `
                                    <span class="property-tag">
                                        ${detail}
                                    </span>
                                `;
                            }).join("")}
                        </div>
                    `
                    : ""
            }

            ${
                property.description
                    ? `
                        <p class="property-description">
                            ${escapeHTML(property.description)}
                        </p>
                    `
                    : ""
            }

            <p class="property-contact-note">
                تصفح التفاصيل مجانًا. ستُفعّل خيارات التواصل
                عند اكتمال نظام الاتصال والدفع.
            </p>
        `;

        grid.appendChild(card);
    });
}


// ======================================
// 10. تحميل الإعلانات المنشورة والبحث
// ======================================

async function loadProperties() {

    const grid = document.getElementById("propertiesGrid");

    if (!grid) {
        return;
    }

    showMessage(
        grid,
        "جارٍ تحميل العقارات...",
        "يرجى الانتظار قليلًا."
    );

    const params = new URLSearchParams();

    params.set(
        "select",
        "id,title,description,category,operation,wilaya,commune,price,area_m2,bedrooms,bathrooms,created_at"
    );

    // لا نعرض إلا الإعلانات المنشورة
    params.set("status", "eq.published");

    // الأحدث أولًا
    params.set("order", "created_at.desc");

    // حد أقصى 30 إعلانًا في هذه المرحلة
    params.set("limit", "30");

    const operationElement = document.getElementById("operation");
    const categoryElement = document.getElementById("propertyType");
    const wilayaElement = document.getElementById("wilaya");

    const operation = operationElement
        ? operationElement.value
        : "";

    const selectedCategory = categoryElement
        ? categoryElement.value
        : "";

    const wilaya = wilayaElement
        ? wilayaElement.value
        : "";

    if (operation) {
        params.set("operation", "eq." + operation);
    }

    if (selectedCategory) {

        const databaseCategory =
            normalizeCategory(selectedCategory);

        params.set(
            "category",
            "eq." + databaseCategory
        );
    }

    if (wilaya) {
        params.set("wilaya", "eq." + wilaya);
    }

    const requestURL =
        PROPERTIES_ENDPOINT + "?" + params.toString();

    try {

        const response = await fetch(requestURL, {

            method: "GET",

            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY
            }

        });

        if (!response.ok) {

            const errorText = await response.text();

            console.error(
                "Supabase error:",
                response.status,
                errorText
            );

            showMessage(
                grid,
                "تعذر تحميل الإعلانات",
                "حدث خطأ في الاتصال بقاعدة البيانات. سنحتاج إلى التحقق من إعدادات الوصول إلى جدول العقارات."
            );

            return;
        }

        const properties = await response.json();

        renderProperties(grid, properties);

    } catch (error) {

        console.error(
            "Connection error:",
            error
        );

        showMessage(
            grid,
            "تعذر الاتصال",
            "تحقق من اتصال الإنترنت ثم أعد تحميل الصفحة."
        );
    }
}


// ======================================
// 11. تشغيل الموقع
// ======================================

document.addEventListener("DOMContentLoaded", function () {

    // السنة الحالية
    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    // قائمة التنقل على الهاتف
    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("mainNav");

    if (menuToggle && mainNav) {

        menuToggle.addEventListener("click", function () {

            const isOpen = mainNav.classList.toggle("open");

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            menuToggle.textContent = isOpen ? "✕" : "☰";
        });

        mainNav.querySelectorAll("a").forEach(function (link) {

            link.addEventListener("click", function () {

                mainNav.classList.remove("open");

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

                menuToggle.textContent = "☰";
            });
        });
    }


    // تعبئة قائمة الولايات
    const wilayaSelect = document.getElementById("wilaya");

    if (wilayaSelect) {

        wilayas.forEach(function (wilaya) {

            const option = document.createElement("option");

            option.value = wilaya;
            option.textContent = wilaya;

            wilayaSelect.appendChild(option);
        });
    }


    // تحميل أحدث العقارات عند فتح الصفحة
    installPropertyStyles();
    loadProperties();


    // البحث عند إرسال النموذج
    const searchForm = document.getElementById("searchForm");

    if (searchForm) {

        searchForm.addEventListener("submit", function (event) {

            event.preventDefault();

            loadProperties();

            const latestSection = document.getElementById("latest");

            if (latestSection) {
                latestSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    }


    // الضغط على تصنيف من الصفحة الرئيسية
    document.querySelectorAll(".category-card").forEach(
        function (card) {

            card.addEventListener("click", function () {

                const category = card.dataset.category || "";
                const operation = card.dataset.operation || "";

                const categorySelect =
                    document.getElementById("propertyType");

                const operationSelect =
                    document.getElementById("operation");

                if (categorySelect) {
                    categorySelect.value = category;
                }

                if (operationSelect && operation) {
                    operationSelect.value = operation;
                }

                // نترك رابط البطاقة ينقل المستخدم إلى قسم الإعلانات
                loadProperties();
            });
        }
    );

});
