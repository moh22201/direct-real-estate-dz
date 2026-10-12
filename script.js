"use strict";

/*
 * مملكة العقار المباشر DZ
 * التفاعلات الأساسية للواجهة
 */

document.addEventListener("DOMContentLoaded", function () {

    // السنة الحالية في تذييل الموقع
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

        // إغلاق القائمة بعد اختيار أحد الروابط
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


    /*
     * الولايات الجزائرية
     * هذه قائمة أولية، وسنراجع القائمة الرسمية
     * قبل اعتمادها نهائيًا في قاعدة البيانات.
     */

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
        "غليزان"
    ];


    // تعبئة قائمة الولايات في نموذج البحث
    const wilayaSelect = document.getElementById("wilaya");

    if (wilayaSelect) {

        wilayas.forEach(function (wilaya) {

            const option = document.createElement("option");

            option.value = wilaya;
            option.textContent = wilaya;

            wilayaSelect.appendChild(option);

        });

    }


    // نموذج البحث: الواجهة فقط في هذه المرحلة
    const searchForm = document.getElementById("searchForm");

    if (searchForm) {

        searchForm.addEventListener("submit", function (event) {

            event.preventDefault();

            const operation =
                document.getElementById("operation").value;

            const propertyType =
                document.getElementById("propertyType").value;

            const wilaya =
                document.getElementById("wilaya").value;

            const filters = {
                operation: operation,
                propertyType: propertyType,
                wilaya: wilaya
            };

            /*
             * البحث الحقيقي سيُربط بقاعدة البيانات لاحقًا.
             * لا توجد إعلانات حقيقية متصلة في هذه المرحلة.
             */

            console.log("فلاتر البحث:", filters);

            alert(
                "واجهة البحث جاهزة مبدئيًا.\n" +
                "سيتم تفعيل البحث الفعلي بعد ربط قاعدة البيانات."
            );

        });

    }


    // اختيار تصنيف من بطاقات الصفحة الرئيسية
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

            });

        }
    );

});
