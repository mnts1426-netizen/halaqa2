/**
 * ==========================================================================
 * admin.js - المحرك الإداري الشامل، عرض آخر 50 عملية للمعلمين، والفلترة بالأيام
 * مَجْمَع عبدالله بن مهدي القرآني
 * ==========================================================================
 */

window.appStore = window.appStore || {
  users: [],
  students: [],
  teachers: [],
  circles: [],
  attendance: [],
  teacherAttendance: [],
  tests: [],
  profileRequests: [],
  tasmeea: [],
  screenOrder: [],
  notifications: [],
  teacherLogs: [],
  payroll: [],
  financeRevenues: [],
  financeExpenses: [],
  settings: null,
};

window.mapPickerInstance = null;
window.mapPickerMarker = null;
window.mapPickerCircle = null;

window.screenFlipTimer = null;
window.screenDataRefreshTimer = null;
window.screenCurrentSlide = "tamayuz";

document.addEventListener("DOMContentLoaded", () => {
  const formAddStudent = document.getElementById("form-add-student");
  if (formAddStudent) {
    formAddStudent.onsubmit = function (e) {
      if (e) e.preventDefault();
      handleAddStudent(e);
    };
  }

  const formAddTeacher = document.getElementById("form-add-teacher");
  if (formAddTeacher) {
    formAddTeacher.onsubmit = function (e) {
      if (e) e.preventDefault();
      handleAddTeacher(e);
    };
  }

  const formAddCircle = document.getElementById("form-add-circle");
  if (formAddCircle) {
    formAddCircle.onsubmit = function (e) {
      if (e) e.preventDefault();
      handleSaveCircle(e);
    };
  }

  const formAddTest = document.getElementById("form-add-test");
  if (formAddTest) {
    formAddTest.onsubmit = function (e) {
      if (e) e.preventDefault();
      handleSaveTest(e);
    };
  }

  const searchStudents = document.getElementById("search-students");
  if (searchStudents) searchStudents.oninput = renderStudentsTable;

  const filterStudentCircle = document.getElementById("filter-student-circle");
  if (filterStudentCircle) filterStudentCircle.onchange = renderStudentsTable;

  const filterStudentStatus = document.getElementById("filter-student-status");
  if (filterStudentStatus) filterStudentStatus.onchange = renderStudentsTable;

  const searchTeachers = document.getElementById("search-teachers");
  if (searchTeachers) searchTeachers.oninput = renderTeachersTable;

  const searchCircles = document.getElementById("search-circles");
  if (searchCircles) searchCircles.oninput = renderCirclesCards;

  const searchAccounts = document.getElementById("search-accounts");
  if (searchAccounts) searchAccounts.oninput = renderAccountsTable;

  const filterAccountRole = document.getElementById("filter-account-role");
  if (filterAccountRole) filterAccountRole.onchange = renderAccountsTable;

  const filterAccountStatus = document.getElementById("filter-account-status");
  if (filterAccountStatus) filterAccountStatus.onchange = renderAccountsTable;

  const searchTests = document.getElementById("search-tests");
  if (searchTests) searchTests.oninput = renderTestsTable;

  const filterTestCircle = document.getElementById("filter-test-circle");
  if (filterTestCircle) filterTestCircle.onchange = renderTestsTable;

  const searchTeacherNotes = document.getElementById("search-teacher-notes");
  if (searchTeacherNotes) searchTeacherNotes.oninput = renderTeacherNotesTable;

  const filterTeacherNotesCircle = document.getElementById(
    "filter-teacher-notes-circle",
  );
  if (filterTeacherNotesCircle)
    filterTeacherNotesCircle.onchange = renderTeacherNotesTable;

  const attCircleSelect = document.getElementById("attendance-circle-select");
  if (attCircleSelect) attCircleSelect.onchange = renderAttendanceTable;

  const attDateSelect = document.getElementById("attendance-date-select");
  if (attDateSelect) {
    if (!attDateSelect.value)
      attDateSelect.value = new Date().toISOString().split("T")[0];
    attDateSelect.onchange = renderAttendanceTable;
  }

  const attSearchStudent = document.getElementById("search-attendance-student");
  if (attSearchStudent) attSearchStudent.oninput = renderAttendanceTable;

  const dashDateSelect = document.getElementById("dashboard-date-select");
  if (dashDateSelect) {
    if (!dashDateSelect.value) {
      dashDateSelect.value = new Date().toISOString().split("T")[0];
    }
    dashDateSelect.onchange = () => {
      if (typeof renderDashboardView === "function") renderDashboardView();
    };
  }

  renderExcelColumnMappingInputs();
  ensureTeacherLogsContainer();
  renderTeacherLogsTable();
});

window.isOfficialWorkday = function (dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day >= 0 && day <= 3;
};

// التأكد من توفر بطاقة سجل العمليات وبنائها برمجياً
function ensureTeacherLogsContainer() {
  if (!window.currentUser || window.currentUser.role !== "admin") return;
  if (document.getElementById("teacher-logs-card")) return;

  const dashboardView = document.getElementById("view-dashboard");
  if (!dashboardView) return;

  const logsCard = document.createElement("div");
  logsCard.id = "teacher-logs-card";
  logsCard.className = "card mb-3 nav-admin-only";
  logsCard.style.marginTop = "1rem";
  logsCard.innerHTML = `
    <div class="card-header flex-between">
      <div>
        <h3 style="color: var(--primary-brown); font-weight: 800; margin: 0;">
          📜 سجل متابعة آخر 50 عملية للمعلمين
        </h3>
        <small class="text-muted">متابعة فورية لدخول المعلمين ورصد المقررات والتحضير مع إمكانية التصفية بالأيام</small>
      </div>
      <div class="flex-align-gap no-print">
        <button class="btn btn-outline-brown btn-sm" onclick="exportTeacherLogsExcel()">📤 تصدير Excel</button>
        <button class="btn btn-outline-brown btn-sm" onclick="exportTeacherLogsPDF()">📄 تنزيل PDF</button>
        <button class="btn btn-outline-brown btn-sm" onclick="printTeacherLogs()">🖨️ طباعة</button>
      </div>
    </div>
    <div class="card-filter-bar no-print flex-between" style="flex-wrap: wrap; gap: 0.8rem;">
      <div style="display: flex; gap: 0.8rem; flex: 1; flex-wrap: wrap;">
        <input type="date" id="filter-teacher-logs-date" class="form-control select-input" onchange="renderTeacherLogsTable()" title="فلترة العمليات بتاريخ محدد" />
        <input type="text" id="search-teacher-logs" class="form-control search-input" placeholder="🔍 ابحث باسم المعلم، نوع العملية، أو اسم الطالب..." oninput="renderTeacherLogsTable()" />
      </div>
      <div>
        <button type="button" class="btn btn-outline-brown btn-sm" onclick="document.getElementById('filter-teacher-logs-date').value = ''; renderTeacherLogsTable();">
          عرض كل الأيام
        </button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="data-table" id="teacher-logs-table-element">
        <thead>
          <tr>
            <th style="width: 45px; text-align: center;">م</th>
            <th style="width: 145px; text-align: center;">التاريخ والوقت</th>
            <th>اسم المعلم</th>
            <th>نوع الإجراء</th>
            <th>الحلقة</th>
            <th>تفاصيل العملية</th>
          </tr>
        </thead>
        <tbody id="teacher-logs-table-body">
          <tr><td colspan="6" class="text-center text-muted p-3">جاري تحميل سجل العمليات...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  dashboardView.appendChild(logsCard);
}

// عرض وتصفية آخر 50 عملية للمعلمين
window.renderTeacherLogsTable = function () {
  if (!window.currentUser || window.currentUser.role !== "admin") return;
  ensureTeacherLogsContainer();
  const tbody = document.getElementById("teacher-logs-table-body");
  if (!tbody) return;

  const searchVal = (
    document.getElementById("search-teacher-logs")?.value || ""
  )
    .trim()
    .toLowerCase();
  const filterDate =
    document.getElementById("filter-teacher-logs-date")?.value || "";

  let logs = window.appStore?.teacherLogs || [];
  logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  let filtered = logs.filter((log) => {
    const matchSearch =
      !searchVal ||
      (log.teacherName && log.teacherName.toLowerCase().includes(searchVal)) ||
      (log.action && log.action.toLowerCase().includes(searchVal)) ||
      (log.details && log.details.toLowerCase().includes(searchVal)) ||
      (log.circleName && log.circleName.toLowerCase().includes(searchVal));

    const matchDate = !filterDate || log.date === filterDate;
    return matchSearch && matchDate;
  });

  const latest50 = filtered.slice(0, 50);

  if (latest50.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted p-4">لا توجد عمليات مسجلة للمعلمين في هذا التاريخ</td></tr>';
    return;
  }

  let html = "";
  latest50.forEach((item, idx) => {
    html += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td dir="ltr" style="text-align: center; font-size: 0.85rem; font-weight: 700;">${item.date} (${item.time})</td>
        <td style="font-weight: 700; color: var(--primary-brown);">${item.teacherName}</td>
        <td><span class="badge badge-active">${item.action}</span></td>
        <td><span style="font-weight: 600;">${item.circleName || "—"}</span></td>
        <td style="text-align: right; font-size: 0.88rem; line-height: 1.4;">${item.details}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
};

window.printTeacherLogs = function () {
  printTableElement("teacher-logs-table-element", "سجل آخر 50 عملية للمعلمين");
};

window.exportTeacherLogsExcel = function () {
  const table = document.getElementById("teacher-logs-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "عمليات_المعلمين" });
  XLSX.writeFile(
    wb,
    `سجل_عمليات_المعلمين_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportTeacherLogsPDF = function () {
  directDownloadPDF(
    "teacher-logs-table-element",
    "سجل_عمليات_المعلمين",
    "سجل آخر 50 عملية للمعلمين",
  );
};

// بناء ترويسة وتذييل الطباعة الرسمية الموحّدة (تثبيت اسم أحمد بن عبدالله آل مهدي للتقارير الرسمية دائماً)
window.buildOfficialPrintChrome = function (
  titleText,
  rightSubText,
  centerSubHtml,
  leftSubText,
) {
  const now = new Date();
  const dateDisplay = now.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeDisplay = now.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ملاحظة: هذه الترويسة تُستخدم أيضاً داخل تصدير Word (عبر downloadReportWord)،
  // ومحرك عرض HTML في Word لا يدعم display:flex إطلاقاً (يُهمَل تماماً فتتكدّس كل
  // العناصر عمودياً وتكبر الشعارات بلا ضابط) - لذا استُخدم تخطيط بجداول <table> هنا
  // بدل flex، فهو مدعوم بنفس الشكل في المتصفح والطباعة وWord معاً.
  const header = `
    <table style="width: 100%; border-collapse: collapse;" role="presentation">
      <tr>
        <td style="border: none; width: 130px; text-align: right; vertical-align: middle;">
          <img src="report_logo_right.png" alt="شعار المَجْمَع" style="height: 70px; width: auto; object-fit: contain;" />
        </td>
        <td style="border: none; text-align: center; vertical-align: middle;">
          <h2 style="margin: 3px 0; font-size: 1.35rem; font-weight: 900; color: #2E657E; font-family: 'Cairo', 'Tajawal', sans-serif;">مَجْمَع عبدالله بن مهدي القرآني</h2>
          <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #816105;">جامع الهدى</h4>
        </td>
        <td style="border: none; width: 130px; text-align: left; vertical-align: middle;">
          <img src="report_logo_left.png" alt="شعار المَجْمَع" style="height: 70px; width: auto; object-fit: contain;" />
        </td>
      </tr>
    </table>
    <div style="height: 2px; width: 100%; margin: 0.5rem 0; background: #C9A227;"></div>
    <table style="width: 100%; border-collapse: collapse; border-bottom: 2px double #2E657E; padding-bottom: 0.7rem; margin-bottom: 1rem;" role="presentation">
      <tr>
        <td style="border: none; width: 130px; text-align: right; padding-right: 10px; vertical-align: middle;">
          ${rightSubText ? `<div style="font-weight:800; color:#816105; font-size:0.8rem; white-space: nowrap;">${rightSubText}</div>` : ""}
        </td>
        <td style="border: none; text-align: center; vertical-align: middle;">
          <div style="display: table; max-width: 90%; margin: 0 auto; border: 1.5px solid #C9A227; border-radius: 6px; padding: 0.2rem 0.9rem; background: #DDECF3;">
            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 900; color: #2E657E; line-height: 1.3; word-break: break-word;">${titleText}</h3>
          </div>
          ${centerSubHtml ? `<div style="margin-top: 4px; font-weight: 800; color: #816105; font-size: 0.78rem; white-space: nowrap;">${centerSubHtml}</div>` : ""}
        </td>
        <td style="border: none; width: 130px; text-align: left; padding-left: 10px; vertical-align: middle;">
          ${
            leftSubText
              ? `<div style="font-weight:800; color:#816105; font-size:0.78rem; white-space: normal; word-wrap: break-word; overflow-wrap: break-word;">${leftSubText}</div>`
              : `<div style="font-weight:800; color:#816105; font-size:0.78rem;">${dateDisplay}<br>${timeDisplay}</div>`
          }
        </td>
      </tr>
    </table>
  `;

  const footer = `
    <table style="width: 100%; border-collapse: collapse; border-top: 1.5px solid #C9A227; padding-top: 1rem; margin-top: 1.2rem; font-size: 0.9rem; page-break-inside: avoid; break-inside: avoid; page-break-before: avoid; break-before: avoid;" role="presentation">
      <tr>
        <td style="border: none; text-align: right; vertical-align: bottom;">
          <strong style="color: #2E657E;">المنصّة الإلكترونيّة للمَجْمَع القرآنيّ</strong>
        </td>
        <td style="border: none; text-align: center; vertical-align: bottom;">
          <div style="font-weight: 800; color: #816105;">مدير المَجْمَع القرآنيّ</div>
          <div style="font-weight: 900; color: #2E657E;">أحمد بن عبدالله آل مهدي</div>
        </td>
      </tr>
    </table>
  `;

  return { header, footer };
};

// إدراج الترويسة كصف إضافي داخل thead الجدول
window.buildRepeatingHeaderTableHtml = function (originalTable, headerHtml) {
  const clone = originalTable.cloneNode(true);
  let thead = clone.querySelector("thead");
  if (!thead) {
    thead = document.createElement("thead");
    clone.insertBefore(thead, clone.firstChild);
  }
  const firstRow = thead.querySelector("tr");
  const colCount = firstRow ? firstRow.children.length : 1;

  const headerRow = document.createElement("tr");
  const headerCell = document.createElement("td");
  headerCell.colSpan = colCount;
  headerCell.style.cssText = "padding: 0; border: none; background: #fff;";
  headerCell.innerHTML = headerHtml;
  headerRow.appendChild(headerCell);
  thead.insertBefore(headerRow, thead.firstChild);

  return clone.outerHTML;
};

// دوال الطباعة والتصدير العام
window.printTableElement = function (tableId, title) {
  const table = document.getElementById(tableId);
  if (!table) {
    alert("⚠️ لا يوجد جدول متاح للطباعة.");
    return;
  }
  const chrome =
    typeof buildOfficialPrintChrome === "function"
      ? buildOfficialPrintChrome(title, "")
      : { header: "", footer: "" };

  const tableHtml =
    typeof buildRepeatingHeaderTableHtml === "function"
      ? buildRepeatingHeaderTableHtml(table, chrome.header)
      : chrome.header + table.outerHTML;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("⚠️ تعذّر فتح نافذة الطباعة، يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مرة أخرى.");
    return;
  }
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          body { font-family: 'Cairo', 'Tajawal', sans-serif; direction: rtl; padding: 10px; }
          table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          thead { display: table-header-group !important; }
          tbody tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          th, td { border: 1px solid #2E657E; padding: 5px 4px; text-align: center; word-wrap: break-word; overflow-wrap: break-word; }
          table[role="presentation"] td { border: none; padding: 0 4px; }
          th { background-color: #2E657E; color: #ffffff; font-weight: bold; }
          tbody tr:nth-child(even) { background-color: #DDECF3; }
          .no-print, button { display: none !important; }
        </style>
      </head>
      <body>
        ${tableHtml}
        ${chrome.footer}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.onafterprint = () => printWindow.close();
    printWindow.print();
    setTimeout(() => {
      try {
        printWindow.close();
      } catch (e) {}
    }, 60000);
  }, 350);
};

window.directDownloadPDF = function (elementId, filename, title) {
  const element = document.getElementById(elementId);
  if (!element) {
    alert("⚠️ لا توجد بيانات متاحة للتنزيل!");
    return;
  }

  if (typeof html2pdf !== "undefined") {
    const chrome =
      typeof buildOfficialPrintChrome === "function"
        ? buildOfficialPrintChrome(title, "")
        : { header: "", footer: "" };

    const isTableElement = element.tagName === "TABLE";

    if (isTableElement && typeof window.generateMultiPagePDF === "function") {
      window.generateMultiPagePDF(
        chrome.header,
        chrome.footer,
        element,
        filename,
        "landscape",
      );
      return;
    }

    const contentHtml =
      isTableElement && typeof buildRepeatingHeaderTableHtml === "function"
        ? buildRepeatingHeaderTableHtml(element, chrome.header)
        : chrome.header + element.outerHTML;

    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "position: fixed; top: -99999px; left: -99999px; background:#fff; padding: 1.2rem; width: 1200px; font-family: 'Cairo','Tajawal',sans-serif;";
    wrapper.innerHTML = contentHtml + chrome.footer;
    document.body.appendChild(wrapper);

    const opt = {
      margin: [6, 6, 6, 6],
      filename: `${filename}_${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };
    html2pdf()
      .set(opt)
      .from(wrapper)
      .save()
      .then(() => {
        document.body.removeChild(wrapper);
      })
      .catch(() => {
        document.body.removeChild(wrapper);
      });
  } else {
    window.printTableElement(elementId, title);
  }
};

window.generateMultiPagePDF = async function (
  chromeHeader,
  chromeFooter,
  table,
  filename,
  orientation = "landscape",
) {
  const isPortrait = orientation === "portrait";
  const pageWidthMm = isPortrait ? 210 : 297,
    pageHeightMm = isPortrait ? 297 : 210,
    marginMm = 6;
  const usableWidthMm = pageWidthMm - marginMm * 2;
  const usableHeightMm = pageHeightMm - marginMm * 2;
  const contentWidthPx = 1200;
  const scaleMmPerPx = usableWidthMm / contentWidthPx;
  const usableHeightPx = usableHeightMm / scaleMmPerPx;

  // html2canvas (المرفق ضمن html2pdf) لا يلتقط أي محتوى لعنصر مموضع خارج نافذة
  // العرض الفعلية (سواء position: fixed أو absolute بإزاحة كبيرة) - ينتج عنه صفحة
  // PDF بيضاء تماماً رغم عدم وجود أي خطأ برمجي ظاهر. الحل: تثبيت العنصر عند
  // (0,0) ضمن نافذة العرض الفعلية، وإخفاؤه بصرياً عن المستخدم بواسطة z-index سالب
  // بدل دفعه بعيداً خارج الشاشة.
  const makeWrapper = () => {
    const w = document.createElement("div");
    w.className = "pdf-export-page-wrapper";
    w.style.cssText =
      "position: absolute; top: 0; left: 0; z-index: -1; background:#fff; padding: 1.2rem; width: 1200px; font-family: 'Cairo','Tajawal',sans-serif;";
    return w;
  };

  // يعيد بناء الجدول داخل الحاوية المؤقتة بدون id="report-results-table" الأصلي، لذا
  // تُفرض ألوان الهوية الرسمية هنا صراحةً بدل الاعتماد على تنسيق .data-table العام
  // (الذي لا يزال يستخدم لون الواجهة القديم) حتى لا يظهر PDF بلون مختلف عن الشاشة
  const pdfBrandStyleTag = `<style>
    .pdf-export-page-wrapper thead th { background-color: #2E657E !important; color: #ffffff !important; border-bottom-color: #C9A227 !important; }
    .pdf-export-page-wrapper tbody tr:nth-child(even) { background-color: #DDECF3 !important; }
  </style>`;

  const measureWrapper = makeWrapper();
  document.body.appendChild(measureWrapper);
  measureWrapper.innerHTML = chromeHeader;
  const headerHeightPx = measureWrapper.scrollHeight;
  const tableClone = table.cloneNode(true);
  measureWrapper.innerHTML = "";
  measureWrapper.appendChild(tableClone);
  const theadEl = tableClone.querySelector("thead");
  const theadHeightPx = theadEl ? theadEl.getBoundingClientRect().height : 0;
  const bodyRowsClone = Array.from(tableClone.querySelectorAll("tbody tr"));
  // ارتفاع كل صف فعلياً (الصفوف قد تتفاوت عند التفاف الأسماء/الملاحظات الطويلة)
  const rowHeightsPx = bodyRowsClone.map((r) => r.getBoundingClientRect().height);
  measureWrapper.innerHTML = chromeFooter || "";
  const footerHeightPx = chromeFooter ? measureWrapper.scrollHeight : 0;
  document.body.removeChild(measureWrapper);

  // 60px = حشو الحاوية (1.2rem أعلى وأسفل) + هامش الجدول
  const availablePx = usableHeightPx - headerHeightPx - theadHeightPx - 60;

  const allRows = Array.from(table.querySelectorAll("tbody tr"));
  const pageChunks = [];
  let currentChunk = [];
  let currentPx = 0;
  allRows.forEach((row, i) => {
    const h = rowHeightsPx[i] || 30;
    if (currentChunk.length > 0 && currentPx + h > availablePx) {
      pageChunks.push(currentChunk);
      currentChunk = [];
      currentPx = 0;
    }
    currentChunk.push(row);
    currentPx += h;
  });
  // التذييل يظهر في الصفحة الأخيرة فقط: إن لم يتّسع بعد آخر صف يُنقل صف أخير إلى صفحة
  // جديدة بدل أن يُصغَّر محتوى الصفحة كلها أو يُقتطع التذييل
  if (
    currentChunk.length > 1 &&
    currentPx + footerHeightPx > availablePx
  ) {
    const movedRow = currentChunk.pop();
    pageChunks.push(currentChunk);
    currentChunk = [movedRow];
  }
  if (currentChunk.length > 0) pageChunks.push(currentChunk);
  if (pageChunks.length === 0) pageChunks.push([]);

  const theadHtml = table.querySelector("thead")
    ? table.querySelector("thead").outerHTML
    : "";
  const tableClassAttr = table.className || "";
  const tableStyleAttr = table.getAttribute("style") || "";

  let pdfDoc = null;
  for (let pageIdx = 0; pageIdx < pageChunks.length; pageIdx++) {
    const isLastPage = pageIdx === pageChunks.length - 1;
    const pageWrapper = makeWrapper();
    const rowsHtml = pageChunks[pageIdx].map((r) => r.outerHTML).join("");
    pageWrapper.innerHTML =
      pdfBrandStyleTag +
      chromeHeader +
      `<div class="table-responsive" style="margin-bottom: 0.8rem;"><table class="${tableClassAttr}" style="${tableStyleAttr}"><thead>${theadHtml}</thead><tbody>${rowsHtml}</tbody></table></div>` +
      (isLastPage ? chromeFooter : "");
    document.body.appendChild(pageWrapper);
    await new Promise((r) => setTimeout(r, 30));

    const w = pageWrapper.scrollWidth,
      h = pageWrapper.scrollHeight;
    const opt = {
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        width: w,
        height: h,
        windowWidth: w,
        windowHeight: h,
      },
      jsPDF: { unit: "mm", format: "a4", orientation },
    };

    const worker = html2pdf().set(opt).from(pageWrapper);
    await worker.toCanvas();
    const canvas = worker.prop.canvas;
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    if (!pdfDoc) {
      // يُنشأ مستند jsPDF من عنصر صغير جداً (صفحته الأولى المؤقتة تُحذف في النهاية)،
      // ثم تُوضع كل صفحات التقرير يدوياً بنفس الهوامش بدل ترك html2pdf يوزّع الصفحة
      // الأولى بلا هوامش وبمقاس مختلف عن بقية الصفحات
      const seedEl = makeWrapper();
      seedEl.style.width = "40px";
      seedEl.style.padding = "0";
      seedEl.textContent = ".";
      document.body.appendChild(seedEl);
      try {
        const seedWorker = html2pdf()
          .set({ jsPDF: { unit: "mm", format: "a4", orientation } })
          .from(seedEl);
        await seedWorker.toPdf();
        pdfDoc = seedWorker.prop.pdf;
      } finally {
        document.body.removeChild(seedEl);
      }
    }
    pdfDoc.addPage([pageWidthMm, pageHeightMm], orientation);
    const imgProps = pdfDoc.getImageProperties(imgData);
    let drawW = usableWidthMm;
    let drawH = (imgProps.height * drawW) / imgProps.width;
    // إن زاد ارتفاع المحتوى عن الصفحة يُصغَّر ليتّسع كاملاً بدل أن يُقتطع
    if (drawH > usableHeightMm) {
      drawH = usableHeightMm;
      drawW = (imgProps.width * drawH) / imgProps.height;
    }
    const drawX = marginMm + (usableWidthMm - drawW) / 2;
    pdfDoc.addImage(imgData, "JPEG", drawX, marginMm, drawW, drawH);
    document.body.removeChild(pageWrapper);
  }

  pdfDoc.deletePage(1);
  pdfDoc.save(`${filename}_${new Date().toISOString().split("T")[0]}.pdf`);
};

window.printTeachersTable = function () {
  printTableElement("teachers-table-element", "قائمة المعلمين المكلفين");
};

window.printTeachersAttendance = function () {
  printTableElement(
    "teachers-attendance-table-element",
    "كشف متابعة تحضير المعلمين",
  );
};

window.printStudentsTable = function () {
  printTableElement("students-table-element", "كشف الطلاب المسجلين");
};

window.printAttendanceTable = function () {
  printTableElement("attendance-table-element", "كشف تحضير الطلاب");
};

window.printAccountsTable = function () {
  printTableElement("accounts-table-element", "إدارة حسابات النظام");
};

window.printTestsTable = function () {
  if (!generateTestsReport()) return;
  printTableElement("tests-report-table", "سجل الاختبارات والنتائج");
};

window.printTeacherNotes = function () {
  printTableElement("teacher-notes-table-element", "ملاحظات المعلمين للإدارة");
};

window.exportTeachersExcel = function () {
  const table = document.getElementById("teachers-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "المعلمون" });
  XLSX.writeFile(
    wb,
    `قائمة_المعلمين_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportTeachersPDF = function () {
  directDownloadPDF(
    "teachers-table-element",
    "قائمة_المعلمين",
    "قائمة المعلمين المكلفين",
  );
};

window.exportTeachersAttendanceExcel = function () {
  const table = document.getElementById("teachers-attendance-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "تحضير_المعلمين" });
  XLSX.writeFile(
    wb,
    `تحضير_المعلمين_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportTeachersAttendancePDF = function () {
  directDownloadPDF(
    "teachers-attendance-table-element",
    "تحضير_المعلمين",
    "كشف متابعة تحضير المعلمين",
  );
};

window.exportStudentsPDF = function () {
  directDownloadPDF(
    "students-table-element",
    "كشف_الطلاب",
    "كشف الطلاب المسجلين",
  );
};

window.exportAttendanceExcel = function () {
  const table = document.getElementById("attendance-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "تحضير_الطلاب" });
  XLSX.writeFile(
    wb,
    `تحضير_الطلاب_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportAttendancePDF = function () {
  directDownloadPDF(
    "attendance-table-element",
    "تحضير_الطلاب",
    "كشف تحضير الطلاب",
  );
};

window.exportAccountsExcel = function () {
  const table = document.getElementById("accounts-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "الحسابات" });
  XLSX.writeFile(
    wb,
    `حسابات_النظام_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportAccountsPDF = function () {
  directDownloadPDF(
    "accounts-table-element",
    "حسابات_النظام",
    "إدارة حسابات النظام",
  );
};

window.exportTestsExcel = function () {
  const table = generateTestsReport();
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "الاختبارات" });
  XLSX.writeFile(
    wb,
    `سجل_الاختبارات_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportTestsPDF = function () {
  if (!generateTestsReport()) return;
  directDownloadPDF(
    "tests-report-table",
    "سجل_الاختبارات",
    "سجل الاختبارات والنتائج",
  );
};

window.exportTeacherNotesExcel = function () {
  const table = document.getElementById("teacher-notes-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "ملاحظات_المعلمين" });
  XLSX.writeFile(
    wb,
    `ملاحظات_المعلمين_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportTeacherNotesPDF = function () {
  directDownloadPDF(
    "teacher-notes-table-element",
    "ملاحظات_المعلمين",
    "ملاحظات المعلمين للإدارة",
  );
};

// نافذة متابعة الطلاب لليوم
window.openStudentsFollowupModal = function () {
  const titleEl = document.getElementById("students-followup-modal-title");
  const thead = document.querySelector(
    "#students-followup-table-element thead",
  );
  const tbody = document.getElementById("students-followup-tbody");
  if (!tbody) return;

  const targetDateStr =
    document.getElementById("dashboard-date-select")?.value ||
    new Date().toISOString().split("T")[0];

  if (titleEl) titleEl.textContent = `📋 متابعة الطلاب ليوم (${targetDateStr})`;

  if (thead) {
    thead.innerHTML = `
      <tr>
        <th style="width: 45px; text-align: center">م</th>
        <th>اسم الطالب</th>
        <th style="text-align: center">الحلقة</th>
        <th style="text-align: center">الحضور</th>
        <th style="text-align: center">الدرس</th>
        <th style="text-align: center">المراجعة</th>
        <th style="text-align: center">التلاوة</th>
      </tr>
    `;
  }

  const activeStudents = (window.appStore?.students || [])
    .filter((s) => s.status === "active")
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
  const todayAtt = window.appStore?.attendance || [];
  const todayTasm = window.appStore?.tasmeea || [];

  const attMap = new Map();
  todayAtt
    .filter((a) => a.date === targetDateStr)
    .forEach((a) => attMap.set(a.studentId, a));

  const tasmMap = new Map();
  todayTasm
    .filter((t) => t.date === targetDateStr)
    .forEach((t) => tasmMap.set(t.studentId, t));

  let html = "";
  activeStudents.forEach((s, idx) => {
    const circle = (window.appStore?.circles || []).find(
      (c) => c.id === s.circleId,
    );
    const circleName = circle ? circle.name : "غير مسجل";

    const att = attMap.get(s.id);
    let attText =
      '<span class="badge" style="background:#e0e0e0; color:#555;">— غير محدد —</span>';

    if (att) {
      if (att.status === "present")
        attText = '<span class="badge badge-active">🟢 حاضر</span>';
      else if (att.status === "absent")
        attText = '<span class="badge badge-danger">🔴 غائب</span>';
      else if (att.status === "late")
        attText = '<span class="badge badge-warning">🟡 متأخر</span>';
      else if (att.status === "excused")
        attText =
          '<span class="badge" style="background:#e3f2fd; color:#1565c0;">🔵 مستأذن</span>';
    }

    const tasmRecord = tasmMap.get(s.id) || {};
    const hifzCol = tasmRecord.hifzSurah
      ? '<span class="badge badge-active" style="font-size:0.85rem;">✅ سمّع</span>'
      : '<span class="text-muted">—</span>';
    const murajaaCol = tasmRecord.murajaaSurah
      ? '<span class="badge badge-active" style="font-size:0.85rem;">✅ سمّع</span>'
      : '<span class="text-muted">—</span>';
    const tilawaCol = tasmRecord.tilawaSurah
      ? '<span class="badge badge-active" style="font-size:0.85rem;">✅ سمّع</span>'
      : '<span class="text-muted">—</span>';

    html += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700;">${escapeHtml(s.name)}</td>
        <td style="text-align: center; font-weight: 600; color: var(--text-dark);">${escapeHtml(circleName)}</td>
        <td style="text-align: center;">${attText}</td>
        <td style="text-align: center;">${hifzCol}</td>
        <td style="text-align: center;">${murajaaCol}</td>
        <td style="text-align: center;">${tilawaCol}</td>
      </tr>
    `;
  });

  tbody.innerHTML =
    html ||
    '<tr><td colspan="7" class="text-center text-muted p-4">لا توجد بيانات طلاب نشطين لهذا اليوم</td></tr>';
  openModal("modal-students-followup");
};

window.filterStudentsFollowupModal = function () {
  const q = (
    document.getElementById("search-modal-students-followup")?.value || ""
  )
    .trim()
    .toLowerCase();
  document.querySelectorAll("#students-followup-tbody tr").forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
  });
};

window.printStudentsFollowup = function () {
  printTableElement("students-followup-table-element", "متابعة الطلاب");
};

window.exportStudentsFollowupExcel = function () {
  const table = document.getElementById("students-followup-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "متابعة_الطلاب" });
  XLSX.writeFile(
    wb,
    `متابعة_الطلاب_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportStudentsFollowupPDF = function () {
  directDownloadPDF(
    "students-followup-table-element",
    "متابعة_الطلاب",
    "متابعة الطلاب لليوم",
  );
};

// النقر على بطاقات لوحة النظام
window.openDashboardDetailsModal = function (type) {
  const titleEl = document.getElementById("dashboard-details-modal-title");
  const thead = document.getElementById("dashboard-details-thead");
  const tbody = document.getElementById("dashboard-details-tbody");
  if (!tbody || !thead) return;

  const targetDateStr =
    document.getElementById("dashboard-date-select")?.value ||
    new Date().toISOString().split("T")[0];

  if (type === "students") {
    if (titleEl) titleEl.textContent = `👨‍🎓 كشف الطلاب المسجلين بالمَجْمَع`;
    thead.innerHTML = `
      <tr>
        <th style="width: 45px; text-align: center;">م</th>
        <th>اسم الطالب</th>
        <th>رقم الهوية</th>
        <th>جوال ولي الأمر</th>
        <th>الحلقة</th>
        <th>آخر دخول للنظام</th>
        <th>الحالة</th>
      </tr>
    `;
    const list = (window.appStore?.students || []).filter(
      (s) => s.status === "active",
    );
    let html = "";
    list.forEach((s, idx) => {
      const circle = (window.appStore?.circles || []).find(
        (c) => c.id === s.circleId,
      );
      html += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700;">${s.name}</td>
          <td>${s.nationalId || "—"}</td>
          <td>${s.parentPhone || s.phone || "—"}</td>
          <td>${circle ? circle.name : "غير مسجل"}</td>
          <td dir="ltr" style="text-align: right;">${s.lastLogin || "لم يدخل بعد"}</td>
          <td><span class="badge badge-active">نشط</span></td>
        </tr>
      `;
    });
    tbody.innerHTML =
      html ||
      '<tr><td colspan="7" class="text-center text-muted p-4">لا يوجد طلاب نشطون</td></tr>';
  } else if (type === "teachers") {
    if (titleEl) titleEl.textContent = `👨‍🏫 كشف المعلمين المكلفين بالمَجْمَع`;
    thead.innerHTML = `
      <tr>
        <th style="width: 45px; text-align: center;">م</th>
        <th>اسم المعلم</th>
        <th>رقم الجوال</th>
        <th>الحلقات المكلف بها</th>
        <th>آخر دخول للنظام</th>
      </tr>
    `;
    const list = (window.appStore?.teachers || []).filter(
      (t) => t.status === "active",
    );
    let html = "";
    list.forEach((t, idx) => {
      const circles = (window.appStore?.circles || []).filter(
        (c) =>
          (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
          c.teacherId === t.id,
      );
      const circleNames = circles.map((c) => c.name).join(" ، ") || "غير مكلف";
      html += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700;">${t.name}</td>
          <td>${t.phone || "—"}</td>
          <td>${circleNames}</td>
          <td dir="ltr" style="text-align: right;">${t.lastLogin || "لم يدخل بعد"}</td>
        </tr>
      `;
    });
    tbody.innerHTML =
      html ||
      '<tr><td colspan="5" class="text-center text-muted p-4">لا يوجد معلمون مسجلون</td></tr>';
  } else if (type === "circles") {
    if (titleEl) titleEl.textContent = `🏛️ قائمة الحلقات القرآنية بالمَجْمَع`;
    thead.innerHTML = `
      <tr>
        <th style="width: 45px; text-align: center;">م</th>
        <th>اسم الحلقة</th>
        <th>المعلم المكلف</th>
        <th style="text-align: center;">عدد الطلاب</th>
        <th>الحالة</th>
      </tr>
    `;
    const list = window.appStore?.circles || [];
    let html = "";
    list.forEach((c, idx) => {
      const assignedTeachers = (window.appStore?.teachers || []).filter(
        (t) =>
          (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
          c.teacherId === t.id,
      );
      const teacherNames =
        assignedTeachers.map((t) => t.name).join(" ، ") || "غير معين";
      const stuCount = (window.appStore?.students || []).filter(
        (s) => studentInCircle(s, c.id) && s.status === "active",
      ).length;
      html += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700;">${c.name}</td>
          <td>${teacherNames}</td>
          <td style="text-align: center; font-weight: 800;">${stuCount}</td>
          <td><span class="badge badge-active">${c.status || "نشطة"}</span></td>
        </tr>
      `;
    });
    tbody.innerHTML =
      html ||
      '<tr><td colspan="5" class="text-center text-muted p-4">لا توجد حلقات معرفة</td></tr>';
  } else if (type === "present") {
    if (titleEl)
      titleEl.textContent = `🟢 كشف الطلاب الحاضرين ليوم (${targetDateStr})`;
    thead.innerHTML = `
      <tr>
        <th style="width: 45px; text-align: center;">م</th>
        <th>اسم الطالب</th>
        <th>الحلقة</th>
        <th>حالة الحضور</th>
        <th>ملاحظات</th>
      </tr>
    `;
    const presentAtt = (window.appStore?.attendance || []).filter(
      (a) =>
        a.date === targetDateStr &&
        (a.status === "present" || a.status === "late"),
    );
    let html = "";
    presentAtt.forEach((att, idx) => {
      const s = (window.appStore?.students || []).find(
        (st) => st.id === att.studentId,
      );
      if (!s) return;
      const circle = (window.appStore?.circles || []).find(
        (c) => c.id === s.circleId,
      );
      const statusLabel = att.status === "present" ? "🟢 حاضر" : "🟡 متأخر";
      html += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 700;">${escapeHtml(s.name)}</td>
          <td>${escapeHtml(circle ? circle.name : "غير مسجل")}</td>
          <td><span class="badge ${att.status === "present" ? "badge-active" : "badge-warning"}">${statusLabel}</span></td>
          <td>${escapeHtml(att.notes) || "—"}</td>
        </tr>
      `;
    });
    tbody.innerHTML =
      html ||
      '<tr><td colspan="5" class="text-center text-muted p-4">لا يوجد طلاب حاضرون في هذا التاريخ</td></tr>';
  }

  openModal("modal-dashboard-details");
};

window.filterDashboardDetailsModal = function () {
  const q = (
    document.getElementById("search-modal-dashboard-details")?.value || ""
  )
    .trim()
    .toLowerCase();
  document.querySelectorAll("#dashboard-details-tbody tr").forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
  });
};

window.printDashboardDetails = function () {
  const title =
    document.getElementById("dashboard-details-modal-title")?.textContent ||
    "بيانات لوحة النظام";
  printTableElement("dashboard-details-table-element", title);
};

window.exportDashboardDetailsExcel = function () {
  const table = document.getElementById("dashboard-details-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "بيانات_لوحة_النظام" });
  XLSX.writeFile(
    wb,
    `لوحة_النظام_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportDashboardDetailsPDF = function () {
  const title =
    document.getElementById("dashboard-details-modal-title")?.textContent ||
    "لوحة_النظام";
  directDownloadPDF(
    "dashboard-details-table-element",
    "بيانات_لوحة_النظام",
    title,
  );
};

// إدارة الحلقات
window.switchComplexSection = function (section) {
  const btnCircles = document.getElementById("hub-btn-circles");
  const btnTeachers = document.getElementById("hub-btn-teachers");
  const btnStudents = document.getElementById("hub-btn-students");

  const secCircles = document.getElementById("sec-complex-circles");
  const secTeachers = document.getElementById("sec-complex-teachers");
  const secStudents = document.getElementById("sec-complex-students");

  [btnCircles, btnTeachers, btnStudents].forEach((btn) => {
    if (btn) {
      btn.style.borderColor = "var(--border-color)";
      const h3 = btn.querySelector("h3");
      if (h3) h3.style.color = "var(--text-dark)";
    }
  });

  [secCircles, secTeachers, secStudents].forEach((sec) => {
    if (sec) {
      sec.classList.add("style-hidden");
      sec.style.display = "none";
    }
  });

  if (section === "circles") {
    if (btnCircles) {
      btnCircles.style.borderColor = "var(--primary-brown)";
      const h3 = btnCircles.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    if (secCircles) {
      secCircles.classList.remove("style-hidden");
      secCircles.style.display = "block";
    }
    renderCirclesCards();
  } else if (section === "teachers") {
    if (btnTeachers) {
      btnTeachers.style.borderColor = "var(--primary-brown)";
      const h3 = btnTeachers.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    if (secTeachers) {
      secTeachers.classList.remove("style-hidden");
      secTeachers.style.display = "block";
    }
    renderTeachersTable();
  } else if (section === "students") {
    if (btnStudents) {
      btnStudents.style.borderColor = "var(--primary-brown)";
      const h3 = btnStudents.querySelector("h3");
      if (h3) h3.style.color = "var(--primary-brown)";
    }
    if (secStudents) {
      secStudents.classList.remove("style-hidden");
      secStudents.style.display = "block";
    }
    renderStudentsTable();
  }
};

window.renderCirclesCards = function () {
  const container = document.getElementById("circles-cards-container");
  if (!container) return;

  const searchVal = (document.getElementById("search-circles")?.value || "")
    .trim()
    .toLowerCase();
  let circlesList = window.appStore?.circles || [];

  const filtered = circlesList
    .filter((c) => c.name && c.name.toLowerCase().includes(searchVal))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1; padding: 2.5rem; text-align: center;">
        <h3>لا توجد حلقات مضافة بعد</h3>
        <p class="text-muted">اضغط على زر (إضافة حلقة جديدة) لإنشاء الحلقة الأولى بالمَجْمَع</p>
      </div>
    `;
    return;
  }

  let html = "";
  filtered.forEach((circle) => {
    let assignedTeachers = [];
    if (Array.isArray(circle.teacherIds) && circle.teacherIds.length > 0) {
      assignedTeachers = (window.appStore?.teachers || []).filter((t) =>
        circle.teacherIds.includes(t.id),
      );
    } else if (circle.teacherId) {
      const singleTeacher = (window.appStore?.teachers || []).find(
        (t) => t.id === circle.teacherId,
      );
      if (singleTeacher) assignedTeachers.push(singleTeacher);
    }

    const teacherNamesStr =
      assignedTeachers.length > 0
        ? assignedTeachers.map((t) => t.name).join(" ، ")
        : "غير معين";
    const circleStudents = (window.appStore?.students || []).filter(
      (s) => studentInCircle(s, circle.id) && s.status === "active",
    );

    html += `
      <div class="circle-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem;">
        <div class="circle-header flex-between mb-2">
          <div class="circle-title">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary-brown); margin-bottom: 2px;">${escapeHtml(circle.name)}</h3>
            <p class="text-muted" style="font-size: 0.82rem; margin: 0;">جامع الهدى</p>
          </div>
          <span class="badge badge-active">${circle.status || "نشطة"}</span>
        </div>

        <div class="circle-stats-row flex-between p-2 mb-2" style="background: var(--bg-soft-panel); border-radius: 6px;">
          <div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary-brown);">${circleStudents.length}</div>
            <div style="font-size: 0.75rem; color: #666;">عدد الطلاب</div>
          </div>
          <div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #0b6b7d;">${assignedTeachers.length}</div>
            <div style="font-size: 0.75rem; color: #666;">عدد المعلمين</div>
          </div>
        </div>

        <div class="circle-teacher-info mb-3" style="font-size: 0.85rem;">
          <strong>المعلمون:</strong> <span class="text-muted">${escapeHtml(teacherNamesStr)}</span>
        </div>

        <div class="circle-card-actions flex-align-gap">
          <button class="btn btn-outline-brown btn-sm" style="flex: 1;" onclick="openModalEditCircle('${circle.id}')">تعديل</button>
          <button class="btn btn-danger btn-sm" style="flex: 1;" onclick="deleteCircle('${circle.id}')">حذف</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

window.openModalAddCircle = function () {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  const titleEl = document.getElementById("modal-circle-title");
  if (titleEl) titleEl.textContent = "إضافة حلقة جديدة بالمَجْمَع";

  setVal("edit-circle-id", "");
  setVal("circle-name", "");
  setVal("search-modal-teachers", "");
  setVal("search-modal-students", "");

  populateCircleTeachersList([]);
  populateCircleStudentsList([]);

  openModal("modal-add-circle");
};

window.openModalEditCircle = function (circleId) {
  const circle = (window.appStore?.circles || []).find(
    (c) => c.id === circleId,
  );
  if (!circle) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  const titleEl = document.getElementById("modal-circle-title");
  if (titleEl) titleEl.textContent = `تعديل حلقة: ${circle.name}`;

  setVal("edit-circle-id", circle.id);
  setVal("circle-name", circle.name);
  setVal("search-modal-teachers", "");
  setVal("search-modal-students", "");

  const currentTeacherIds =
    circle.teacherIds || (circle.teacherId ? [circle.teacherId] : []);
  const currentStudents = (window.appStore?.students || [])
    .filter((s) => studentInCircle(s, circleId))
    .map((s) => s.id);

  populateCircleTeachersList(currentTeacherIds);
  populateCircleStudentsList(currentStudents);

  openModal("modal-add-circle");
};

window.populateCircleTeachersList = function (selectedIds = []) {
  const container = document.getElementById("circle-teachers-list");
  if (!container) return;

  const teachers = window.appStore?.teachers || [];
  if (teachers.length === 0) {
    container.innerHTML =
      '<p class="text-muted p-2" style="font-size:0.85rem;">لا يوجد معلمون مسجلون بعد</p>';
    return;
  }

  let html = "";
  teachers.forEach((t) => {
    const isChecked = selectedIds.includes(t.id) ? "checked" : "";
    html += `
      <label class="checkbox-item-row p-1 mb-1" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem;">
        <input type="checkbox" name="circle_teachers" value="${t.id}" ${isChecked}>
        <span>${t.name}</span>
      </label>
    `;
  });
  container.innerHTML = html;
};

window.populateCircleStudentsList = function (selectedStudentIds = []) {
  const container = document.getElementById("circle-students-list");
  if (!container) return;

  const students = (window.appStore?.students || []).filter(
    (s) => s.status === "active",
  );
  if (students.length === 0) {
    container.innerHTML =
      '<p class="text-muted p-2" style="font-size:0.85rem;">لا يوجد طلاب نشطون مسجلون</p>';
    return;
  }

  // اختيار طالب من حلقة أخرى يضيفه إلى هذه الحلقة كحلقة إضافية دون إخراجه من
  // حلقته الأساسية (كان يُنقل بصمت فيختفي من حلقته الأولى)
  const circles = window.appStore?.circles || [];
  const editId = document.getElementById("edit-circle-id")?.value || "";
  let html = "";
  students.forEach((s) => {
    const isChecked = selectedStudentIds.includes(s.id) ? "checked" : "";
    const primary = circles.find((c) => c.id === s.circleId);
    const note =
      primary && s.circleId !== editId
        ? ` <small class="text-muted">(حلقته الأساسية: ${escapeHtml(primary.name)})</small>`
        : "";
    html += `
      <label class="checkbox-item-row p-1 mb-1" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem;">
        <input type="checkbox" name="circle_students" value="${s.id}" ${isChecked}>
        <span>${escapeHtml(s.name)}${note}</span>
      </label>
    `;
  });
  container.innerHTML = html;
};

window.filterCircleModalTeachers = function () {
  const q = (document.getElementById("search-modal-teachers")?.value || "")
    .trim()
    .toLowerCase();
  document
    .querySelectorAll("#circle-teachers-list .checkbox-item-row")
    .forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q)
        ? "flex"
        : "none";
    });
};

window.filterCircleModalStudents = function () {
  const q = (document.getElementById("search-modal-students")?.value || "")
    .trim()
    .toLowerCase();
  document
    .querySelectorAll("#circle-students-list .checkbox-item-row")
    .forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q)
        ? "flex"
        : "none";
    });
};

// يطبّق اختيار طلاب الحلقة: من ليس له حلقة تصبح أساسيته، ومن له حلقة أخرى تُضاف
// هذه كحلقة إضافية (لا يخرج من حلقته الأولى). وعند إلغاء اختياره من حلقته الأساسية
// تُرقّى حلقته الإضافية الأولى (إن وجدت) أساسيةً حتى لا يختفي من كل الحلقات.
// الطلاب غير النشطين لا يظهرون في القائمة فلا يُمسّون.
function applyCircleMembership(circleId, selectedIds) {
  (window.appStore?.students || []).forEach((s) => {
    if (s.status !== "active") return;
    const selected = selectedIds.includes(s.id);
    const extras = Array.isArray(s.extraCircleIds) ? s.extraCircleIds : [];
    const inExtras = extras.includes(circleId);
    let changed = false;

    if (selected) {
      if (s.circleId === circleId || inExtras) return;
      if (!s.circleId) s.circleId = circleId;
      else s.extraCircleIds = [...extras, circleId];
      changed = true;
    } else if (s.circleId === circleId) {
      s.circleId = extras[0] || "";
      s.extraCircleIds = extras.slice(1);
      changed = true;
    } else if (inExtras) {
      s.extraCircleIds = extras.filter((id) => id !== circleId);
      changed = true;
    }

    if (changed && typeof saveToCloud === "function")
      saveToCloud("students", s.id, s);
  });
}

window.handleSaveCircle = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const editId = document.getElementById("edit-circle-id")?.value;
  const name = (document.getElementById("circle-name")?.value || "").trim();

  if (!name) {
    alert("يرجى إدخال اسم الحلقة.");
    return;
  }

  const selectedTeachers = [];
  document
    .querySelectorAll('input[name="circle_teachers"]:checked')
    .forEach((cb) => {
      selectedTeachers.push(cb.value);
    });

  const selectedStudents = [];
  document
    .querySelectorAll('input[name="circle_students"]:checked')
    .forEach((cb) => {
      selectedStudents.push(cb.value);
    });

  if (!window.appStore.circles) window.appStore.circles = [];

  if (editId) {
    const circle = window.appStore.circles.find((c) => c.id === editId);
    if (circle) {
      circle.name = name;
      circle.teacherIds = selectedTeachers;
      circle.teacherId = selectedTeachers[0] || "";
      if (typeof saveToCloud === "function")
        saveToCloud("circles", circle.id, circle);
    }

    applyCircleMembership(editId, selectedStudents);

    alert("✅ تم تعديل بيانات الحلقة بنجاح!");
  } else {
    const newCircleId = "c_" + Date.now();
    const newCircle = {
      id: newCircleId,
      name: name,
      mosque: "جامع الهدى",
      teacherIds: selectedTeachers,
      teacherId: selectedTeachers[0] || "",
      status: "نشطة",
      createdAt: Date.now(),
    };

    window.appStore.circles.push(newCircle);
    if (typeof saveToCloud === "function")
      saveToCloud("circles", newCircle.id, newCircle);

    applyCircleMembership(newCircleId, selectedStudents);

    alert("✅ تم إنشاء الحلقة بنجاح!");
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-add-circle");
  renderCirclesCards();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

window.deleteCircle = function (circleId) {
  const circle = (window.appStore?.circles || []).find(
    (c) => c.id === circleId,
  );
  if (!circle) return;

  if (!confirm(`هل أنت متأكد من حذف حلقة (${circle.name}) نهائياً؟`)) return;

  window.appStore.circles = (window.appStore.circles || []).filter(
    (c) => c.id !== circleId,
  );

  (window.appStore?.students || []).forEach((s) => {
    const extras = Array.isArray(s.extraCircleIds) ? s.extraCircleIds : [];
    let changed = false;
    if (extras.includes(circleId)) {
      s.extraCircleIds = extras.filter((id) => id !== circleId);
      changed = true;
    }
    if (s.circleId === circleId) {
      s.circleId = (s.extraCircleIds || [])[0] || "";
      s.extraCircleIds = (s.extraCircleIds || []).slice(1);
      changed = true;
    }
    if (changed && typeof saveToCloud === "function")
      saveToCloud("students", s.id, s);
  });

  if (typeof saveToCloud === "function")
    saveToCloud("circles", circleId, null, true);
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert(`✅ تم حذف حلقة (${circle.name}) بنجاح!`);
  renderCirclesCards();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

// إدارة المعلمين
window.switchTeacherSubTab = function (tab) {
  const btnList = document.getElementById("tab-btn-teachers-list");
  const btnAtt = document.getElementById("tab-btn-teachers-attendance");
  const boxList = document.getElementById("box-teachers-list-table");
  const boxAtt = document.getElementById("box-teachers-attendance-table");

  if (tab === "list") {
    btnList?.classList.add("active");
    btnAtt?.classList.remove("active");
    if (boxList) {
      boxList.classList.remove("style-hidden");
      boxList.style.display = "block";
    }
    if (boxAtt) {
      boxAtt.classList.add("style-hidden");
      boxAtt.style.display = "none";
    }
    renderTeachersTable();
  } else {
    btnAtt?.classList.add("active");
    btnList?.classList.remove("active");
    if (boxAtt) {
      boxAtt.classList.remove("style-hidden");
      boxAtt.style.display = "block";
    }
    if (boxList) {
      boxList.classList.add("style-hidden");
      boxList.style.display = "none";
    }
    renderTeachersAttendanceTable();
  }
};

window.renderTeachersTable = function () {
  const tbody = document.getElementById("teachers-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-teachers")?.value || "")
    .trim()
    .toLowerCase();
  const teachers = window.appStore?.teachers || [];

  const filtered = teachers
    .filter(
      (t) =>
        (t.name && t.name.toLowerCase().includes(searchVal)) ||
        (t.phone && String(t.phone).includes(searchVal)),
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-muted p-4">لا يوجد معلمون مسجلون</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach((t) => {
    const teacherCircles = (window.appStore?.circles || []).filter(
      (c) =>
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
        c.teacherId === t.id,
    );
    const circleNamesStr =
      teacherCircles.length > 0
        ? teacherCircles.map((c) => c.name).join(" ، ")
        : "غير مكلف";
    const financeBadge = t.isFinance
      ? '<span class="badge" style="background:#0b6b7d; color:#fff; margin-right:4px;">مسؤول مالي</span>'
      : "";

    html += `
      <tr>
        <td style="font-weight: 700;">${escapeHtml(t.name)} ${financeBadge}</td>
        <td>${escapeHtml(t.phone) || "—"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${escapeHtml(circleNamesStr)}</span></td>
        <td dir="ltr" class="text-muted" style="text-align: right;">${t.lastLogin || "لم يدخل بعد"}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditTeacher('${t.id}')">تعديل</button>
            <button class="btn ${t.status === "suspended" ? "btn-success" : "btn-danger"} btn-sm" onclick="toggleTeacherStatus('${t.id}')">
              ${t.status === "suspended" ? "تفعيل" : "إيقاف"}
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteTeacher('${t.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.openModalAddTeacher = function () {
  const nameEl = document.getElementById("teach-name");
  const phoneEl = document.getElementById("teach-phone");
  const finCb = document.getElementById("add-teach-is-finance");
  if (nameEl) nameEl.value = "";
  if (phoneEl) phoneEl.value = "";
  if (finCb) finCb.checked = false;

  const container = document.getElementById(
    "teacher-circles-checkbox-container",
  );
  if (container) {
    let html = "";
    (window.appStore?.circles || []).forEach((c) => {
      html += `
        <label class="checkbox-item-row p-1 mb-1" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem;">
          <input type="checkbox" name="teacher_circles" value="${c.id}">
          <span>${c.name}</span>
        </label>
      `;
    });
    container.innerHTML =
      html ||
      '<p class="text-muted p-2" style="font-size:0.85rem;">لا توجد حلقات معرفة</p>';
  }

  openModal("modal-add-teacher");
};

window.handleAddTeacher = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const name = (document.getElementById("teach-name")?.value || "").trim();
  const phone = (document.getElementById("teach-phone")?.value || "").trim();
  const isFinance = Boolean(
    document.getElementById("add-teach-is-finance")?.checked,
  );

  if (!name || !phone) {
    alert("يرجى إدخال اسم المعلم ورقم الجوال.");
    return;
  }

  const selectedCircles = [];
  document
    .querySelectorAll('input[name="teacher_circles"]:checked')
    .forEach((cb) => {
      selectedCircles.push(cb.value);
    });

  const newTeacherId = "t_" + Date.now();
  const newTeacher = {
    id: newTeacherId,
    userId: "u_t_" + Date.now(),
    name: name,
    phone: phone,
    isFinance: isFinance,
    status: "active",
    lastLogin: "لم يدخل بعد",
    createdAt: Date.now(),
  };

  if (!window.appStore.teachers) window.appStore.teachers = [];
  window.appStore.teachers.push(newTeacher);

  if (!window.appStore.users) window.appStore.users = [];
  window.appStore.users.push({
    id: newTeacher.userId,
    name: name,
    phone: phone,
    role: "teacher",
    username: phone,
    pass: "1234",
    status: "active",
    createdAt: Date.now(),
  });

  (window.appStore?.circles || []).forEach((c) => {
    if (selectedCircles.includes(c.id)) {
      if (!Array.isArray(c.teacherIds)) c.teacherIds = [];
      if (!c.teacherIds.includes(newTeacherId)) c.teacherIds.push(newTeacherId);
      if (!c.teacherId) c.teacherId = newTeacherId;
      if (typeof saveToCloud === "function") saveToCloud("circles", c.id, c);
    }
  });

  if (typeof saveToCloud === "function") {
    saveToCloud("teachers", newTeacher.id, newTeacher);
    saveToCloud("users", newTeacher.userId, {
      id: newTeacher.userId,
      name: name,
      phone: phone,
      role: "teacher",
      username: phone,
      pass: "1234",
      status: "active",
    });
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-add-teacher");
  alert("✅ تم إضافة المعلم بنجاح! (الرقم السري الافتراضي: 1234)");
  renderTeachersTable();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

window.openModalEditTeacher = function (teacherId) {
  const teacher = (window.appStore?.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("edit-teach-id", teacher.id);
  setVal("edit-teach-name", teacher.name);
  setVal("edit-teach-phone", teacher.phone || "");

  const userRec = (window.appStore?.users || []).find(
    (u) =>
      u.id === teacher.userId ||
      u.id === teacher.id ||
      u.username === teacher.phone,
  );
  setVal("edit-teach-password", userRec ? userRec.pass : "1234");

  const finCb = document.getElementById("edit-teach-is-finance");
  if (finCb) finCb.checked = Boolean(teacher.isFinance);

  const container = document.getElementById(
    "edit-teacher-circles-checkbox-container",
  );
  if (container) {
    let html = "";
    (window.appStore?.circles || []).forEach((c) => {
      const isChecked =
        (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacher.id)) ||
        c.teacherId === teacher.id
          ? "checked"
          : "";
      html += `
        <label class="checkbox-item-row p-1 mb-1" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.88rem;">
          <input type="checkbox" name="edit_teacher_circles" value="${c.id}" ${isChecked}>
          <span>${c.name}</span>
        </label>
      `;
    });
    container.innerHTML =
      html ||
      '<p class="text-muted p-2" style="font-size:0.85rem;">لا توجد حلقات معرفة</p>';
  }

  openModal("modal-edit-teacher");
};

window.handleSaveTeacherEdit = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const teacherId = document.getElementById("edit-teach-id")?.value;
  const teacher = (window.appStore?.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  const name = (document.getElementById("edit-teach-name")?.value || "").trim();
  const phone = (
    document.getElementById("edit-teach-phone")?.value || ""
  ).trim();
  const password = (
    document.getElementById("edit-teach-password")?.value || "1234"
  ).trim();
  const isFinance = Boolean(
    document.getElementById("edit-teach-is-finance")?.checked,
  );

  if (!name || !phone) {
    alert("يرجى إدخال اسم المعلم ورقم الجوال.");
    return;
  }

  const selectedCircles = [];
  document
    .querySelectorAll('input[name="edit_teacher_circles"]:checked')
    .forEach((cb) => {
      selectedCircles.push(cb.value);
    });

  teacher.name = name;
  teacher.phone = phone;
  teacher.isFinance = isFinance;

  let userRec = (window.appStore?.users || []).find(
    (u) =>
      u.id === teacher.userId ||
      u.id === teacher.id ||
      u.username === teacher.phone,
  );
  if (userRec) {
    userRec.name = name;
    userRec.phone = phone;
    userRec.username = phone;
    userRec.pass = password || "1234";
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  } else {
    userRec = {
      id: teacher.userId || "u_" + teacher.id,
      name: name,
      phone: phone,
      role: "teacher",
      username: phone,
      pass: password || "1234",
      status: teacher.status || "active",
      createdAt: Date.now(),
    };
    if (!window.appStore.users) window.appStore.users = [];
    window.appStore.users.push(userRec);
    teacher.userId = userRec.id;
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  }

  if (typeof saveToCloud === "function")
    saveToCloud("teachers", teacher.id, teacher);

  (window.appStore?.circles || []).forEach((c) => {
    if (!Array.isArray(c.teacherIds)) c.teacherIds = [];
    if (selectedCircles.includes(c.id)) {
      if (!c.teacherIds.includes(teacher.id)) c.teacherIds.push(teacher.id);
      if (!c.teacherId) c.teacherId = teacher.id;
    } else {
      c.teacherIds = c.teacherIds.filter((id) => id !== teacher.id);
      if (c.teacherId === teacher.id) c.teacherId = c.teacherIds[0] || "";
    }
    if (typeof saveToCloud === "function") saveToCloud("circles", c.id, c);
  });

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-edit-teacher");
  alert("✅ تم اعتماد وتحديث بيانات المعلم بنجاح!");
  renderTeachersTable();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

window.deleteTeacher = function (teacherId) {
  const teacher = (window.appStore?.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  if (
    !confirm(`هل أنت متأكد من حذف المعلم (${teacher.name}) نهائياً من النظام؟`)
  )
    return;

  window.appStore.teachers = (window.appStore.teachers || []).filter(
    (t) => t.id !== teacherId,
  );
  window.appStore.users = (window.appStore.users || []).filter(
    (u) => u.id !== teacher.userId && u.id !== teacher.id,
  );

  (window.appStore?.circles || []).forEach((c) => {
    if (Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId)) {
      c.teacherIds = c.teacherIds.filter((id) => id !== teacherId);
      if (c.teacherId === teacherId) c.teacherId = c.teacherIds[0] || "";
      if (typeof saveToCloud === "function") saveToCloud("circles", c.id, c);
    }
  });

  if (typeof saveToCloud === "function") {
    saveToCloud("teachers", teacherId, null, true);
    if (teacher.userId) saveToCloud("users", teacher.userId, null, true);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert(`✅ تم حذف المعلم (${teacher.name}) بنجاح!`);
  renderTeachersTable();
  if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
};

window.toggleTeacherStatus = function (teacherId) {
  const teacher = (window.appStore?.teachers || []).find(
    (t) => t.id === teacherId,
  );
  if (!teacher) return;

  teacher.status = teacher.status === "active" ? "suspended" : "active";
  if (typeof saveToCloud === "function")
    saveToCloud("teachers", teacher.id, teacher);

  const userRec = (window.appStore?.users || []).find(
    (u) => u.id === teacher.userId || u.id === teacher.id,
  );
  if (userRec) {
    userRec.status = teacher.status;
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  renderTeachersTable();
};

window.renderTeachersAttendanceTable = function () {
  const tbody = document.getElementById("teachers-attendance-table-body");
  const thead = document.querySelector(
    "#teachers-attendance-table-element thead",
  );
  if (!tbody) return;

  if (thead) {
    thead.innerHTML = `
      <tr>
        <th style="width: 45px; text-align: center">م</th>
        <th>الاسم</th>
        <th>الحلقات المكلف بها</th>
        <th>وقت التحضير</th>
        <th>حالة الحضور (تحضير يدوي للمدير)</th>
        <th>ملاحظة المدير</th>
      </tr>
    `;
  }

  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const searchVal = (
    document.getElementById("search-teacher-attendance")?.value || ""
  )
    .trim()
    .toLowerCase();

  const directorName =
    window.appStore?.settings?.directorName || "صالح ال ناشع";
  const directorObj = {
    id: "admin_main",
    name: `${directorName} (المدير)`,
    isDirector: true,
    circleNames: "إداري",
  };

  const teachers = window.appStore?.teachers || [];
  let combinedList = [directorObj, ...teachers];

  if (searchVal) {
    combinedList = combinedList.filter(
      (t) => t.name && t.name.toLowerCase().includes(searchVal),
    );
  }

  if (combinedList.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted p-3">لا يوجد معلمون مطابقون</td></tr>';
    return;
  }

  let html = "";
  combinedList.forEach((t, idx) => {
    const record =
      (window.appStore?.teacherAttendance || []).find(
        (a) => a.teacherId === t.id && a.date === dateVal,
      ) || {};
    let circleNames = t.circleNames;
    if (!circleNames) {
      const circles = (window.appStore?.circles || []).filter(
        (c) =>
          (Array.isArray(c.teacherIds) && c.teacherIds.includes(t.id)) ||
          c.teacherId === t.id,
      );
      circleNames = circles.map((c) => c.name).join(" ، ") || "غير مكلف";
    }

    html += `
      <tr style="${t.isDirector ? "background: #fdfbf7;" : ""}">
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 800; color: ${t.isDirector ? "var(--primary-brown)" : "inherit"};">${t.name}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleNames}</span></td>
        <td>${record.time ? `🕒 ${record.time}` : '<span class="text-muted">لم يُرصد بعد</span>'}</td>
        <td>
          <select class="form-control" style="font-weight: 700;" onchange="setTeacherAttendanceByAdmin('${t.id}', this.value)">
            <option value="" ${!record.status ? "selected" : ""}>— لم يحدد —</option>
            <option value="present" ${record.status === "present" ? "selected" : ""}>🟢 حاضر</option>
            <option value="absent" ${record.status === "absent" ? "selected" : ""}>🔴 غائب</option>
            <option value="late" ${record.status === "late" ? "selected" : ""}>🟡 متأخر</option>
            <option value="excused" ${record.status === "excused" ? "selected" : ""}>🔵 مستأذن</option>
          </select>
        </td>
        <td>
          <input type="text" class="form-control" placeholder="ملاحظة إدارية..." value="${escapeHtml(record.notes)}" onchange="updateTeacherAttendanceNotes('${t.id}', this.value)">
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

window.setTeacherAttendanceByAdmin = function (teacherId, status) {
  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const recordId = `t_att_${teacherId}_${dateVal}`;

  if (!window.appStore.teacherAttendance)
    window.appStore.teacherAttendance = [];
  let record = window.appStore.teacherAttendance.find((a) => a.id === recordId);

  if (!record) {
    record = {
      id: recordId,
      teacherId: teacherId,
      date: dateVal,
      time: status === "present" || status === "late" ? nowTime : "",
      status: status,
      notes: "رصد يدوي من المدير",
      updatedBy: "admin",
      createdAt: Date.now(),
    };
    window.appStore.teacherAttendance.push(record);
  } else {
    record.status = status;
    if ((status === "present" || status === "late") && !record.time) {
      record.time = nowTime;
    }
    record.updatedBy = "admin";
  }

  if (typeof saveToCloud === "function")
    saveToCloud("teacherAttendance", record.id, record);
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderTeachersAttendanceTable();
};

window.updateTeacherAttendanceNotes = function (teacherId, notesVal) {
  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const recordId = `t_att_${teacherId}_${dateVal}`;

  if (!window.appStore.teacherAttendance)
    window.appStore.teacherAttendance = [];
  let record = (window.appStore?.teacherAttendance || []).find(
    (a) => a.id === recordId,
  );

  if (!record) {
    record = {
      id: recordId,
      teacherId: teacherId,
      date: dateVal,
      time: "",
      status: "",
      notes: notesVal,
      updatedBy: "admin",
      createdAt: Date.now(),
    };
    window.appStore.teacherAttendance.push(record);
  } else {
    record.notes = notesVal;
    record.updatedBy = "admin";
  }

  if (typeof saveToCloud === "function")
    saveToCloud("teacherAttendance", record.id, record);
  if (typeof saveLocalStore === "function") saveLocalStore();
};

window.markAllTeachersPresent = function () {
  const dateVal =
    document.getElementById("teacher-attendance-date-select")?.value ||
    new Date().toISOString().split("T")[0];
  const nowTime = new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const teachers = window.appStore?.teachers || [];
  const directorObj = { id: "admin_main" };
  const allToMark = [directorObj, ...teachers];

  if (!window.appStore.teacherAttendance)
    window.appStore.teacherAttendance = [];

  allToMark.forEach((t) => {
    const recordId = `t_att_${t.id}_${dateVal}`;
    let record = window.appStore.teacherAttendance.find(
      (a) => a.id === recordId,
    );
    if (!record) {
      record = {
        id: recordId,
        teacherId: t.id,
        date: dateVal,
        time: nowTime,
        status: "present",
        notes: "تحضير يدوي جماعي من المدير",
        updatedBy: "admin",
        createdAt: Date.now(),
      };
      window.appStore.teacherAttendance.push(record);
    } else {
      record.status = "present";
      if (!record.time) record.time = nowTime;
      record.updatedBy = "admin";
    }
    if (typeof saveToCloud === "function") {
      saveToCloud("teacherAttendance", record.id, record);
    }
  });

  if (typeof saveLocalStore === "function") saveLocalStore();
  renderTeachersAttendanceTable();
  alert("✅ تم تسجيل حضور المدير وجميع المعلمين بنجاح لهذا اليوم!");
};

// إدارة الطلاب
window.switchStudentSubTab = function (tab) {
  const btnActive = document.getElementById("tab-btn-active-students");
  const btnPending = document.getElementById("tab-btn-pending-requests");
  const boxActive = document.getElementById("box-active-students-table");
  const boxPending = document.getElementById("box-pending-requests-table");

  if (tab === "active") {
    btnActive?.classList.add("active");
    btnPending?.classList.remove("active");
    if (boxActive) {
      boxActive.classList.remove("style-hidden");
      boxActive.style.display = "block";
    }
    if (boxPending) {
      boxPending.classList.add("style-hidden");
      boxPending.style.display = "none";
    }
    renderStudentsTable();
  } else {
    btnPending?.classList.add("active");
    btnActive?.classList.remove("active");
    if (boxPending) {
      boxPending.classList.remove("style-hidden");
      boxPending.style.display = "block";
    }
    if (boxActive) {
      boxActive.classList.add("style-hidden");
      boxActive.style.display = "none";
    }
    renderPendingRequestsTable();
  }
};

window.renderStudentsTable = function () {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-students")?.value || "")
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-student-circle")?.value || "all";
  const statusFilter =
    document.getElementById("filter-student-status")?.value || "active";

  const studentsList = (window.appStore?.students || []).filter(
    (s) => s.status !== "pending",
  );

  const filtered = studentsList
    .filter((s) => {
      const matchesSearch =
        (s.name && s.name.toLowerCase().includes(searchVal)) ||
        (s.nationalId && String(s.nationalId).includes(searchVal)) ||
        (s.phone && String(s.phone).includes(searchVal)) ||
        (s.parentPhone && String(s.parentPhone).includes(searchVal));

      const matchesCircle =
        circleFilter === "all" || studentInCircle(s, circleFilter);
      const matchesStatus = s.status === statusFilter;
      return matchesSearch && matchesCircle && matchesStatus;
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="11" class="text-center text-muted p-4">لا يوجد طلاب مطابقون للبحث</td></tr>';
    updatePendingBadgeCount();
    return;
  }

  let html = "";
  filtered.forEach((s) => {
    const circle = (window.appStore?.circles || []).find(
      (c) => c.id === s.circleId,
    );
    const extraNames = (Array.isArray(s.extraCircleIds) ? s.extraCircleIds : [])
      .filter((id) => id !== s.circleId)
      .map((id) => (window.appStore?.circles || []).find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => c.name);
    const circleName = [circle ? circle.name : "غير مسجل", ...extraNames]
      .map(escapeHtml)
      .join(" + ");

    html += `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="student-row-cb" value="${s.id}" onchange="handleStudentRowSelectionChange()">
        </td>
        <td style="font-weight: 700;">${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.nationalId) || "—"}</td>
        <td>${escapeHtml(s.phone) || "—"}</td>
        <td>${escapeHtml(s.parentName) || "—"}</td>
        <td>${escapeHtml(s.parentRelation) || "—"}</td>
        <td style="color: var(--primary-brown); font-weight: 700;">${escapeHtml(s.parentPhone) || "—"}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
        <td dir="ltr" class="text-muted" style="text-align: right;">${s.lastLogin || "لم يدخل بعد"}</td>
        <td>
          <span class="badge ${s.status === "active" ? "badge-active" : "badge-danger"}">
            ${s.status === "active" ? "نشط" : "موقوف"}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditStudentComprehensive('${s.id}')">تعديل</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  updatePendingBadgeCount();
};

window.handleAddStudent = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const name = (document.getElementById("stu-name")?.value || "").trim();
  const nationalId = (document.getElementById("stu-id")?.value || "").trim();
  const phone = (document.getElementById("stu-phone")?.value || "").trim();
  const parentName = (
    document.getElementById("stu-parent-name")?.value || ""
  ).trim();
  const parentRelation = (
    document.getElementById("stu-parent-relation")?.value || "أب"
  ).trim();
  const parentPhone = (
    document.getElementById("stu-parent-phone")?.value || ""
  ).trim();
  const circleId = document.getElementById("stu-circle")?.value || "";

  if (!name) {
    alert("يرجى إدخال اسم الطالب.");
    return;
  }

  const newStudent = {
    id: "s_" + Date.now(),
    name: name,
    nationalId: nationalId,
    phone: phone,
    parentName: parentName,
    parentRelation: parentRelation,
    parentPhone: parentPhone,
    circleId: circleId,
    status: "active",
    lastLogin: "لم يدخل بعد",
    createdAt: Date.now(),
  };

  if (!window.appStore.students) window.appStore.students = [];
  window.appStore.students.push(newStudent);

  if (!window.appStore.users) window.appStore.users = [];
  window.appStore.users.push({
    id: newStudent.id,
    name: name,
    phone: phone || parentPhone,
    role: "student",
    username: nationalId || phone || newStudent.id,
    pass: "1111",
    status: "active",
    createdAt: Date.now(),
  });

  if (typeof saveToCloud === "function") {
    saveToCloud("students", newStudent.id, newStudent);
    saveToCloud("users", newStudent.id, {
      id: newStudent.id,
      name: name,
      phone: phone || parentPhone,
      role: "student",
      username: nationalId || phone || newStudent.id,
      pass: "1111",
      status: "active",
    });
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-add-student");
  e.target?.reset();
  alert("✅ تم إضافة الطالب بنجاح! (الرقم السري الافتراضي: 1111)");
  renderStudentsTable();
};

window.openModalEditStudentComprehensive = function (studentId) {
  const student = (window.appStore?.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("edit-comp-stu-id", student.id);
  setVal("edit-comp-name", student.name);
  setVal("edit-comp-national-id", student.nationalId);
  setVal("edit-comp-phone", student.phone);
  setVal("edit-comp-parent-name", student.parentName);
  setVal("edit-comp-parent-relation", student.parentRelation || "أب");
  setVal("edit-comp-parent-phone", student.parentPhone);
  setVal("edit-comp-status", student.status || "active");

  const userRec = (window.appStore?.users || []).find(
    (u) => u.id === student.id,
  );
  setVal("edit-comp-password", userRec ? userRec.pass : "1111");

  const circleSelect = document.getElementById("edit-comp-circle");
  if (circleSelect) {
    let opts = '<option value="">— غير مسجل بحلقة —</option>';
    (window.appStore?.circles || []).forEach((c) => {
      opts += `<option value="${c.id}" ${c.id === student.circleId ? "selected" : ""}>${c.name}</option>`;
    });
    circleSelect.innerHTML = opts;
  }

  openModal("modal-edit-student-comprehensive");
};

window.handleSaveStudentComprehensive = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const studentId = document.getElementById("edit-comp-stu-id")?.value;
  const student = (window.appStore?.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  student.name = (
    document.getElementById("edit-comp-name")?.value || ""
  ).trim();
  student.nationalId = (
    document.getElementById("edit-comp-national-id")?.value || ""
  ).trim();
  student.phone = (
    document.getElementById("edit-comp-phone")?.value || ""
  ).trim();
  student.parentName = (
    document.getElementById("edit-comp-parent-name")?.value || ""
  ).trim();
  student.parentRelation = (
    document.getElementById("edit-comp-parent-relation")?.value || "أب"
  ).trim();
  student.parentPhone = (
    document.getElementById("edit-comp-parent-phone")?.value || ""
  ).trim();
  student.circleId = document.getElementById("edit-comp-circle")?.value || "";
  student.status =
    document.getElementById("edit-comp-status")?.value || "active";
  const password = (
    document.getElementById("edit-comp-password")?.value || "1111"
  ).trim();

  let userRec = (window.appStore?.users || []).find((u) => u.id === student.id);
  if (userRec) {
    userRec.name = student.name;
    userRec.phone = student.phone || student.parentPhone;
    userRec.username = student.nationalId || student.phone || student.id;
    userRec.status = student.status;
    userRec.pass = password || "1111";
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  } else {
    userRec = {
      id: student.id,
      name: student.name,
      phone: student.phone || student.parentPhone,
      role: "student",
      username: student.nationalId || student.phone || student.id,
      pass: password || "1111",
      status: student.status,
      createdAt: Date.now(),
    };
    if (!window.appStore.users) window.appStore.users = [];
    window.appStore.users.push(userRec);
    if (typeof saveToCloud === "function")
      saveToCloud("users", userRec.id, userRec);
  }

  if (typeof saveToCloud === "function")
    saveToCloud("students", student.id, student);
  if (typeof saveLocalStore === "function") saveLocalStore();

  closeModal("modal-edit-student-comprehensive");
  alert("✅ تم اعتماد وتحديث بيانات الطالب بنجاح!");
  renderStudentsTable();
};

window.deleteStudent = async function (studentId) {
  const student = (window.appStore?.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student) return;

  if (!confirm(`هل أنت متأكد من حذف الطالب (${student.name}) نهائياً؟`)) return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => s.id !== studentId,
  );
  window.appStore.users = (window.appStore.users || []).filter(
    (u) => u.id !== studentId,
  );

  if (typeof saveLocalStore === "function") saveLocalStore();
  renderStudentsTable();

  if (typeof saveToCloud === "function") {
    await saveToCloud("students", studentId, null, true);
    await saveToCloud("users", studentId, null, true);
  }

  alert(`✅ تم حذف الطالب (${student.name}) بنجاح!`);
};

window.toggleSelectAllStudents = function (masterCb) {
  document.querySelectorAll(".student-row-cb").forEach((cb) => {
    cb.checked = masterCb.checked;
  });
  handleStudentRowSelectionChange();
};

window.handleStudentRowSelectionChange = function () {
  const selectedCount = document.querySelectorAll(
    ".student-row-cb:checked",
  ).length;
  const badge = document.getElementById("selected-students-count");
  if (badge) badge.textContent = selectedCount;
};

window.openBulkCircleModal = function (actionType) {
  const selected = Array.from(
    document.querySelectorAll(".student-row-cb:checked"),
  ).map((cb) => cb.value);
  if (selected.length === 0) {
    alert("⚠️ يرجى تحديد طالب واحد على الأقل من الجدول أولاً!");
    return;
  }
  const typeEl = document.getElementById("bulk-circle-action-type");
  const descEl = document.getElementById("bulk-circle-desc");
  if (typeEl) typeEl.value = actionType;
  if (descEl)
    descEl.textContent =
      actionType === "transfer"
        ? "اختر الحلقة المراد نقل الطلاب إليها:"
        : "اختر الحلقة المراد إضافة الطلاب إليها:";

  openModal("modal-bulk-circle");
};

window.handleBulkCircleSubmit = function (e) {
  if (e && e.preventDefault) e.preventDefault();
  const circleId = document.getElementById("bulk-target-circle")?.value;
  if (!circleId) {
    alert("⚠️ يرجى اختيار الحلقة المستهدفة!");
    return;
  }

  const selectedIds = Array.from(
    document.querySelectorAll(".student-row-cb:checked"),
  ).map((cb) => cb.value);
  (window.appStore?.students || []).forEach((s) => {
    if (selectedIds.includes(s.id)) {
      s.circleId = circleId;
      if (typeof saveToCloud === "function") saveToCloud("students", s.id, s);
    }
  });

  if (typeof saveLocalStore === "function") saveLocalStore();
  closeModal("modal-bulk-circle");
  alert(`✅ تم تعيين (${selectedIds.length}) طالب في الحلقة المحددة بنجاح!`);
  renderStudentsTable();
};

window.executeBulkDeleteStudents = function () {
  const selectedIds = Array.from(
    document.querySelectorAll(".student-row-cb:checked"),
  ).map((cb) => cb.value);
  if (selectedIds.length === 0) {
    alert("⚠️ يرجى تحديد الطلاب المراد حذفهم أولاً!");
    return;
  }

  if (!confirm(`هل أنت متأكد من حذف (${selectedIds.length}) طالب نهائياً؟`))
    return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => !selectedIds.includes(s.id),
  );
  window.appStore.users = (window.appStore.users || []).filter(
    (u) => !selectedIds.includes(u.id),
  );

  selectedIds.forEach((id) => {
    if (typeof saveToCloud === "function") {
      saveToCloud("students", id, null, true);
      saveToCloud("users", id, null, true);
    }
  });

  if (typeof saveLocalStore === "function") saveLocalStore();
  alert("✅ تم حذف الطلاب المحددين بنجاح!");
  renderStudentsTable();
};

window.executeBulkExportStudentsExcel = function () {
  const table = document.getElementById("students-table-element");
  if (!table) return;
  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير متوفرة!");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "الطلاب" });
  XLSX.writeFile(
    wb,
    `كشف_الطلاب_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

// استيراد 7 أعمدة Excel
const STANDARD_7_COLUMNS = [
  { key: "name", label: "1. اسم الطالب" },
  { key: "nationalId", label: "2. رقم الهوية" },
  { key: "phone", label: "3. جوال الطالب" },
  { key: "parentName", label: "4. اسم ولي الأمر" },
  { key: "parentRelation", label: "5. صلة القرابة" },
  { key: "parentPhone", label: "6. جوال ولي الأمر" },
  { key: "circleName", label: "7. اسم الحلقة" },
];

window.renderExcelColumnMappingInputs = function () {
  const container = document.getElementById("excel-columns-mapping-container");
  if (!container) return;

  container.innerHTML = STANDARD_7_COLUMNS.map(
    (col) => `
    <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem; font-size: 0.85rem;">
      <strong style="color: var(--primary-brown);">${col.label}</strong>
    </div>
  `,
  ).join("");
};

window.executeDynamicExcelImport = function () {
  const fileInput = document.getElementById("excel-dynamic-file");
  const file = fileInput?.files?.[0];
  if (!file) {
    alert("⚠️ يرجى اختيار ملف Excel أولاً!");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("⚠️ مكتبة Excel غير محملة!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (!rows || rows.length <= 1) {
        alert("⚠️ الملف فارغ أو لا يحتوي على صفوف بيانات كافية!");
        return;
      }

      if (!window.appStore.students) window.appStore.students = [];
      if (!window.appStore.users) window.appStore.users = [];

      let importedCount = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const name = String(row[0] || "").trim();
        const nationalId = String(row[1] || "").trim();
        const phone = String(row[2] || "").trim();
        const parentName =
          String(row[3] || "").trim() || `ولي أمر ${name.split(" ")[0]}`;
        const parentRelation = String(row[4] || "أب").trim();
        const parentPhone = String(row[5] || "").trim();
        const circleNameInput = String(row[6] || "").trim();

        let targetCircleId = "";
        if (circleNameInput) {
          const matchCircle = (window.appStore.circles || []).find(
            (c) => c.name.trim() === circleNameInput,
          );
          if (matchCircle) {
            targetCircleId = matchCircle.id;
          } else {
            targetCircleId = "c_" + Date.now() + "_" + i;
            window.appStore.circles.push({
              id: targetCircleId,
              name: circleNameInput,
              mosque: "جامع الهدى",
              teacherIds: [],
              teacherId: "",
              status: "نشطة",
              createdAt: Date.now(),
            });
          }
        }

        const newStudent = {
          id: "s_imp_" + Date.now() + "_" + i,
          name: name,
          nationalId: nationalId,
          phone: phone,
          parentName: parentName,
          parentRelation: parentRelation,
          parentPhone: parentPhone,
          circleId: targetCircleId,
          status: "active",
          lastLogin: "لم يدخل بعد",
          createdAt: Date.now(),
        };

        window.appStore.students.push(newStudent);
        window.appStore.users.push({
          id: newStudent.id,
          name: name,
          phone: phone || parentPhone,
          role: "student",
          username: nationalId || phone || newStudent.id,
          pass: "1111",
          status: "active",
          createdAt: Date.now(),
        });

        if (typeof saveToCloud === "function") {
          saveToCloud("students", newStudent.id, newStudent);
        }
        importedCount++;
      }

      if (typeof saveLocalStore === "function") saveLocalStore();
      closeModal("modal-excel-import");
      fileInput.value = "";
      alert(
        `✅ تم استيراد (${importedCount}) طالب بنجاح! تم تعيين الرقم السري 1111 للجميع.`,
      );
      renderStudentsTable();
      if (typeof updateCircleDropdowns === "function") updateCircleDropdowns();
    } catch (err) {
      alert("❌ حدث خطأ أثناء قراءة ملف Excel: " + err.message);
    }
  };

  reader.readAsArrayBuffer(file);
};

// إدارة الحسابات
window.renderAccountsTable = function () {
  const tbody = document.getElementById("accounts-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("search-accounts")?.value || "")
    .trim()
    .toLowerCase();
  const roleFilter =
    document.getElementById("filter-account-role")?.value || "all";
  const statusFilter =
    document.getElementById("filter-account-status")?.value || "all";

  const users = window.appStore?.users || [];
  const filtered = users
    .filter((u) => {
      const matchesSearch =
        (u.name && u.name.toLowerCase().includes(searchVal)) ||
        (u.username && String(u.username).includes(searchVal)) ||
        (u.phone && String(u.phone).includes(searchVal));

      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = u.status === "active";
      else if (statusFilter === "suspended")
        matchesStatus = u.status === "suspended" || u.status === "archived";

      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted p-4">لا توجد حسابات مطابقة</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach((u, idx) => {
    const roleBadge =
      u.role === "admin"
        ? '<span class="badge" style="background:#805333; color:#fff;">مدير</span>'
        : u.role === "teacher"
          ? '<span class="badge" style="background:#0b6b7d; color:#fff;">معلم</span>'
          : u.role === "screen"
            ? '<span class="badge" style="background:#2e7d32; color:#fff;">التميز الأسبوعي</span>'
            : '<span class="badge badge-warning">طالب</span>';

    const isActive = u.status === "active";

    html += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700;">${escapeHtml(u.name)}</td>
        <td>${roleBadge}</td>
        <td><code>${escapeHtml(u.username)}</code></td>
        <td><code>${escapeHtml(u.pass) || (u.role === "student" ? "1111" : "1234")}</code></td>
        <td><span class="badge ${isActive ? "badge-active" : "badge-danger"}">${isActive ? "نشط" : "موقوف"}</span></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm" onclick="openModalEditUserAccount('${u.id}')">تعديل</button>
            <button class="btn ${isActive ? "btn-danger" : "btn-success"} btn-sm" onclick="toggleUserAccountStatus('${u.id}')">
              ${isActive ? "إيقاف" : "تفعيل"}
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

function resizeImageFileToDataUrl(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("تعذر تحميل الصورة"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

window._pendingAccountPhotoDataUrl = null;
window._pendingAccountPhotoRemoved = false;

window.previewAccountPhotoFile = async function (event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("⚠️ يرجى اختيار ملف صورة صالح.");
    event.target.value = "";
    return;
  }

  try {
    const dataUrl = await resizeImageFileToDataUrl(file, 200, 0.75);
    window._pendingAccountPhotoDataUrl = dataUrl;
    window._pendingAccountPhotoRemoved = false;

    const preview = document.getElementById("edit-account-photo-preview");
    const letter = document.getElementById("edit-account-photo-letter");
    const removeBtn = document.getElementById("btn-remove-account-photo");
    if (preview) {
      preview.src = dataUrl;
      preview.style.display = "block";
    }
    if (letter) letter.style.display = "none";
    if (removeBtn) removeBtn.style.display = "inline-flex";
  } catch (e) {
    console.error("تعذر معالجة الصورة:", e);
    alert("⚠️ تعذر معالجة الصورة المختارة، يرجى تجربة صورة أخرى.");
  }
};

window.removeAccountPhoto = function () {
  window._pendingAccountPhotoDataUrl = null;
  window._pendingAccountPhotoRemoved = true;

  const fileInput = document.getElementById("edit-account-photo-file");
  const preview = document.getElementById("edit-account-photo-preview");
  const letter = document.getElementById("edit-account-photo-letter");
  const removeBtn = document.getElementById("btn-remove-account-photo");
  if (fileInput) fileInput.value = "";
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
  if (letter) letter.style.display = "flex";
  if (removeBtn) removeBtn.style.display = "none";
};

window.openModalEditUserAccount = function (userId) {
  const user = (window.appStore?.users || []).find((u) => u.id === userId);
  if (!user) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  };

  setVal("edit-account-user-id", user.id);
  setVal("edit-account-name", user.name);
  setVal("edit-account-username", user.username || "");
  setVal(
    "edit-account-password",
    user.pass || (user.role === "student" ? "1111" : "1234"),
  );

  window._pendingAccountPhotoDataUrl = null;
  window._pendingAccountPhotoRemoved = false;
  const fileInput = document.getElementById("edit-account-photo-file");
  const preview = document.getElementById("edit-account-photo-preview");
  const letter = document.getElementById("edit-account-photo-letter");
  const removeBtn = document.getElementById("btn-remove-account-photo");
  if (fileInput) fileInput.value = "";

  if (user.photoURL) {
    if (preview) {
      preview.src = user.photoURL;
      preview.style.display = "block";
    }
    if (letter) letter.style.display = "none";
    if (removeBtn) removeBtn.style.display = "inline-flex";
  } else {
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
    if (letter) {
      letter.style.display = "flex";
      letter.textContent = user.name ? user.name.charAt(0) : "؟";
    }
    if (removeBtn) removeBtn.style.display = "none";
  }

  openModal("modal-edit-user-account");
};

window.handleSaveUserAccount = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = document.getElementById("edit-account-user-id")?.value;
  const user = (window.appStore?.users || []).find((u) => u.id === id);
  if (!user) return;

  user.name = (
    document.getElementById("edit-account-name")?.value || ""
  ).trim();
  user.username = (
    document.getElementById("edit-account-username")?.value || ""
  ).trim();
  const newPass = (
    document.getElementById("edit-account-password")?.value ||
    (user.role === "student" ? "1111" : "1234")
  ).trim();
  if (newPass) user.pass = newPass;

  if (window._pendingAccountPhotoDataUrl) {
    user.photoURL = window._pendingAccountPhotoDataUrl;
  } else if (window._pendingAccountPhotoRemoved) {
    user.photoURL = null;
  }

  if (user.role === "student") {
    const stu = (window.appStore?.students || []).find((s) => s.id === user.id);
    if (stu) {
      stu.name = user.name;
      stu.photoURL = user.photoURL || null;
      if (typeof saveToCloud === "function")
        saveToCloud("students", stu.id, stu);
    }
  } else if (user.role === "teacher") {
    const teach = (window.appStore?.teachers || []).find(
      (t) => t.userId === user.id || t.id === user.id,
    );
    if (teach) {
      teach.name = user.name;
      teach.phone = user.username;
      teach.photoURL = user.photoURL || null;
      if (typeof saveToCloud === "function")
        saveToCloud("teachers", teach.id, teach);
    }
  }

  if (typeof saveToCloud === "function") saveToCloud("users", user.id, user);
  if (typeof saveLocalStore === "function") saveLocalStore();

  if (window.currentUser && window.currentUser.id === user.id) {
    window.currentUser.name = user.name;
    window.currentUser.photoURL = user.photoURL;
    if (typeof updateSidebarUserAvatar === "function")
      updateSidebarUserAvatar(window.currentUser);
  }

  window._pendingAccountPhotoDataUrl = null;
  window._pendingAccountPhotoRemoved = false;

  closeModal("modal-edit-user-account");
  alert("✅ تم حفظ وتأكيد تعديلات الحساب بنجاح!");
  renderAccountsTable();
};

window.toggleUserAccountStatus = function (userId) {
  const user = (window.appStore?.users || []).find((u) => u.id === userId);
  if (!user) return;

  if (
    user.role === "admin" &&
    window.currentUser &&
    window.currentUser.id === userId
  ) {
    alert("⚠️ لا يمكن إيقاف حساب المدير المسجل به حالياً.");
    return;
  }

  user.status = user.status === "active" ? "suspended" : "active";
  if (typeof saveToCloud === "function") saveToCloud("users", user.id, user);

  if (user.role === "student") {
    const stu = (window.appStore?.students || []).find((s) => s.id === userId);
    if (stu) {
      stu.status = user.status === "active" ? "active" : "archived";
      if (typeof saveToCloud === "function")
        saveToCloud("students", stu.id, stu);
    }
  } else if (user.role === "teacher") {
    const teach = (window.appStore?.teachers || []).find(
      (t) => t.userId === userId || t.id === userId,
    );
    if (teach) {
      teach.status = user.status;
      if (typeof saveToCloud === "function")
        saveToCloud("teachers", teach.id, teach);
    }
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  renderAccountsTable();
};

// التحضير: لا غياب تلقائي مسبق، ولكن بمجرد رصد أول طالب يتم تغييب البقية تلقائياً
window.renderAttendanceTable = function () {
  const tbody = document.getElementById("attendance-table-body");
  if (!tbody) return;

  const circleId = document.getElementById("attendance-circle-select")?.value;
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const searchVal = (
    document.getElementById("search-attendance-student")?.value || ""
  )
    .trim()
    .toLowerCase();

  if (!circleId) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-muted p-4">يرجى اختيار الحلقة لعرض كشف التحضير</td></tr>';
    return;
  }

  let students = (window.appStore?.students || []).filter(
    (s) => studentInCircle(s, circleId) && s.status === "active",
  );
  if (searchVal)
    students = students.filter(
      (s) => s.name && s.name.toLowerCase().includes(searchVal),
    );
  students = students.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "ar"),
  );

  if (students.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-muted p-4">لا يوجد طلاب في هذه الحلقة</td></tr>';
    return;
  }

  const currentUser = window.currentUser;
  const isTeacher = currentUser && currentUser.role === "teacher";

  let html = "";
  students.forEach((s) => {
    const record =
      (window.appStore?.attendance || []).find(
        (a) => a.studentId === s.id && a.date === dateVal,
      ) || {};

    const effectiveStatus = record.status || "";
    const isLockedForTeacher = isTeacher && effectiveStatus !== "";

    let selectOptionsHtml;
    if (isTeacher) {
      selectOptionsHtml = `
      <option value="" ${effectiveStatus === "" ? "selected" : ""}>— غير محدد —</option>
      <option value="present" ${effectiveStatus === "present" ? "selected" : ""}>🟢 حاضر</option>
      <option value="absent" ${effectiveStatus === "absent" ? "selected" : ""}>🔴 غائب</option>
    `;
      // المعلم مقيَّد باختيار 3 حالات فقط، لكن لو كانت الحالة الفعلية محدَّدة من
      // المدير بقيمة خارج هذه الثلاث (متأخر/مستأذن) يجب أن تظهر له كما هي فعلاً
      // بدل أن يظهر السجل وكأنه "غير محدد" لعدم وجود خيار مطابق يُحدَّد تلقائياً
      if (effectiveStatus === "late") {
        selectOptionsHtml += `<option value="late" selected>🟡 متأخر</option>`;
      } else if (effectiveStatus === "excused") {
        selectOptionsHtml += `<option value="excused" selected>🔵 مستأذن</option>`;
      }
    } else {
      selectOptionsHtml = `
      <option value="" ${effectiveStatus === "" ? "selected" : ""}>— غير محدد —</option>
      <option value="present" ${effectiveStatus === "present" ? "selected" : ""}>🟢 حاضر</option>
      <option value="late" ${effectiveStatus === "late" ? "selected" : ""}>🟡 متأخر</option>
      <option value="absent" ${effectiveStatus === "absent" ? "selected" : ""}>🔴 غائب</option>
      <option value="excused" ${effectiveStatus === "excused" ? "selected" : ""}>🔵 مستأذن</option>
    `;
    }

    html += `
      <tr>
        <td style="font-weight: 700;">${escapeHtml(s.name)}</td>
        <td>${escapeHtml(getCircleName(s.circleId))}</td>
        <td>
          <select class="form-control" style="font-weight: 700;" onchange="setStudentAttendance('${s.id}', this.value)" ${isLockedForTeacher ? 'disabled title="لا يمكن تعديل حالة مسجّلة مسبقاً - متاح لمدير المَجْمَع فقط"' : ""}>
            ${selectOptionsHtml}
          </select>
        </td>
        <td>
          <input type="text" class="form-control" placeholder="ملاحظة..." value="${escapeHtml(record.notes) || ""}" onchange="updateAttendanceNotes('${s.id}', this.value)" ${isTeacher ? 'readonly title="تعديل الملاحظات محصور بالإدارة"' : ""}>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

// رسالة تأكيد صغيرة تختفي تلقائياً (بدون حجب الشاشة كالـ alert) - تُستخدم لتأكيد
// حفظ تعديل بسيط ومتكرر (مثل تغيير حالة تحضير طالب) دون إزعاج المدير بنافذة
// منبثقة يجب إغلاقها يدوياً في كل مرة
function showQuickSaveConfirmation(message) {
  let el = document.getElementById("quick-save-confirmation-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "quick-save-confirmation-toast";
    el.style.cssText =
      "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1b5e20; color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; z-index: 99999; box-shadow: 0 4px 14px rgba(0,0,0,0.25); transition: opacity 0.3s;";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.opacity = "1";
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.style.opacity = "0";
  }, 1800);
}

// سجل تاريخ التحضير: يحفظ لقطة من حالة السجل قبل أي تعديل عليها (وليس بعدها) -
// حتى لو حصل خطأ مستقبلي (بشري أو تقني) يقدر المدير يرجع يشوف الحالة قبل آخر تعديل
window.logAttendanceHistorySnapshot = function (previousRecord, actor) {
  if (!previousRecord || !previousRecord.id) return;
  const entry = {
    id: `hist_${previousRecord.id}_${Date.now()}`,
    recordId: previousRecord.id,
    studentId: previousRecord.studentId,
    circleId: previousRecord.circleId || "",
    date: previousRecord.date,
    previousStatus: previousRecord.status || "",
    previousNotes: previousRecord.notes || "",
    changedByName: actor ? actor.name : "غير معروف",
    changedByRole: actor ? actor.role : "",
    savedAt: Date.now(),
  };
  if (!window.appStore.attendanceHistory) window.appStore.attendanceHistory = [];
  window.appStore.attendanceHistory.push(entry);
  if (typeof saveToCloud === "function") {
    saveToCloud("attendanceHistory", entry.id, entry);
  }
};

// نافذة سجل تاريخ التحضير - متاحة للمدير فقط، تعرض كل تغيير سابق على حضور
// الحلقة/التاريخ المحدَّدين حالياً بشاشة التحضير (القيمة قبل كل تعديل ومن قام به)
window.openAttendanceHistoryModal = async function () {
  const currentUser = window.currentUser;
  if (!currentUser || currentUser.role !== "admin") {
    alert("⚠️ سجل تاريخ التحضير متاح لمدير المَجْمَع فقط.");
    return;
  }

  const circleId = document.getElementById("attendance-circle-select")?.value;
  const dateVal = document.getElementById("attendance-date-select")?.value;
  if (!circleId || !dateVal) {
    alert("⚠️ يرجى اختيار الحلقة والتاريخ أولاً.");
    return;
  }

  const modal = document.getElementById("modal-attendance-history");
  const tbody = document.getElementById("attendance-history-tbody");
  if (!modal || !tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="5" class="text-center text-muted p-3">جاري التحميل...</td></tr>';
  modal.classList.add("active");

  let entries = [];
  try {
    const snap = await dbFirestore
      .collection("attendanceHistory")
      .where("circleId", "==", circleId)
      .where("date", "==", dateVal)
      .get();
    entries = snap.docs.map((d) => d.data());
  } catch (e) {
    console.error("تعذر جلب سجل تاريخ التحضير:", e);
  }

  entries.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

  const statusLabels = {
    present: "🟢 حاضر",
    absent: "🔴 غائب",
    late: "🟡 متأخر",
    excused: "🔵 مستأذن",
    "": "— غير محدد —",
  };

  if (entries.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-muted p-3">لا يوجد أي تعديل مسجّل على تحضير هذا اليوم لهذه الحلقة</td></tr>';
    return;
  }

  tbody.innerHTML = entries
    .map((e) => {
      const student = (window.appStore?.students || []).find(
        (s) => s.id === e.studentId,
      );
      const stuName = student ? escapeHtml(student.name) : e.studentId;
      const when = new Date(e.savedAt).toLocaleString("ar-SA");
      return `
        <tr>
          <td style="font-weight:700;">${stuName}</td>
          <td>${statusLabels[e.previousStatus] || e.previousStatus || "—"}</td>
          <td>${escapeHtml(e.changedByName) || "—"}</td>
          <td>${e.changedByRole === "admin" ? "المدير" : e.changedByRole === "teacher" ? "المعلم" : "—"}</td>
          <td style="white-space:nowrap;">${when}</td>
        </tr>
      `;
    })
    .join("");
};

// رصد التحضير - كل طالب مستقل تماماً بحاله، لا يُغيَّر أي طالب آخر تلقائياً أبداً
// بمجرد تحضير طالب واحد. المعلم مقيَّد بثلاث حالات فقط (غير محدد/حاضر/غائب) ولا
// يقدر يعدّل حالة سبق تسجيلها إطلاقاً - المدير فقط له كل الحالات والتعديل دائماً
window.setStudentAttendance = async function (studentId, status) {
  const dateVal = document.getElementById("attendance-date-select")?.value;
  const circleId = document.getElementById("attendance-circle-select")?.value;
  const recordId = `att_${studentId}_${dateVal}`;
  const currentUser = window.currentUser;
  const isTeacher = currentUser && currentUser.role === "teacher";

  if (!window.appStore.attendance) window.appStore.attendance = [];
  let record = window.appStore.attendance.find((a) => a.id === recordId);

  if (isTeacher) {
    if (status !== "" && status !== "present" && status !== "absent") {
      alert("⚠️ المعلم يقدر يسجّل فقط (حاضر) أو (غائب).");
      renderAttendanceTable();
      return;
    }
    if (record && record.status && record.status !== "") {
      alert(
        "⚠️ لا يمكن تعديل حالة حضور مسجّلة مسبقاً - هذا متاح لمدير المَجْمَع فقط.",
      );
      renderAttendanceTable();
      return;
    }
  }

  // حفظ لقطة من القيمة قبل التعديل (سجل تاريخ التحضير) - فقط عند تعديل سجل موجود
  // فعلاً وله حالة سابقة، حتى يقدر المدير يرجع لها لاحقاً لو احتاج
  if (
    record &&
    typeof record.status !== "undefined" &&
    record.status !== status &&
    typeof window.logAttendanceHistorySnapshot === "function"
  ) {
    window.logAttendanceHistorySnapshot(record, currentUser);
  }

  if (!record) {
    record = {
      id: recordId,
      studentId: studentId,
      circleId: circleId || "",
      date: dateVal,
      status: status,
      notes: isTeacher ? "تحضير معلم" : "تحضير إدارة",
      updatedBy: isTeacher ? "teacher" : "admin",
      createdAt: Date.now(),
    };
    window.appStore.attendance.push(record);
  } else {
    record.status = status;
    if (circleId) record.circleId = circleId;
    record.updatedBy = isTeacher ? "teacher" : "admin";
  }

  // ننتظر هنا فعلياً نتيجة الحفظ السحابي (بدل إطلاقه دون انتظار) لنعرف بشكل مؤكد
  // هل وصل التعديل فعلاً للخادم أم لا، بدل افتراض النجاح دائماً بصمت
  let saveOk = true;
  if (typeof saveToCloud === "function") {
    saveOk = await saveToCloud("attendance", record.id, record);
  }

  if (typeof saveLocalStore === "function") saveLocalStore();
  renderAttendanceTable();

  // تأكيد صريح وبسيط للمدير أن التعديل وصل فعلاً للخادم (بدل الصمت الذي كان يجعل
  // فشل الحفظ - إن حدث - غير ملحوظ إلا لاحقاً حين "يعود" التحضير لحالته القديمة).
  // تنبيه فشل الحفظ نفسه يظهر أصلاً من داخل saveToCloud عند حدوث خطأ فعلي.
  if (!isTeacher && saveOk) {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === studentId,
    );
    const stuName = student ? student.name : "الطالب";
    showQuickSaveConfirmation(`✅ تم حفظ تحضير (${stuName}) بنجاح`);
  }

  if (isTeacher && typeof window.logTeacherActivity === "function") {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === studentId,
    );
    const stuName = student ? student.name : "طالب";
    const statusText =
      status === "present"
        ? "حاضر 🟢"
        : status === "late"
          ? "متأخر 🟡"
          : status === "absent"
            ? "غائب 🔴"
            : "إلغاء التحضير";
    window.logTeacherActivity(
      "تحضير طالب",
      `رصد حالة الطالب (${stuName}) كـ (${statusText})`,
      currentUser.name,
      getCircleName(circleId),
    );
  }
};

window.updateAttendanceNotes = function (studentId, notesVal) {
  const currentUser = window.currentUser;
  if (currentUser && currentUser.role === "teacher") {
    alert("⚠️ تعديل ملاحظات التحضير محصور بمدير المَجْمَع فقط.");
    renderAttendanceTable();
    return;
  }

  const dateVal = document.getElementById("attendance-date-select")?.value;
  const circleId =
    document.getElementById("attendance-circle-select")?.value || "";
  const recordId = `att_${studentId}_${dateVal}`;

  if (!window.appStore.attendance) window.appStore.attendance = [];
  let record = (window.appStore?.attendance || []).find(
    (a) => a.id === recordId,
  );

  if (!record) {
    record = {
      id: recordId,
      studentId: studentId,
      circleId: circleId,
      date: dateVal,
      status: "",
      notes: notesVal,
      updatedBy: "admin",
      createdAt: Date.now(),
    };
    window.appStore.attendance.push(record);
  } else {
    record.notes = notesVal;
    record.updatedBy = "admin";
  }

  if (typeof saveToCloud === "function")
    saveToCloud("attendance", record.id, record);
  if (typeof saveLocalStore === "function") saveLocalStore();
};

window.markAllAbsent = function () {
  const currentUser = window.currentUser;
  if (currentUser && currentUser.role === "teacher") {
    alert("⚠️ خاصية تعيين الكل كغائب متاحة لمدير المَجْمَع فقط.");
    return;
  }

  const circleId = document.getElementById("attendance-circle-select")?.value;
  if (!circleId) {
    alert("⚠️ يرجى اختيار الحلقة أولاً!");
    return;
  }
  const students = (window.appStore?.students || []).filter(
    (s) => studentInCircle(s, circleId) && s.status === "active",
  );
  students.forEach((s) => setStudentAttendance(s.id, "absent"));
  renderAttendanceTable();
  alert("✅ تم تحديد جميع طلاب الحلقة كـ (غائب)!");
};

// تحديد حالة تحضير واحدة (أي حالة من الأربع) لكل طلاب الحلقة دفعة واحدة - متاح
// للمدير فقط، بنفس فكرة "الكل غائب" لكن بأي حالة يختارها بدل الغياب فقط
window.markAllAttendanceStatus = async function (status) {
  if (!status) return;

  const currentUser = window.currentUser;
  if (currentUser && currentUser.role === "teacher") {
    alert("⚠️ هذه الخاصية متاحة لمدير المَجْمَع فقط.");
    return;
  }

  const circleId = document.getElementById("attendance-circle-select")?.value;
  if (!circleId) {
    alert("⚠️ يرجى اختيار الحلقة أولاً!");
    return;
  }

  const statusLabels = {
    present: "حاضر",
    absent: "غائب",
    late: "متأخر",
    excused: "مستأذن",
  };

  const students = (window.appStore?.students || []).filter(
    (s) => studentInCircle(s, circleId) && s.status === "active",
  );

  if (students.length === 0) {
    alert("⚠️ لا يوجد طلاب نشطون بهذه الحلقة.");
    return;
  }

  if (
    !confirm(
      `هل أنت متأكد من تحديد جميع طلاب الحلقة (${students.length}) كـ (${statusLabels[status] || status})؟`,
    )
  ) {
    return;
  }

  await Promise.all(students.map((s) => setStudentAttendance(s.id, status)));
  renderAttendanceTable();
  alert(
    `✅ تم تحديد جميع طلاب الحلقة (${students.length}) كـ (${statusLabels[status] || status}) بنجاح!`,
  );
};

// ملاحظات المعلمين
window.renderTeacherNotesTable = function () {
  if (!window.currentUser || window.currentUser.role !== "admin") return;
  const tbody = document.getElementById("teacher-notes-table-body");
  if (!tbody) return;

  const searchVal = (
    document.getElementById("search-teacher-notes")?.value || ""
  )
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-teacher-notes-circle")?.value || "all";

  const records = (window.appStore?.tasmeea || []).filter(
    (t) => t.adminNotes && t.adminNotes.trim() !== "",
  );
  records.sort(
    (a, b) =>
      (b.date || "").localeCompare(a.date || "") ||
      (b.updatedAt || 0) - (a.updatedAt || 0),
  );

  const filtered = records.filter((t) => {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === t.studentId,
    );
    const matchesSearch =
      (student && student.name.toLowerCase().includes(searchVal)) ||
      t.adminNotes.toLowerCase().includes(searchVal);
    const matchesCircle = circleFilter === "all" || t.circleId === circleFilter;
    return matchesSearch && matchesCircle;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted p-4">لا توجد ملاحظات مسجلة موجهة للإدارة حالياً</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach((t, idx) => {
    const student = (window.appStore?.students || []).find(
      (s) => s.id === t.studentId,
    );
    const circle = (window.appStore?.circles || []).find(
      (c) => c.id === t.circleId,
    );
    let teacherName = "—";
    if (circle) {
      const teach = (window.appStore?.teachers || []).find(
        (tc) =>
          (Array.isArray(circle.teacherIds) &&
            circle.teacherIds.includes(tc.id)) ||
          circle.teacherId === tc.id,
      );
      if (teach) teacherName = teach.name;
    }

    html += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${t.date || "—"}</td>
        <td style="font-weight: 700;">${escapeHtml(teacherName)}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${escapeHtml(circle ? circle.name : "—")}</span></td>
        <td style="font-weight: 700; color: var(--primary-brown);">${escapeHtml(student ? student.name : "طالب")}</td>
        <td style="white-space: normal; line-height: 1.6;">${escapeHtml(t.adminNotes)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

// الاختبارات
// قائمة الاختبارات بعد تطبيق البحث (اسم الطالب/الحلقة/المرحلية/الجائزة) وفلتر
// الحلقة، مرتبة أبجدياً باسم الطالب - مشتركة بين الجدول والتقرير المستخرج
function getFilteredSortedTests() {
  const searchVal = (document.getElementById("search-tests")?.value || "")
    .trim()
    .toLowerCase();
  const circleFilter =
    document.getElementById("filter-test-circle")?.value || "all";
  const students = window.appStore?.students || [];
  const circles = window.appStore?.circles || [];

  return (window.appStore?.tests || [])
    .map((t) => {
      const student = students.find((s) => s.id === t.studentId);
      const circle = circles.find((c) => c.id === t.circleId);
      return {
        test: t,
        studentName: student ? student.name : "طالب",
        circleName: circle ? circle.name : "—",
      };
    })
    .filter(({ test, studentName, circleName }) => {
      const matchesCircle =
        circleFilter === "all" || test.circleId === circleFilter;
      if (!matchesCircle) return false;
      if (!searchVal) return true;
      return [studentName, circleName, test.type, test.prize].some(
        (v) => v && String(v).toLowerCase().includes(searchVal),
      );
    })
    .sort(
      (a, b) =>
        a.studentName.localeCompare(b.studentName, "ar") ||
        (a.test.date || "").localeCompare(b.test.date || ""),
    );
}

window.renderTestsTable = function () {
  const tbody = document.getElementById("tests-table-body");
  if (!tbody) return;

  const circleFilterSelect = document.getElementById("filter-test-circle");
  if (circleFilterSelect) {
    const currentVal = circleFilterSelect.value || "all";
    let opts = '<option value="all">كل الحلقات</option>';
    (window.appStore?.circles || []).forEach((c) => {
      opts += `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`;
    });
    circleFilterSelect.innerHTML = opts;
    circleFilterSelect.value = (window.appStore?.circles || []).some(
      (c) => c.id === currentVal,
    )
      ? currentVal
      : "all";
  }

  const rows = getFilteredSortedTests();

  let html = rows.length
    ? ""
    : '<tr><td colspan="8" class="text-center text-muted p-4">لا توجد اختبارات مسجلة</td></tr>';
  rows.forEach(({ test: t, studentName, circleName }) => {
    html += `
      <tr>
        <td style="font-weight: 700;">${escapeHtml(studentName)}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${escapeHtml(circleName)}</span></td>
        <td>${escapeHtml(t.type) || "—"}</td>
        <td style="font-weight: 700; color: var(--primary-brown);">${escapeHtml(t.score) || "0"} / 100</td>
        <td><span class="badge badge-active">${escapeHtml(t.rating) || "—"}</span></td>
        <td>${escapeHtml(t.prize) || "—"}</td>
        <td>${escapeHtml(t.date) || "—"}</td>
        <td class="no-print">
          <button class="btn btn-danger btn-sm" onclick="deleteTest('${t.id}')">حذف</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  const reportWrapper = document.getElementById("tests-report-wrapper");
  if (reportWrapper && reportWrapper.style.display !== "none") {
    generateTestsReport();
  }
};

// استخراج تقرير الاختبارات: جدول نظيف (بدون عمود الإجراءات أو أي أزرار)
// بترويسة وتذييل الطباعة الرسمية - هو وحده ما يُطبع أو يُصدَّر
window.generateTestsReport = function () {
  const wrapper = document.getElementById("tests-report-wrapper");
  if (!wrapper) return null;

  const rows = getFilteredSortedTests();
  const cell = "padding: 8px; border: 1px solid #2E657E; text-align: center;";
  const head = "padding: 10px 8px; border: 1px solid #2E657E; text-align: center;";

  let bodyHtml = "";
  if (rows.length === 0) {
    bodyHtml =
      '<tr><td colspan="8" style="padding: 16px; text-align: center;">لا توجد اختبارات مطابقة</td></tr>';
  } else {
    rows.forEach(({ test: t, studentName, circleName }, idx) => {
      bodyHtml += `
        <tr>
          <td style="${cell}">${idx + 1}</td>
          <td style="${cell} font-weight: 800; text-align: right; white-space: nowrap;">${escapeHtml(studentName)}</td>
          <td style="${cell}">${escapeHtml(circleName)}</td>
          <td style="${cell}">${escapeHtml(t.type) || "—"}</td>
          <td style="${cell} font-weight: 700;">${escapeHtml(t.score) || "0"} / 100</td>
          <td style="${cell}">${escapeHtml(t.rating) || "—"}</td>
          <td style="${cell}">${escapeHtml(t.prize) || "—"}</td>
          <td style="${cell}">${escapeHtml(t.date) || "—"}</td>
        </tr>
      `;
    });
  }

  const circleFilter =
    document.getElementById("filter-test-circle")?.value || "all";
  const circle = (window.appStore?.circles || []).find(
    (c) => c.id === circleFilter,
  );
  const chrome = window.buildOfficialPrintChrome(
    "سجل الاختبارات والنتائج",
    circle ? escapeHtml(circle.name) : "كل الحلقات",
    "",
    "",
  );

  wrapper.innerHTML = `
    <style>
      #tests-report-table tbody tr:nth-child(even) { background-color: #DDECF3 !important; }
      #tests-report-table thead th { background-color: #2E657E !important; color: #ffffff !important; border-bottom-color: #C9A227 !important; }
    </style>
    <div style="border: 2.5px double #2E657E; border-radius: 8px; padding: 1.5rem; background: #ffffff;">
      ${chrome.header}
      <div class="table-responsive" style="margin-bottom: 0.8rem;">
        <table class="data-table" id="tests-report-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #2E657E;">
          <thead>
            <tr>
              <th style="${head} width: 40px;">م</th>
              <th style="${head}">اسم الطالب</th>
              <th style="${head}">الحلقة</th>
              <th style="${head}">المرحلية</th>
              <th style="${head}">الدرجة</th>
              <th style="${head}">التقدير</th>
              <th style="${head}">الجائزة</th>
              <th style="${head}">التاريخ</th>
            </tr>
          </thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
      ${chrome.footer}
    </div>
  `;
  wrapper.style.display = "block";
  return document.getElementById("tests-report-table");
};

window.openModalAddTest = function () {
  const filterInput = document.getElementById("test-student-filter");
  if (filterInput) filterInput.value = "";

  const stuSelect = document.getElementById("test-student-select");
  if (stuSelect) stuSelect.value = "";
  populateTestStudentsDropdown();

  const typeInput = document.getElementById("test-type");
  if (typeInput) typeInput.value = "";

  const scoreInput = document.getElementById("test-score");
  if (scoreInput) scoreInput.value = "100";

  const ratingSelect = document.getElementById("test-rating");
  if (ratingSelect) ratingSelect.value = "ممتاز";

  const prizeInput = document.getElementById("test-prize");
  if (prizeInput) prizeInput.value = "";

  openModal("modal-add-test");
};

// كل الطلاب النشطين بلا اشتراط اختيار الحلقة، مرتبين أبجدياً ويظهر بجانب كل
// اسم حلقته - والبحث يطابق اسم الطالب أو اسم الحلقة
window.populateTestStudentsDropdown = function () {
  const stuSelect = document.getElementById("test-student-select");
  if (!stuSelect) return;

  const query = (document.getElementById("test-student-filter")?.value || "")
    .trim()
    .toLowerCase();
  const previousVal = stuSelect.value;
  const circles = window.appStore?.circles || [];

  const list = (window.appStore?.students || [])
    .filter((s) => s.status === "active")
    .map((s) => {
      const circle = circles.find((c) => c.id === s.circleId);
      return { student: s, circleName: circle ? circle.name : "بدون حلقة" };
    })
    .filter(
      ({ student, circleName }) =>
        !query ||
        (student.name || "").toLowerCase().includes(query) ||
        circleName.toLowerCase().includes(query),
    )
    .sort((a, b) =>
      (a.student.name || "").localeCompare(b.student.name || "", "ar"),
    );

  let opts = "";
  list.forEach(({ student, circleName }) => {
    opts += `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)} — ${escapeHtml(circleName)}</option>`;
  });
  stuSelect.innerHTML =
    opts || '<option value="" disabled>لا يوجد طالب مطابق</option>';

  if (list.some(({ student }) => student.id === previousVal)) {
    stuSelect.value = previousVal;
  } else if (list.length === 1) {
    stuSelect.value = list[0].student.id;
  }
};

window.handleSaveTest = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const studentId = document.getElementById("test-student-select")?.value || "";
  const type = (document.getElementById("test-type")?.value || "").trim();
  const score = document.getElementById("test-score")?.value || "100";
  const rating = document.getElementById("test-rating")?.value || "ممتاز";
  const prize = (document.getElementById("test-prize")?.value || "").trim();

  const student = (window.appStore?.students || []).find(
    (s) => s.id === studentId,
  );
  if (!student || !type) {
    alert("يرجى اختيار الطالب وكتابة المرحلية.");
    return;
  }

  const now = new Date();
  const newTest = {
    id: "test_" + Date.now(),
    circleId: student.circleId || "",
    studentId,
    type,
    score,
    rating,
    prize,
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    createdAt: Date.now(),
  };

  if (!window.appStore.tests) window.appStore.tests = [];
  window.appStore.tests.push(newTest);

  if (typeof saveToCloud === "function")
    saveToCloud("tests", newTest.id, newTest);
  if (typeof saveLocalStore === "function") saveLocalStore();

  closeModal("modal-add-test");
  alert("✅ تم حفظ الاختبار بنجاح!");
  renderTestsTable();
};

window.deleteTest = function (testId) {
  if (!confirm("هل أنت متأكد من حذف هذا الاختبار؟")) return;

  window.appStore.tests = (window.appStore.tests || []).filter(
    (t) => t.id !== testId,
  );
  if (typeof saveToCloud === "function")
    saveToCloud("tests", testId, null, true);
  if (typeof saveLocalStore === "function") saveLocalStore();

  renderTestsTable();
};

// لوحة التميز والشاشة الذكية
function getSundayToWednesdayDatesForWeek(weekOption = "current") {
  const now = new Date();
  const dayOfWeek = now.getDay();

  if (weekOption === "screen_cycle") {
    const offsetFromWednesday = (dayOfWeek + 4) % 7;
    const referenceWednesday = new Date(now);
    referenceWednesday.setDate(now.getDate() - offsetFromWednesday);
    const sunday = new Date(referenceWednesday);
    sunday.setDate(referenceWednesday.getDate() - 3);
    const days = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      days.push(`${y}-${m}-${day}`);
    }
    return days;
  }

  let offsetWeeks = 0;
  if (weekOption === "w_1") offsetWeeks = 1;
  else if (weekOption === "w_2") offsetWeeks = 2;
  else if (weekOption === "w_3") offsetWeeks = 3;
  else if (weekOption === "w_4") offsetWeeks = 4;

  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek - offsetWeeks * 7);

  const days = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

function isStudentTamayuzForWeek(studentId, weekOption = "current") {
  const weekDays = getSundayToWednesdayDatesForWeek(weekOption);
  if (!weekDays || weekDays.length !== 4) return false;

  const isCleanMumtazOrEmpty = (r) => {
    if (!r) return true;
    const clean = String(r).trim();
    if (clean === "" || clean === "—" || clean === "-" || clean === "لا يوجد")
      return true;
    return clean.includes("ممتاز");
  };

  for (const day of weekDays) {
    const att = (window.appStore?.attendance || []).find(
      (a) => a.studentId === studentId && a.date === day,
    );
    if (!att || (att.status !== "present" && att.status !== "late")) {
      return false;
    }

    const tasm = (window.appStore?.tasmeea || []).find(
      (t) => t.studentId === studentId && t.date === day,
    );
    if (!tasm) {
      return false;
    }
    if (
      !isCleanMumtazOrEmpty(tasm.hifzRating) ||
      !isCleanMumtazOrEmpty(tasm.murajaaRating) ||
      !isCleanMumtazOrEmpty(tasm.tilawaRating) ||
      !isCleanMumtazOrEmpty(tasm.rating)
    ) {
      return false;
    }
  }

  return true;
}

window.getQualifyingTamayuzStudents = function (weekOption = "current") {
  const activeStudents = (window.appStore?.students || []).filter(
    (s) => s.status === "active",
  );

  const qualifying = activeStudents.filter((s) =>
    isStudentTamayuzForWeek(s.id, weekOption),
  );

  const savedOrder = window.appStore?.screenOrder || [];
  if (savedOrder.length > 0) {
    qualifying.sort((a, b) => {
      const idxA = savedOrder.indexOf(a.id);
      const idxB = savedOrder.indexOf(b.id);
      if (idxA > -1 && idxB > -1) return idxA - idxB;
      if (idxA > -1) return -1;
      if (idxB > -1) return 1;
      return 0;
    });
  }

  return qualifying;
};

window.renderTamayuzBoard = function () {
  const tbody = document.getElementById("tamayuz-students-body");
  if (!tbody) return;

  const weekFilter =
    document.getElementById("tamayuz-week-filter")?.value || "current";
  const qualifyingStudents = getQualifyingTamayuzStudents(weekFilter);

  if (qualifyingStudents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted p-4">
          لا يوجد طلاب متميزون لهذا الأسبوع (يشترط حضور 4 أيام كاملة من الأحد إلى الأربعاء والحصول على ممتاز في جميع المقررات)
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  qualifyingStudents.forEach((stu, idx) => {
    const circle = (window.appStore?.circles || []).find(
      (c) => c.id === stu.circleId,
    );
    const circleName = circle ? circle.name : "جامع الهدى";
    const isTrophyWinner = (window.appStore?.trophyStudentIds || []).includes(
      stu.id,
    );

    html += `
      <tr>
        <td style="font-weight: 800;">${isTrophyWinner ? "🏆 " : "⭐ "}${stu.name}</td>
        <td><span style="font-weight: 600; color: var(--text-dark);">${circleName}</span></td>
        <td><span class="badge badge-active">100% (حضور 4 / 4 أيام)</span></td>
        <td><span class="badge badge-active">متقن (ممتاز)</span></td>
        <td><span class="badge" style="background:#805333; color:#fff;">${isTrophyWinner ? "الكأس 🏆" : `متميز #${idx + 1}`}</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
};

function exitScreenFullscreenIfActive() {
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  if (exit) exit.call(document);
}

window.toggleScreenFullscreen = function () {
  const target = document.getElementById("mosque-screen-grid");
  if (!target) return;

  if (!document.fullscreenElement) {
    const request =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.msRequestFullscreen;
    if (request) {
      request.call(target).catch((e) => {
        console.warn("تعذر تفعيل وضع ملء الشاشة:", e);
        alert("⚠️ تعذر تفعيل وضع ملء الشاشة على هذا الجهاز/المتصفح.");
      });
    }
  } else {
    exitScreenFullscreenIfActive();
  }
};

document.addEventListener("click", () => {
  if (
    document.fullscreenElement &&
    document.fullscreenElement.id === "mosque-screen-grid"
  ) {
    exitScreenFullscreenIfActive();
  }
});

document.addEventListener("fullscreenchange", () => {
  const btn = document.getElementById("btn-screen-fullscreen");
  if (!btn) return;
  btn.textContent = document.fullscreenElement
    ? "⤢ الخروج من ملء الشاشة"
    : "🖥️ ملء الشاشة";
});

window.renderScreenView = function () {
  const grid = document.getElementById("mosque-screen-grid");
  const tbody = document.getElementById("screen-manage-table-body");
  const qualifyingStudents = getQualifyingTamayuzStudents("screen_cycle");

  const circleLeaderIds = new Set();
  {
    const seenCircles = new Set();
    qualifyingStudents.forEach((stu) => {
      if (!seenCircles.has(stu.circleId)) {
        seenCircles.add(stu.circleId);
        circleLeaderIds.add(stu.id);
      }
    });
  }

  const trophyStudentIds = new Set(window.appStore?.trophyStudentIds || []);
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const shortenNameForScreen = (fullName) => {
    const tokens = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const connectors = new Set(["بن", "ابن", "آل", "ال"]);
    const result = [];
    let contentCount = 0;
    for (let i = 0; i < tokens.length && contentCount < 3; i++) {
      result.push(tokens[i]);
      if (!connectors.has(tokens[i])) contentCount++;
    }
    if (
      connectors.has(result[result.length - 1]) &&
      result.length < tokens.length
    ) {
      result.push(tokens[result.length]);
    }
    return result.join(" ");
  };

  const KNOWN_COMPANION_NAMES = [
    "أبو بكر",
    "عمر بن الخطاب",
    "عثمان بن عفان",
    "علي بن أبي طالب",
    "أنس بن مالك",
    "معاذ بن جبل",
    "خالد بن الوليد",
    "بلال بن رباح",
    "سعد بن أبي وقاص",
    "الزبير بن العوام",
    "طلحة بن عبيدالله",
    "عبدالرحمن بن عوف",
    "أبو عبيدة",
    "عبدالله بن عمر",
    "عبدالله بن مسعود",
    "أبي بن كعب",
    "معاوية بن أبي سفيان",
    "سعيد بن زيد",
  ];

  const normalizeArabicAlef = (str) => String(str || "").replace(/[أإآ]/g, "ا");
  const companionHonorific = (circleName) => {
    const name = normalizeArabicAlef(circleName);
    return KNOWN_COMPANION_NAMES.some((c) =>
      name.includes(normalizeArabicAlef(c)),
    )
      ? '<span class="honorific">رضي الله عنه</span>'
      : "";
  };

  const getHijriFullLabel = (dateObj) => {
    try {
      const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }).formatToParts(dateObj);
      const day = parts.find((p) => p.type === "day")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      const year = parts.find((p) => p.type === "year")?.value || "";
      const dayName = new Intl.DateTimeFormat("ar", {
        weekday: "long",
      }).format(dateObj);
      return day && month && year
        ? `يوم ${dayName} ${day} / ${month} / ${year}هـ`
        : "";
    } catch (e) {
      return "";
    }
  };

  const SCREEN_TAMAYUZ_EPOCH_SUNDAY = new Date(2026, 7, 30);
  const buildTamayuzWeekPeriodLabel = () => {
    const days = getSundayToWednesdayDatesForWeek("screen_cycle");
    if (!days || days.length < 4) return "";
    const [sy, sm, sd] = days[0].split("-").map(Number);
    const [, wm, wd] = days[3].split("-").map(Number);
    const sundayDate = new Date(sy, sm - 1, sd);
    const diffDays = Math.round(
      (sundayDate - SCREEN_TAMAYUZ_EPOCH_SUNDAY) / (24 * 60 * 60 * 1000),
    );
    const weekNum = Math.max(1, Math.floor(diffDays / 7) + 1);
    return `الأسبوع ${weekNum} من الأحد ${sd} / ${sm} إلى الأربعاء ${wd} / ${wm}`;
  };

  const displayCurrentSlide = () => {
    if (!grid) return;

    if (window.screenCurrentSlide === "tamayuz") {
      if (qualifyingStudents.length === 0) {
        grid.innerHTML = `
          <div class="empty-state-card" style="grid-column:1/-1; padding:3rem 1.5rem; text-align:center; background:#fff; border-radius:12px; border:2px dashed #d7ccc8;">
            <h2 style="color:var(--primary-brown); font-size:1.8rem; font-weight:900; margin-bottom:0.6rem;">🌟 المتميزون في الحلقات 🌟</h2>
            <p class="text-muted" style="font-size:1.1rem;">لا يوجد طلاب حققوا شروط التميز لهذا الأسبوع حتى الآن</p>
          </div>
        `;
      } else {
        const circleGroupsById = {};
        qualifyingStudents.forEach((stu) => {
          if (!circleGroupsById[stu.circleId]) {
            const circle = (window.appStore?.circles || []).find(
              (c) => c.id === stu.circleId,
            );
            circleGroupsById[stu.circleId] = {
              circleId: stu.circleId,
              circleName: circle ? circle.name : "جامع الهدى",
              students: [],
            };
          }
          circleGroupsById[stu.circleId].students.push(stu);
        });

        const circleGroups = (window.appStore?.circles || [])
          .map((c) => circleGroupsById[c.id])
          .filter(Boolean);

        Object.keys(circleGroupsById).forEach((cid) => {
          if (!circleGroups.some((g) => g.circleId === cid)) {
            circleGroups.push(circleGroupsById[cid]);
          }
        });

        const colsHtml = circleGroups
          .map((group, gIdx) => {
            const isTeal = gIdx % 2 === 0;
            const barClass = isTeal ? "teal" : "brown";
            const pillClass = isTeal ? "gray" : "tan";
            const topStudent = group.students[0];
            const restHtml = group.students
              .slice(1)
              .map(
                (stu) => `
                  <div class="screen-pill ${pillClass}">${escapeHtml(shortenNameForScreen(stu.name))}</div>
                `,
              )
              .join("");

            const isTrophyWinner = trophyStudentIds.has(topStudent.id);
            return `
              <div class="screen-circle-col">
                <div class="screen-circle-title">${escapeHtml(group.circleName)} ${companionHonorific(group.circleName)}</div>
                <div class="screen-rank-bar ${barClass}${isTrophyWinner ? " trophy" : ""}">${isTrophyWinner ? "🏆 " : ""}${escapeHtml(shortenNameForScreen(topStudent.name))}</div>
                ${restHtml}
              </div>
            `;
          })
          .join("");

        grid.innerHTML = `
          <div class="screen-board">
            <div class="screen-board-rail"></div>
            <div class="screen-board-body">
              <div class="screen-board-header">
                <img src="report_logo_right.png" alt="شعار المَجْمَع" />
                <div class="screen-board-title">
                  <h2>المتميزون في الحلقات</h2>
                  <p>الحضور كامل الاسبوع وحصول الطالب على تقدير ممتاز على المنهج لكل الاسبوع</p>
                  <p class="screen-board-period">${buildTamayuzWeekPeriodLabel()}</p>
                </div>
                <img src="report_logo_left.png" alt="شعار المَجْمَع" />
              </div>
              <div class="screen-circle-cols tamayuz-cols" style="--tmz-cols: ${circleGroups.length <= 3 ? Math.max(1, circleGroups.length) : Math.ceil(circleGroups.length / 2)};">${colsHtml}</div>
              <div class="screen-board-footer">
                <span style="color: var(--primary-teal);">الشاشة الالكترونية للمَجْمَع</span>
                <span>إدارة المَجْمَع القرآني</span>
              </div>
            </div>
          </div>
        `;
      }
    } else if (window.screenCurrentSlide === "topcompleted") {
      const todayTasmeeaTop = (window.appStore?.tasmeea || []).filter(
        (t) => t.date === todayStr,
      );

      const buildTopCompletedPills = (
        fieldName,
        ratingFieldName,
        orderFieldName,
        pillClass,
      ) => {
        const rows = todayTasmeeaTop
          .filter((t) => t[fieldName] && String(t[fieldName]).trim() !== "")
          .filter((t) => String(t[ratingFieldName] || "").trim() !== "يعيد")
          .sort(
            (a, b) =>
              (a[orderFieldName] || a.updatedAt || 0) -
              (b[orderFieldName] || b.updatedAt || 0),
          )
          .slice(0, 15);

        if (rows.length === 0) {
          return `<div class="screen-pill ${pillClass}" style="opacity:0.6;">لا يوجد بعد</div>`;
        }

        return rows
          .map((t, idx) => {
            const student = (window.appStore?.students || []).find(
              (s) => s.id === t.studentId,
            );
            return `<div class="screen-pill ${pillClass}"><span class="rank-num">${idx + 1}</span>${escapeHtml(shortenNameForScreen(student ? student.name : "—"))}</div>`;
          })
          .join("");
      };

      grid.innerHTML = `
        <div class="screen-board">
          <div class="screen-board-rail"></div>
          <div class="screen-board-body">
            <div class="screen-board-header">
              <img src="report_logo_right.png" alt="شعار المَجْمَع" />
              <div class="screen-board-title">
                <h2>المنجزون أولاً</h2>
                <p>المنجزون في حلقات الدرس والمراجعة والتلاوة أولاً</p>
                <p class="screen-board-period">${getHijriFullLabel(now)}</p>
              </div>
              <img src="report_logo_left.png" alt="شعار المَجْمَع" />
            </div>
            <div class="screen-circle-cols" style="grid-template-columns: repeat(3, 1fr);">
              <div class="screen-circle-col">
                <div class="screen-circle-title">حلقة الدرس الجديد</div>
                ${buildTopCompletedPills("hifzSurah", "hifzRating", "hifzOrderAt", "gray")}
              </div>
              <div class="screen-circle-col">
                <div class="screen-circle-title">حلقة المراجعة</div>
                ${buildTopCompletedPills("murajaaSurah", "murajaaRating", "murajaaOrderAt", "tan")}
              </div>
              <div class="screen-circle-col">
                <div class="screen-circle-title">حلقة التلاوة</div>
                ${buildTopCompletedPills("tilawaSurah", "tilawaRating", "tilawaOrderAt", "gray")}
              </div>
            </div>
            <div class="screen-board-footer">
              <span style="color: var(--primary-teal);">الشاشة الالكترونية للمَجْمَع</span>
              <span>إدارة المَجْمَع القرآني</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const isWorkday =
        typeof isOfficialWorkday === "function"
          ? isOfficialWorkday(todayStr)
          : new Date(todayStr).getDay() >= 0 &&
            new Date(todayStr).getDay() <= 3;

      const activeStudents = (window.appStore?.students || []).filter(
        (s) => s.status === "active",
      );
      const teachersCount = (window.appStore?.teachers || []).filter(
        (t) => t.status === "active",
      ).length;
      const circlesCount = (window.appStore?.circles || []).length;
      const todayAtt = (window.appStore?.attendance || []).filter(
        (a) => a.date === todayStr,
      );
      const presentCount = todayAtt.filter(
        (a) => a.status === "present" || a.status === "late",
      ).length;

      let absentCount = todayAtt.filter((a) => a.status === "absent").length;
      if (isWorkday) {
        absentCount = Math.max(0, activeStudents.length - presentCount);
      }

      const todayTasmeea = (window.appStore?.tasmeea || []).filter(
        (t) => t.date === todayStr,
      );
      const recitedCount = new Set(
        todayTasmeea
          .filter((t) => t.hifzSurah || t.murajaaSurah || t.tilawaSurah)
          .map((t) => t.studentId),
      ).size;

      const statTile = (tone, icon, label, value) => `
        <div class="screen-stat-tile ${tone}">
          <div class="screen-stat-icon">${icon}</div>
          <div class="screen-stat-value">${value}</div>
          <div class="screen-stat-label">${label}</div>
        </div>
      `;

      grid.innerHTML = `
        <div class="screen-board">
          <div class="screen-board-rail"></div>
          <div class="screen-board-body">
            <div class="screen-board-header">
              <img src="report_logo_right.png" alt="شعار المَجْمَع" />
              <div class="screen-board-title">
                <h2>إحصائيات اليوم</h2>
                <p>متابعة الحضور والتسميع في حلقات المَجْمَع لهذا اليوم</p>
                <p class="screen-board-period">${getHijriFullLabel(now)}</p>
              </div>
              <img src="report_logo_left.png" alt="شعار المَجْمَع" />
            </div>
            <div class="screen-stats-grid">
              ${statTile("teal", "👨‍🎓", "إجمالي الطلاب المسجلين", activeStudents.length)}
              ${statTile("green", "🟢", "الحاضرون اليوم", presentCount)}
              ${statTile("red", "🔴", "الغائبون اليوم", absentCount)}
              ${statTile("brown", "📖", "سمّعوا اليوم", recitedCount)}
              ${statTile("teal", "🕌", "عدد الحلقات", circlesCount)}
              ${statTile("brown", "👨‍🏫", "عدد المعلمين", teachersCount)}
            </div>
            <div class="screen-board-footer">
              <span style="color: var(--primary-teal);">الشاشة الالكترونية للمَجْمَع</span>
              <span>إدارة المَجْمَع القرآني</span>
            </div>
          </div>
        </div>
      `;
    }
  };

  const availableScreenSlides = ["stats", "topcompleted"];
  if (qualifyingStudents.length > 0) availableScreenSlides.unshift("tamayuz");

  if (!availableScreenSlides.includes(window.screenCurrentSlide)) {
    window.screenCurrentSlide = availableScreenSlides[0];
  }

  displayCurrentSlide();

  if (window.screenFlipTimer) clearInterval(window.screenFlipTimer);
  if (availableScreenSlides.length > 1) {
    window.screenFlipTimer = setInterval(() => {
      const curIdx = availableScreenSlides.indexOf(window.screenCurrentSlide);
      const nextIdx = (curIdx + 1) % availableScreenSlides.length;
      window.screenCurrentSlide = availableScreenSlides[nextIdx];
      displayCurrentSlide();
    }, 15000);
  }

  if (window.screenDataRefreshTimer)
    clearInterval(window.screenDataRefreshTimer);
  window.screenDataRefreshTimer = setInterval(async () => {
    if (typeof syncAndPurgeDataFromCloud === "function") {
      await syncAndPurgeDataFromCloud();
    }
    renderScreenView();
  }, 300000);

  if (!window.screenCurrentDateStr) {
    window.screenCurrentDateStr = new Date().toISOString().split("T")[0];
  }
  if (window.screenDayChangeTimer) clearInterval(window.screenDayChangeTimer);
  window.screenDayChangeTimer = setInterval(() => {
    const nowStr = new Date().toISOString().split("T")[0];
    if (nowStr !== window.screenCurrentDateStr) {
      window.screenCurrentDateStr = nowStr;
      renderScreenView();
    }
  }, 30000);

  if (tbody) {
    if (qualifyingStudents.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center text-muted p-3">لا يوجد طلاب متميزون حالياً للترتيب</td></tr>';
    } else {
      let tbodyHtml = "";
      qualifyingStudents.forEach((stu, idx) => {
        const circle = (window.appStore?.circles || []).find(
          (c) => c.id === stu.circleId,
        );
        const circleName = circle ? circle.name : "جامع الهدى";
        const isTrophyWinner = trophyStudentIds.has(stu.id);
        const isTrophyEligible = circleLeaderIds.has(stu.id);

        tbodyHtml += `
          <tr>
            <td style="text-align: center; font-weight: 800;">${idx + 1} ${isTrophyWinner ? "🏆" : ""}</td>
            <td style="text-align: center;">
              ${
                isTrophyEligible
                  ? `<input type="checkbox" title="منح الكأس لهذا الطالب" ${isTrophyWinner ? "checked" : ""} onchange="setTrophyStudent('${stu.id}')" style="width: 18px; height: 18px; cursor: pointer;">`
                  : `<span class="text-muted" style="font-size:0.8rem;" title="الكأس متاح فقط لأول طالب في كل حلقة">—</span>`
              }
            </td>
            <td style="font-weight: 700;">${stu.name}</td>
            <td>${circleName}</td>
            <td><span class="badge badge-active">متميز (حضور 100% وممتاز)</span></td>
            <td style="text-align: center;">
              <button class="btn btn-outline-brown btn-sm" onclick="moveScreenStudentUp(${idx})" ${idx === 0 ? "disabled" : ""}>⬆️ للأعلى</button>
              <button class="btn btn-outline-brown btn-sm" onclick="moveScreenStudentDown(${idx})" ${idx === qualifyingStudents.length - 1 ? "disabled" : ""}>⬇️ للأسفل</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = tbodyHtml;
    }
  }
};

window.moveScreenStudentUp = function (index) {
  const students = getQualifyingTamayuzStudents("screen_cycle");
  if (index <= 0 || index >= students.length) return;

  const currentIds = students.map((s) => s.id);
  const temp = currentIds[index];
  currentIds[index] = currentIds[index - 1];
  currentIds[index - 1] = temp;

  window.appStore.screenOrder = currentIds;
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", { order: currentIds });
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderScreenView();
};

window.moveScreenStudentDown = function (index) {
  const students = getQualifyingTamayuzStudents("screen_cycle");
  if (index < 0 || index >= students.length - 1) return;

  const currentIds = students.map((s) => s.id);
  const temp = currentIds[index];
  currentIds[index] = currentIds[index + 1];
  currentIds[index + 1] = temp;

  window.appStore.screenOrder = currentIds;
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", { order: currentIds });
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderScreenView();
};

window.resetScreenStudentOrder = function () {
  window.appStore.screenOrder = [];
  if (typeof saveToCloud === "function")
    saveToCloud("screenOrder", "current_order", {
      order: [],
      trophyStudentIds: [...(window.appStore.trophyStudentIds || [])],
    });
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderScreenView();
  alert("✅ تمت إعادة الترتيب التلقائي بنجاح!");
};

window.setTrophyStudent = function (studentId) {
  const current = new Set(window.appStore.trophyStudentIds || []);
  if (current.has(studentId)) {
    current.delete(studentId);
  } else {
    current.add(studentId);
  }
  const newTrophyIds = Array.from(current);
  window.appStore.trophyStudentIds = newTrophyIds;

  if (typeof saveToCloud === "function") {
    saveToCloud("screenOrder", "current_order", {
      order: [...(window.appStore.screenOrder || [])],
      trophyStudentIds: newTrophyIds,
    });
  }
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderScreenView();
};

window.getCurrentLocationCoords = function () {
  if (!navigator.geolocation) {
    alert("⚠️ جهازك لا يدعم خاصية تحديد الموقع الجغرافي GPS.");
    return;
  }

  const input = document.getElementById("set-org-location");
  alert("📡 جاري تحديد موقعك الحالي...");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      if (input) input.value = `${lat}, ${lng}`;
      alert(`✅ تم تحديد موقعك الحالي: ${lat}, ${lng}`);
    },
    () => {
      alert(
        "❌ تعذر التقاط موقعك الجغرافي. يرجى تفعيل الـ GPS وإعطاء الإذن للمتصفح.",
      );
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
};

// الخريطة التفاعلية
window.openMapPickerModal = function () {
  const currentLoc = (
    document.getElementById("set-org-location")?.value || ""
  ).trim();
  const currentRadius =
    parseInt(document.getElementById("set-org-radius")?.value || "50", 10) ||
    50;

  const radiusInput = document.getElementById("map-modal-radius-input");
  if (radiusInput) radiusInput.value = currentRadius;

  let defaultLat = 18.2165;
  let defaultLng = 42.5053;

  if (currentLoc && currentLoc.includes(",")) {
    const parts = currentLoc.split(",");
    const pLat = parseFloat(parts[0]);
    const pLng = parseFloat(parts[1]);
    if (!isNaN(pLat) && !isNaN(pLng)) {
      defaultLat = pLat;
      defaultLng = pLng;
    }
  }

  const coordsDisplay = document.getElementById("map-modal-coords-display");
  if (coordsDisplay)
    coordsDisplay.value = `${defaultLat.toFixed(6)}, ${defaultLng.toFixed(6)}`;

  openModal("modal-map-picker");

  setTimeout(() => {
    initOrUpdateMapPicker(defaultLat, defaultLng, currentRadius);
  }, 250);
};

function initOrUpdateMapPicker(lat, lng, radius) {
  const mapContainer = document.getElementById("map-picker-container");
  if (!mapContainer || typeof L === "undefined") return;

  const modernPinHtml = `
    <div class="modern-leaflet-pin-wrapper">
      <div class="pin-pulse"></div>
      <div class="pin-head">
        <span class="pin-symbol">🕌</span>
      </div>
      <div class="pin-tip"></div>
    </div>
  `;

  const customModernIcon = L.divIcon({
    className: "custom-modern-map-icon",
    html: modernPinHtml,
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -45],
  });

  if (!window.mapPickerInstance) {
    window.mapPickerInstance = L.map("map-picker-container", {
      zoomControl: false,
    }).setView([lat, lng], 17);

    L.control.zoom({ position: "bottomright" }).addTo(window.mapPickerInstance);

    const modernVoyager = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        subdomains: "abcd",
        attribution: "© CartoDB © OpenStreetMap",
      },
    );

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "© Esri World Imagery",
      },
    );

    modernVoyager.addTo(window.mapPickerInstance);

    const baseMaps = {
      "🗺️ خريطة عصرية (Voyager)": modernVoyager,
      "🛰️ قمر صناعي (Satellite)": satelliteLayer,
    };
    L.control
      .layers(baseMaps, null, { position: "topright" })
      .addTo(window.mapPickerInstance);

    window.mapPickerMarker = L.marker([lat, lng], {
      draggable: true,
      icon: customModernIcon,
    }).addTo(window.mapPickerInstance);

    window.mapPickerMarker.bindPopup(`
      <div style="font-family: 'Tajawal', sans-serif; text-align: center; padding: 4px;">
        <strong style="color: #0b6b7d; font-size: 14px;">📍 موقع جامع الهدى / المَجْمَع</strong><br>
        <span style="font-size: 12px; color: #555;">اسحب المؤشر لضبط المركز بدقة</span>
      </div>
    `);

    window.mapPickerCircle = L.circle([lat, lng], {
      color: "#0b6b7d",
      fillColor: "#0b6b7d",
      fillOpacity: 0.18,
      weight: 2,
      dashArray: "6, 6",
      radius: radius,
    }).addTo(window.mapPickerInstance);

    window.mapPickerMarker.on("drag", function (e) {
      const pos = e.target.getLatLng();
      if (window.mapPickerCircle) window.mapPickerCircle.setLatLng(pos);
    });

    window.mapPickerMarker.on("dragend", function (e) {
      const pos = e.target.getLatLng();
      updateMapPickerElements(pos.lat, pos.lng);
    });

    window.mapPickerInstance.on("click", function (e) {
      updateMapPickerElements(e.latlng.lat, e.latlng.lng);
    });
  } else {
    window.mapPickerInstance.invalidateSize();
    window.mapPickerInstance.setView([lat, lng], 17);
    updateMapPickerElements(lat, lng);
  }
}

function updateMapPickerElements(lat, lng) {
  if (window.mapPickerMarker) window.mapPickerMarker.setLatLng([lat, lng]);
  if (window.mapPickerCircle) window.mapPickerCircle.setLatLng([lat, lng]);

  const coordsDisplay = document.getElementById("map-modal-coords-display");
  if (coordsDisplay)
    coordsDisplay.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

window.updateMapPickerRadius = function (newRadius) {
  const radVal = parseInt(newRadius, 10) || 50;
  if (window.mapPickerCircle) {
    window.mapPickerCircle.setRadius(radVal);
  }
};

window.searchMapLocationQuery = function () {
  const searchInput = document.getElementById("map-search-query-input");
  const query = searchInput?.value.trim();
  if (!query) {
    alert("يرجى كتابة اسم الحي، الشارع، أو المعلم للبحث.");
    return;
  }

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=ar`,
  )
    .then((res) => res.json())
    .then((data) => {
      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);
        if (window.mapPickerInstance) {
          window.mapPickerInstance.setView([newLat, newLng], 17);
          updateMapPickerElements(newLat, newLng);
        }
      } else {
        alert("لم يتم العثور على نتائج مطابقة، يرجى تجربة اسم آخر.");
      }
    })
    .catch((err) => {
      console.warn("خطأ في البحث عن الموقع:", err);
      alert("تعذر الاتصال بخدمة البحث عن الأماكن.");
    });
};

window.confirmMapPickerLocation = function () {
  const coords = (
    document.getElementById("map-modal-coords-display")?.value || ""
  ).trim();
  const radius =
    document.getElementById("map-modal-radius-input")?.value || "50";

  const setLocInput = document.getElementById("set-org-location");
  const setRadInput = document.getElementById("set-org-radius");

  if (setLocInput && coords) setLocInput.value = coords;
  if (setRadInput && radius) setRadInput.value = radius;

  closeModal("modal-map-picker");
  alert(
    `✅ تم تحديد موقع ونطاق المسجد بنجاح:\nالإحداثيات: ${coords}\nنصف قطر التحضير: ${radius} متراً`,
  );
};

const APP_THEME_LABELS = {
  classic: "الهوية الحالية",
  islamic: "إسلامي راقٍ",
  modern: "عصري نظيف",
  heritage: "دافئ تراثي",
};

window.renderThemePicker = function () {
  const selected = window.previewAppThemeValue || window.savedAppTheme || "classic";
  document
    .querySelectorAll('input[name="app-theme-choice"]')
    .forEach((r) => (r.checked = r.value === selected));

  const status = document.getElementById("app-theme-status");
  if (status) {
    const savedLabel = APP_THEME_LABELS[window.savedAppTheme] || APP_THEME_LABELS.classic;
    status.textContent = window.previewAppThemeValue
      ? `معاينة على جهازك فقط — المطبَّقة للجميع الآن: ${savedLabel}`
      : `المطبَّقة للجميع الآن: ${savedLabel}`;
  }
};

// معاينة محلية فقط (لا تُحفظ ولا تصل لغير هذا الجهاز) حتى يضغط المدير "حفظ"
window.previewAppTheme = function (theme) {
  window.previewAppThemeValue =
    theme === (window.savedAppTheme || "classic") ? null : theme;
  applyAppTheme(theme, false);
  renderThemePicker();
};

window.saveAppTheme = async function () {
  const user = window.currentUser;
  if (!user || user.role !== "admin") {
    alert("⚠️ تغيير هوية المنصة متاح لمدير المَجْمَع فقط.");
    return;
  }
  const chosen =
    document.querySelector('input[name="app-theme-choice"]:checked')?.value ||
    "classic";

  const ok = await saveToCloud("meta", "appTheme", {
    theme: chosen,
    updatedBy: user.name || "المدير",
  });
  if (ok === false) return;

  window.previewAppThemeValue = null;
  applyAppTheme(chosen);
  renderThemePicker();
  alert(`✅ تم حفظ الهوية (${APP_THEME_LABELS[chosen]}) وتطبيقها على جميع المستخدمين.`);
};

window.handleSaveOrgSettings = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const orgName = (document.getElementById("set-org-name")?.value || "").trim();
  const mosqueName = (
    document.getElementById("set-org-mosque")?.value || ""
  ).trim();
  const directorName = (
    document.getElementById("set-org-director")?.value || ""
  ).trim();
  const location = (
    document.getElementById("set-org-location")?.value || ""
  ).trim();
  const radius =
    parseInt(document.getElementById("set-org-radius")?.value || "50", 10) ||
    50;
  const fontSize =
    document.getElementById("set-header-font-size")?.value || "13px";
  const logoNew =
    (document.getElementById("set-org-logo-new")?.value || "").trim() ||
    "logo12.jpeg";
  const logoOld =
    (document.getElementById("set-org-logo-old")?.value || "").trim() ||
    "logo_transparent_1.png";

  const newSettings = {
    orgName: orgName || "مَجْمَع عبدالله بن مهدي القرآني",
    subTitle: mosqueName || "جامع الهدى",
    directorName: directorName || "صالح ال ناشع",
    location: location,
    radius: radius,
    headerFontSize: fontSize,
    logoNew: logoNew,
    logoOld: logoOld,
    logoLogin: "logo_transparent_2.png",
  };

  window.appStore.settings = newSettings;
  if (typeof saveToCloud === "function") {
    saveToCloud("settings", "main_settings", newSettings);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert("✅ تم حفظ وتحديث إعدادات وهوية المَجْمَع ونطاق التحضير بنجاح!");
  if (typeof applyAppIdentity === "function") applyAppIdentity();
};

window.renderPendingRequestsTable = function () {
  const tbody = document.getElementById("pending-requests-table-body");
  if (!tbody) return;

  const pendingList = (window.appStore?.students || []).filter(
    (s) => s.status === "pending",
  );
  if (pendingList.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center text-muted p-4">لا توجد طلبات تسجيل جديدة حالياً</td></tr>';
    updatePendingBadgeCount();
    return;
  }

  let html = "";
  pendingList.forEach((stu) => {
    html += `
      <tr>
        <td style="font-weight: 700;">${escapeHtml(stu.name)}</td>
        <td>${escapeHtml(stu.nationalId) || "—"}</td>
        <td>${escapeHtml(stu.hifzAmount) || "—"}</td>
        <td>${escapeHtml(stu.parentName) || "—"}</td>
        <td>${escapeHtml(stu.parentRelation) || "—"}</td>
        <td style="color: var(--primary-brown); font-weight: 700;">${escapeHtml(stu.parentPhone) || "—"}</td>
        <td>${escapeHtml(stu.residence) || "—"}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-success btn-sm" onclick="approveStudentRequest('${stu.id}')">قبول</button>
            <button class="btn btn-danger btn-sm" onclick="rejectStudentRequest('${stu.id}')">رفض</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  updatePendingBadgeCount();
};

window.updatePendingBadgeCount = function () {
  const count = (window.appStore?.students || []).filter(
    (s) => s.status === "pending",
  ).length;
  const badge = document.getElementById("pending-count-badge");
  if (badge) badge.textContent = count;
};

window.approveStudentRequest = function (studentId) {
  const stu = (window.appStore?.students || []).find((s) => s.id === studentId);
  if (!stu) return;

  stu.status = "active";
  if (!window.appStore.users) window.appStore.users = [];
  window.appStore.users.push({
    id: stu.id,
    name: stu.name,
    phone: stu.phone || stu.parentPhone,
    role: "student",
    username: stu.nationalId || stu.phone || stu.id,
    pass: "1111",
    status: "active",
    createdAt: Date.now(),
  });

  if (typeof saveToCloud === "function") {
    saveToCloud("students", stu.id, stu);
    saveToCloud("users", stu.id, {
      id: stu.id,
      name: stu.name,
      phone: stu.phone || stu.parentPhone,
      role: "student",
      username: stu.nationalId || stu.phone || stu.id,
      pass: "1111",
      status: "active",
    });
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  alert(
    `✅ تم قبول انضمام الطالب (${stu.name}) بنجاح! والرقم السري الخاص به هو (1111).`,
  );
  renderPendingRequestsTable();
};

window.rejectStudentRequest = function (studentId) {
  if (!confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;

  window.appStore.students = (window.appStore.students || []).filter(
    (s) => s.id !== studentId,
  );
  if (typeof saveToCloud === "function")
    saveToCloud("students", studentId, null, true);
  if (typeof saveLocalStore === "function") saveLocalStore();

  renderPendingRequestsTable();
};

window.handleSelfRegistration = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const name = (document.getElementById("reg-stu-name")?.value || "").trim();
  const nationalId = (
    document.getElementById("reg-stu-id")?.value || ""
  ).trim();
  const age = document.getElementById("reg-stu-age")?.value || "";
  const hifzAmount = (
    document.getElementById("reg-hifz-amount")?.value || ""
  ).trim();
  const parentName = (
    document.getElementById("reg-parent-name")?.value || ""
  ).trim();
  const parentPhone = (
    document.getElementById("reg-parent-phone")?.value || ""
  ).trim();
  const residence = (
    document.getElementById("reg-residence")?.value || ""
  ).trim();

  let parentRelation = "أب";
  const relRadio = document.querySelector(
    'input[name="reg_parent_relation"]:checked',
  );
  if (relRadio) {
    parentRelation =
      relRadio.value === "أخرى"
        ? (
            document.getElementById("reg-relation-other-text")?.value || "أخرى"
          ).trim()
        : relRadio.value;
  }

  const newReq = {
    id: "s_req_" + Date.now(),
    name,
    nationalId,
    age,
    hifzAmount,
    parentName,
    parentPhone,
    parentRelation,
    residence,
    status: "pending",
    circleId: "",
    createdAt: Date.now(),
  };

  if (!window.appStore.students) window.appStore.students = [];
  window.appStore.students.push(newReq);

  if (typeof saveToCloud === "function")
    saveToCloud("students", newReq.id, newReq);
  if (typeof saveLocalStore === "function") saveLocalStore();

  closeModal("modal-self-register");
  e.target?.reset();
  alert("✅ تم إرسال طلب الالتحاق بنجاح! سيتم مراجعته من قبل إدارة المَجْمَع.");

  if (typeof window.sendAdminPushNotification === "function") {
    window.sendAdminPushNotification(
      "📥 طلب التحاق جديد",
      `تقدّم الطالب (${name}) بطلب التحاق جديد بالمَجْمَع.`,
    );
  }
};

window.renderNotificationsView = function () {
  const notifContainer = document.getElementById(
    "unified-notifications-container",
  );
  if (notifContainer) {
    const user = window.currentUser;
    const isTeacherViewer = user && user.role === "teacher";

    let allNotifs = window.appStore?.notifications || [];

    if (isTeacherViewer) {
      const teacherObj = (window.appStore?.teachers || []).find(
        (t) =>
          t.userId === user.id ||
          t.id === user.teacherId ||
          t.id === user.id ||
          t.phone === user.phone,
      );
      const teacherId = teacherObj ? teacherObj.id : user.teacherId || user.id;
      const teacherName = teacherObj ? teacherObj.name : user.name;
      const teacherPhone = teacherObj ? teacherObj.phone : user.phone;

      allNotifs = allNotifs.filter((n) => {
        const isFromAdmin =
          n.senderRole === "admin" || n.sender === "إدارة المَجْمَع";
        if (!isFromAdmin) return false;

        const rec = String(n.recipient || "").trim();
        if (rec === "all" || rec === "teachers") return true;
        if (rec === "specific_teacher") {
          const tId = String(n.targetId || "").trim();
          if (!tId) return false;
          if (tId === String(teacherId) || tId === String(teacherPhone))
            return true;
          if (n.targetName && teacherName && n.targetName === teacherName)
            return true;
        }
        return false;
      });
    }

    if (allNotifs.length === 0) {
      notifContainer.innerHTML = `<div class="empty-state-card p-3"><p class="text-muted">لا توجد إشعارات جديدة حالياً</p></div>`;
    } else {
      notifContainer.innerHTML = allNotifs
        .map(
          (n) => `
          <div class="notification-item-card mb-2 p-3" style="background: #fafcfb; border: 1px solid var(--border-color); border-radius: 8px;">
            <h4 style="font-weight: 800; color: var(--primary-brown); margin-bottom: 4px;">${n.title}</h4>
            <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 6px;">${n.body}</p>
            <div class="flex-between" style="font-size: 0.75rem; color: #888;">
              <span>من: ${n.sender || "الإدارة"}</span>
              <span>${n.date || ""}</span>
            </div>
          </div>
        `,
        )
        .join("");
    }
  }

  if (typeof renderTeacherNotesTable === "function") {
    renderTeacherNotesTable();
  }
};

window.openModalSendUnifiedMessage = function () {
  const recipientSelect = document.getElementById("msg-target-recipient");
  if (recipientSelect) {
    recipientSelect.value = "all";
    handleRecipientTypeChange(recipientSelect);
  }

  const isTeacherSender =
    window.currentUser && window.currentUser.role === "teacher";
  const teacherNote = document.getElementById("msg-teacher-target-note");
  if (teacherNote)
    teacherNote.style.display = isTeacherSender ? "block" : "none";

  const titleEl = document.getElementById("msg-title");
  const bodyEl = document.getElementById("msg-body");
  if (titleEl) titleEl.value = "";
  if (bodyEl) bodyEl.value = "";

  openModal("modal-send-unified-msg");
};

window.handleRecipientTypeChange = function (selectEl) {
  const type = selectEl.value;
  const specificGroup = document.getElementById("msg-specific-recipient-group");
  const specificLabel = document.getElementById("msg-specific-label");
  const specificSelect = document.getElementById("msg-specific-select");

  if (!specificGroup || !specificSelect) return;

  if (type === "specific_teacher") {
    specificGroup.classList.remove("style-hidden");
    specificGroup.style.display = "block";
    if (specificLabel) specificLabel.textContent = "اختر المعلم المستهدف:";

    let opts = '<option value="">— اختر المعلم —</option>';
    (window.appStore?.teachers || []).forEach((t) => {
      opts += `<option value="${t.id}" data-name="${t.name}">${t.name}</option>`;
    });
    specificSelect.innerHTML = opts;
  } else if (type === "specific_student") {
    specificGroup.classList.remove("style-hidden");
    specificGroup.style.display = "block";
    if (specificLabel) specificLabel.textContent = "اختر الطالب المستهدف:";

    let opts = '<option value="">— اختر الطالب —</option>';
    (window.appStore?.students || [])
      .filter((s) => s.status === "active")
      .forEach((s) => {
        opts += `<option value="${s.id}" data-name="${s.name}">${s.name} (${getCircleName(s.circleId)})</option>`;
      });
    specificSelect.innerHTML = opts;
  } else {
    specificGroup.classList.add("style-hidden");
    specificGroup.style.display = "none";
    specificSelect.innerHTML = "";
  }
};

window.handleSendUnifiedMessage = function (e) {
  if (e && e.preventDefault) e.preventDefault();

  const currentUser = window.currentUser || {
    name: "إدارة المَجْمَع",
    role: "admin",
  };
  const isTeacherSender = currentUser.role === "teacher";

  let recipient =
    document.getElementById("msg-target-recipient")?.value || "all";
  const specificSelect = document.getElementById("msg-specific-select");
  let targetId = specificSelect?.value || "";
  const selectedOption = specificSelect?.options[specificSelect.selectedIndex];
  let targetName = selectedOption
    ? selectedOption.getAttribute("data-name") || ""
    : "";

  if (isTeacherSender) {
    recipient = "admin";
    targetId = "";
    targetName = "";
  }

  const title = (document.getElementById("msg-title")?.value || "").trim();
  const body = (document.getElementById("msg-body")?.value || "").trim();

  if (!title || !body) {
    alert("يرجى كتابة عنوان الرسالة ونص التنبيه.");
    return;
  }

  if (
    (recipient === "specific_student" || recipient === "specific_teacher") &&
    !targetId
  ) {
    alert("يرجى تحديد الشخص المستهدف بالإشعار.");
    return;
  }

  const senderName =
    currentUser.role === "admin"
      ? "إدارة المَجْمَع"
      : `المعلم / ${currentUser.name}`;

  const newNotif = {
    id: "notif_" + Date.now(),
    title: title,
    body: body,
    recipient: recipient,
    targetId: targetId,
    targetName: targetName,
    sender: senderName,
    senderRole: currentUser.role,
    date: new Date().toLocaleDateString("ar-SA"),
    createdAt: Date.now(),
  };

  if (!window.appStore.notifications) window.appStore.notifications = [];
  window.appStore.notifications.unshift(newNotif);

  if (typeof saveToCloud === "function") {
    saveToCloud("notifications", newNotif.id, newNotif);
  }
  if (typeof saveLocalStore === "function") saveLocalStore();

  closeModal("modal-send-unified-msg");
  e.target?.reset();
  alert(
    isTeacherSender
      ? "✅ تم إرسال ملاحظتك إلى إدارة المَجْمَع بنجاح!"
      : "✅ تم إرسال الإشعار بنجاح لجميع المستهدفين!",
  );
  if (typeof renderNotificationsView === "function") renderNotificationsView();

  if (
    isTeacherSender &&
    typeof window.sendAdminPushNotification === "function"
  ) {
    window.sendAdminPushNotification(
      `💬 رسالة من المعلم ${currentUser.name}`,
      `${title}: ${body}`,
    );
  }

  if (
    currentUser.role === "teacher" &&
    typeof window.logTeacherActivity === "function"
  ) {
    window.logTeacherActivity(
      "إرسال إشعار",
      `إشعار: ${title}`,
      currentUser.name,
      "—",
    );
  }
};

function getCircleName(circleId) {
  const c = (window.appStore?.circles || []).find((x) => x.id === circleId);
  return c ? c.name : "—";
}

// ==========================================================================
// القسم المالي: التقارير المالية (إيرادات/مصروفات) + مسير الرواتب
// ==========================================================================

function isFinanceAdminUser() {
  const user = window.currentUser;
  if (!user) return false;
  return (
    user.role === "admin" || user.role === "director" || Boolean(user.isAdmin)
  );
}

function isFinanceTeacherUser() {
  const user = window.currentUser;
  if (!user || user.role !== "teacher") return false;
  if (user.isFinance === true) return true;
  const teacherId = user.teacherId || user.id;
  if (window.appStore?.settings?.financialTeacherId === teacherId) return true;
  return (window.appStore?.teachers || []).some(
    (t) => (t.id === teacherId || t.userId === user.id) && t.isFinance === true,
  );
}

window.switchFinanceSubTab = function (tab) {
  const btnReports = document.getElementById("tab-btn-finance-reports");
  const btnPayroll = document.getElementById("tab-btn-finance-payroll");
  const boxReports = document.getElementById("box-finance-reports");
  const boxPayroll = document.getElementById("box-finance-payroll");

  if (tab === "payroll") {
    btnPayroll?.classList.add("active");
    btnReports?.classList.remove("active");
    if (boxPayroll) {
      boxPayroll.classList.remove("style-hidden");
      boxPayroll.style.display = "block";
    }
    if (boxReports) {
      boxReports.classList.add("style-hidden");
      boxReports.style.display = "none";
    }
    renderPayrollTable();
  } else {
    btnReports?.classList.add("active");
    btnPayroll?.classList.remove("active");
    if (boxReports) {
      boxReports.classList.remove("style-hidden");
      boxReports.style.display = "block";
    }
    if (boxPayroll) {
      boxPayroll.classList.add("style-hidden");
      boxPayroll.style.display = "none";
    }
    renderFinanceReports();
  }
};

window.renderFinanceReports = function () {
  const revBody = document.getElementById("finance-revenues-tbody");
  const expBody = document.getElementById("finance-expenses-tbody");
  if (!revBody || !expBody) return;

  const isAdmin = isFinanceAdminUser();
  const fmt = (n) =>
    (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("ar-SA");

  const revenues = (window.appStore.financeRevenues || [])
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const expenses = (window.appStore.financeExpenses || [])
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalRevenue = revenues.reduce(
    (sum, r) => sum + (parseFloat(r.amount) || 0),
    0,
  );
  const totalExpense = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0,
  );
  const netBalance = totalRevenue - totalExpense;

  const totalRevenueEl = document.getElementById("finance-total-revenue");
  const totalExpenseEl = document.getElementById("finance-total-expense");
  const netBalanceEl = document.getElementById("finance-net-balance");
  if (totalRevenueEl) totalRevenueEl.textContent = fmt(totalRevenue);
  if (totalExpenseEl) totalExpenseEl.textContent = fmt(totalExpense);
  if (netBalanceEl) netBalanceEl.textContent = fmt(netBalance);

  revBody.innerHTML =
    revenues.length === 0
      ? '<tr><td colspan="4" class="text-center text-muted p-3">لا توجد إيرادات مسجلة</td></tr>'
      : revenues
          .map(
            (r) => `
        <tr>
          <td>${escapeHtml(r.date) || "—"}</td>
          <td>${escapeHtml(r.source) || "—"}</td>
          <td style="color:#2e7d32; font-weight:800;">${fmt(parseFloat(r.amount) || 0)}</td>
          <td class="nav-admin-only">${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteFinanceRevenue('${r.id}')">حذف</button>` : ""}</td>
        </tr>
      `,
          )
          .join("");

  expBody.innerHTML =
    expenses.length === 0
      ? '<tr><td colspan="5" class="text-center text-muted p-3">لا توجد مصروفات مسجلة</td></tr>'
      : expenses
          .map(
            (e) => `
        <tr>
          <td>${escapeHtml(e.date) || "—"}</td>
          <td>${escapeHtml(e.category) || "—"}</td>
          <td>${escapeHtml(e.notes) || "—"}</td>
          <td style="color:#c62828; font-weight:800;">${fmt(parseFloat(e.amount) || 0)}</td>
          <td class="nav-admin-only">${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteFinanceExpense('${e.id}')">حذف</button>` : ""}</td>
        </tr>
      `,
          )
          .join("");
};

window.handleAddFinanceRevenue = function (e) {
  e.preventDefault();
  if (!isFinanceAdminUser()) {
    alert("⚠️ إضافة الإيرادات متاحة للمدير فقط.");
    return;
  }
  const form = e.target;
  const amount = parseFloat(form.elements["amount"].value);
  const date = form.elements["date"].value;
  const source = (form.elements["source"].value || "").trim();
  if (!amount || amount <= 0 || !date) {
    alert("⚠️ يرجى إدخال مبلغ وتاريخ صحيحين.");
    return;
  }

  const record = {
    id: "rev_" + Date.now(),
    amount,
    date,
    source,
    createdBy: window.currentUser.name,
    createdAt: Date.now(),
  };
  if (!window.appStore.financeRevenues) window.appStore.financeRevenues = [];
  window.appStore.financeRevenues.push(record);
  if (typeof saveToCloud === "function")
    saveToCloud("financeRevenues", record.id, record);
  if (typeof saveLocalStore === "function") saveLocalStore();
  form.reset();
  renderFinanceReports();
};

window.handleAddFinanceExpense = function (e) {
  e.preventDefault();
  if (!isFinanceAdminUser()) {
    alert("⚠️ إضافة المصروفات متاحة للمدير فقط.");
    return;
  }
  const form = e.target;
  const category = (form.elements["category"].value || "").trim();
  const amount = parseFloat(form.elements["amount"].value);
  const date = form.elements["date"].value;
  const notes = (form.elements["notes"].value || "").trim();
  if (!category || !amount || amount <= 0 || !date) {
    alert("⚠️ يرجى إدخال الصنف والمبلغ والتاريخ بشكل صحيح.");
    return;
  }

  const record = {
    id: "exp_" + Date.now(),
    category,
    amount,
    date,
    notes,
    createdBy: window.currentUser.name,
    createdAt: Date.now(),
  };
  if (!window.appStore.financeExpenses) window.appStore.financeExpenses = [];
  window.appStore.financeExpenses.push(record);
  if (typeof saveToCloud === "function")
    saveToCloud("financeExpenses", record.id, record);
  if (typeof saveLocalStore === "function") saveLocalStore();
  form.reset();
  renderFinanceReports();
};

window.deleteFinanceRevenue = function (id) {
  if (!isFinanceAdminUser()) return;
  if (!confirm("هل أنت متأكد من حذف هذا الإيراد؟")) return;
  window.appStore.financeRevenues = (
    window.appStore.financeRevenues || []
  ).filter((r) => r.id !== id);
  if (typeof saveToCloud === "function")
    saveToCloud("financeRevenues", id, null, true);
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderFinanceReports();
};

window.deleteFinanceExpense = function (id) {
  if (!isFinanceAdminUser()) return;
  if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;
  window.appStore.financeExpenses = (
    window.appStore.financeExpenses || []
  ).filter((e) => e.id !== id);
  if (typeof saveToCloud === "function")
    saveToCloud("financeExpenses", id, null, true);
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderFinanceReports();
};

window.exportFinanceRevenuesExcel = function () {
  const table = document.getElementById("finance-revenues-table");
  if (!table || typeof XLSX === "undefined") {
    alert("⚠️ لا توجد بيانات لتصديرها.");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "الإيرادات" });
  XLSX.writeFile(
    wb,
    `سجل_الإيرادات_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

window.exportFinanceExpensesExcel = function () {
  const table = document.getElementById("finance-expenses-table");
  if (!table || typeof XLSX === "undefined") {
    alert("⚠️ لا توجد بيانات لتصديرها.");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "المصروفات" });
  XLSX.writeFile(
    wb,
    `سجل_المصروفات_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

// مسير الرواتب: يضم المدير (صالح ال ناشع) مع المعلمين
function getPayrollRecord(teacherId, month) {
  const id = `payroll_${teacherId}_${month}`;
  return (
    (window.appStore.payroll || []).find((p) => p.id === id) || {
      id,
      teacherId,
      month,
      baseSalary: 0,
      bonus: 0,
    }
  );
}

function countWorkdaysInMonth(month) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isWorkday =
      typeof isOfficialWorkday === "function"
        ? isOfficialWorkday(dateStr)
        : true;
    if (isWorkday) count++;
  }
  return count || 1;
}

window.renderPayrollTable = function () {
  const tbody = document.getElementById("payroll-tbody");
  const monthInput = document.getElementById("payroll-month-select");
  if (!tbody || !monthInput) return;

  if (!monthInput.value) {
    const now = new Date();
    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const month = monthInput.value;
  const workdaysInMonth = countWorkdaysInMonth(month);

  const isAdmin = isFinanceAdminUser();
  const isFinTeacher = isFinanceTeacherUser();
  const currentUserTeacherId = window.currentUser
    ? window.currentUser.teacherId || window.currentUser.id
    : null;

  const directorName =
    window.appStore?.settings?.directorName || "صالح ال ناشع";
  const directorObj = {
    id: "admin_main",
    name: `${directorName} (المدير)`,
    isDirector: true,
    status: "active",
  };

  const teachers = (window.appStore.teachers || []).filter(
    (t) => t.status !== "suspended",
  );

  const allStaff = [directorObj, ...teachers];

  const fmt = (n) =>
    (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("ar-SA");

  tbody.innerHTML = allStaff
    .map((t) => {
      const rec = getPayrollRecord(t.id, month);
      const attRecords = (window.appStore.teacherAttendance || []).filter(
        (a) => a.teacherId === t.id && a.date && a.date.startsWith(month),
      );
      const presentDays = attRecords.filter(
        (a) => a.status === "present" || a.status === "late",
      ).length;
      const excusedDays = attRecords.filter(
        (a) => a.status === "excused",
      ).length;
      const absentDays = Math.max(
        0,
        workdaysInMonth - presentDays - excusedDays,
      );

      const baseSalary = parseFloat(rec.baseSalary) || 0;
      const bonus = parseFloat(rec.bonus) || 0;
      const dailyRate = workdaysInMonth > 0 ? baseSalary / workdaysInMonth : 0;
      const deduction = dailyRate * absentDays;
      const total = Math.max(0, baseSalary - deduction + bonus);

      const canEditBase = isAdmin;
      const canEditBonus =
        isAdmin || (isFinTeacher && t.id !== currentUserTeacherId);

      return `
      <tr style="${t.isDirector ? "background: #fdfbf7;" : ""}">
        <td style="font-weight:800; text-align:right; color:${t.isDirector ? "var(--primary-brown)" : "inherit"};">
          ${escapeHtml(t.name)}
        </td>
        <td>${
          canEditBase
            ? `<input type="number" step="0.01" min="0" class="form-control" style="width:110px; display:inline-block;" value="${baseSalary}" onchange="savePayrollField('${t.id}', '${month}', 'baseSalary', this.value)">`
            : fmt(baseSalary)
        }</td>
        <td>${fmt(dailyRate)}</td>
        <td style="color:#2e7d32; font-weight:700;">${presentDays}</td>
        <td style="color:#c62828; font-weight:700;">${absentDays}</td>
        <td style="color:#1565c0; font-weight:700;">${excusedDays}</td>
        <td>${
          canEditBonus
            ? `<input type="number" step="0.01" class="form-control" style="width:100px; display:inline-block;" value="${bonus}" onchange="savePayrollField('${t.id}', '${month}', 'bonus', this.value)">`
            : fmt(bonus)
        }</td>
        <td style="font-weight:900; color:var(--primary-brown);">${fmt(total)}</td>
      </tr>
    `;
    })
    .join("");
};

window.savePayrollField = function (teacherId, month, field, value) {
  const isAdmin = isFinanceAdminUser();
  const isFinTeacher = isFinanceTeacherUser();
  const currentUserTeacherId = window.currentUser
    ? window.currentUser.teacherId || window.currentUser.id
    : null;

  if (field === "baseSalary" && !isAdmin) {
    alert("⚠️ تعديل المكافأة الأساسية متاح للمدير فقط.");
    renderPayrollTable();
    return;
  }
  if (
    field === "bonus" &&
    !(isAdmin || (isFinTeacher && teacherId !== currentUserTeacherId))
  ) {
    alert("⚠️ غير مصرح لك بهذا التعديل.");
    renderPayrollTable();
    return;
  }

  const id = `payroll_${teacherId}_${month}`;
  let rec = (window.appStore.payroll || []).find((p) => p.id === id);
  if (!rec) {
    rec = { id, teacherId, month, baseSalary: 0, bonus: 0 };
    if (!window.appStore.payroll) window.appStore.payroll = [];
    window.appStore.payroll.push(rec);
  }
  rec[field] = parseFloat(value) || 0;
  rec.updatedBy = window.currentUser?.name || "";
  rec.updatedAt = Date.now();

  if (typeof saveToCloud === "function") saveToCloud("payroll", id, rec);
  if (typeof saveLocalStore === "function") saveLocalStore();
  renderPayrollTable();
};

window.exportPayrollExcel = function () {
  const table = document.getElementById("payroll-table");
  if (!table || typeof XLSX === "undefined") {
    alert("⚠️ لا توجد بيانات لتصديرها.");
    return;
  }
  const wb = XLSX.utils.table_to_book(table, { sheet: "مسير الرواتب" });
  XLSX.writeFile(
    wb,
    `مسير_الرواتب_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};
