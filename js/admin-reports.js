// js/admin-reports.js

let issueReports = getData('issueReports') || [];
let rooms = getData('rooms'); // نحتاج القاعات لنموذج البلاغات

/**
 * وظيفة لعرض تقارير المشاكل.
 * @param {Array<Object>} reportsToDisplay - قائمة البلاغات المراد عرضها.
 */
const displayReports = (reportsToDisplay) => {
    const reportsListDiv = document.getElementById('admin-reports-list');
    const noReportsMessage = document.getElementById('no-reports-message');
    reportsListDiv.innerHTML = '';

    if (reportsToDisplay.length === 0) {
        noReportsMessage.classList.remove('hidden');
        return;
    } else {
        noReportsMessage.classList.add('hidden');
    }

    reportsToDisplay.forEach(report => {
        const reportCard = document.createElement('div');
        reportCard.className = `report-card ${report.status}`;
        reportCard.innerHTML = `
            <div class="report-header">
                <div class="report-title">مشكلة في القاعة: ${report.roomName}</div>
                <span class="report-status ${report.status}">${report.status === 'pending' ? 'قيد الانتظار' : 'تم حلها'}</span>
            </div>
            <div class="report-details">
                <p><strong>النوع:</strong> ${report.issueType}</p>
                <p><strong>الوصف:</strong> ${report.description}</p>
            </div>
            <div class="report-meta">
                تم الإبلاغ في: ${report.timestamp}
            </div>
            <div class="report-actions">
                ${report.status === 'pending' ?
                    `<button onclick="toggleReportStatus(${report.id})" class="btn btn-success btn-sm"><i class="fas fa-check"></i> وضع كتم الحل</button>` :
                    `<button onclick="toggleReportStatus(${report.id})" class="btn btn-warning btn-sm"><i class="fas fa-undo"></i> إلغاء الحل</button>`
                }
                <button onclick="deleteReport(${report.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
            </div>
        `;
        reportsListDiv.appendChild(reportCard);
    });
};

/**
 * وظيفة لتحديث إحصائيات البلاغات في الصفحة.
 */
const updateReportStats = () => {
    const totalCount = issueReports.length;
    const pendingCount = issueReports.filter(r => r.status === 'pending').length;
    const resolvedCount = issueReports.filter(r => r.status === 'resolved').length;

    document.getElementById('total-reports-count').textContent = totalCount;
    document.getElementById('pending-reports-count').textContent = pendingCount;
    document.getElementById('resolved-reports-count').textContent = resolvedCount;
};

/**
 * وظيفة لتغيير حالة البلاغ (قيد الانتظار <-> تم حلها).
 * @param {number} reportId - معرف البلاغ.
 */
window.toggleReportStatus = (reportId) => {
    const reportIndex = issueReports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
        issueReports[reportIndex].status = issueReports[reportIndex].status === 'pending' ? 'resolved' : 'pending';
        saveData('issueReports', issueReports);
        applyFilters(); // إعادة عرض البلاغات بعد التحديث
        updateReportStats(); // تحديث الإحصائيات
        showMessage('تم تحديث حالة البلاغ بنجاح!', 'success');
    } else {
        showMessage('فشل تحديث حالة البلاغ.', 'error');
    }
};

/**
 * وظيفة لحذف بلاغ.
 * @param {number} reportId - معرف البلاغ.
 */
window.deleteReport = (reportId) => {
    if (confirm('هل أنت متأكد من حذف هذا البلاغ؟')) {
        const initialLength = issueReports.length;
        issueReports = issueReports.filter(r => r.id !== reportId);
        if (issueReports.length < initialLength) {
            saveData('issueReports', issueReports);
            applyFilters(); // إعادة عرض البلاغات بعد الحذف
            updateReportStats(); // تحديث الإحصائيات
            showMessage('تم حذف البلاغ بنجاح!', 'success');
        } else {
            showMessage('فشل حذف البلاغ.', 'error');
        }
    }
};

/**
 * وظيفة لتطبيق التصفية بناءً على المدخلات.
 */
const applyFilters = () => {
    const filterStatus = document.getElementById('filter-status').value;
    const filterRoomName = document.getElementById('filter-room-name').value.toLowerCase();

    let filteredReports = issueReports;

    if (filterStatus !== 'all') {
        filteredReports = filteredReports.filter(report => report.status === filterStatus);
    }

    if (filterRoomName) {
        filteredReports = filteredReports.filter(report =>
            report.roomName.toLowerCase().includes(filterRoomName)
        );
    }
    displayReports(filteredReports);
};

// --- منطق تقديم البلاغ الجديد (تم نقله من doctor-view.js) ---

const populateRoomIssueSelect = () => {
    const issueRoomSelect = document.getElementById('issue-room');
    issueRoomSelect.innerHTML = '<option value="">اختر قاعة</option>';

    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        issueRoomSelect.appendChild(option);
    });
};

document.getElementById('room-issue-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const roomId = parseInt(document.getElementById('issue-room').value);
    const issueType = document.getElementById('issue-type').value;
    const issueDescription = document.getElementById('issue-description').value;

    if (isNaN(roomId) || !rooms.some(r => r.id === roomId)) {
        showMessage('الرجاء اختيار قاعة صالحة.', 'error');
        return;
    }

    const room = rooms.find(r => r.id === roomId);
    
    issueReports.push({
        id: Date.now(),
        roomId: roomId,
        roomName: room.name,
        issueType: issueType,
        description: issueDescription,
        timestamp: new Date().toLocaleString(),
        status: 'pending'
    });
    saveData('issueReports', issueReports);

    showMessage(`تم استلام بلاغك عن مشكلة "${issueType}" في القاعة "${room.name}" بنجاح!`, 'success');

    e.target.reset();
    // إعادة عرض البلاغات بعد إضافة بلاغ جديد لتظهر في القائمة
    applyFilters();
    updateReportStats();
});


// --- معالجات الأحداث (Event Handlers) ---
document.getElementById('apply-filter-btn').addEventListener('click', applyFilters);
document.getElementById('clear-filter-btn').addEventListener('click', () => {
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-room-name').value = '';
    applyFilters();
});

document.addEventListener('DOMContentLoaded', () => {
    // تحديث متغيرات البيانات بعد التحميل
    rooms = getData('rooms'); // تأكد من جلب القاعات
    issueReports = getData('issueReports') || []; // تأكد من جلب البلاغات

    updateReportStats();
    populateRoomIssueSelect(); // لملء قائمة القاعات في نموذج البلاغ
    applyFilters(); // عرض جميع البلاغات في البداية
});
