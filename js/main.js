// js/main.js

/**
 * يعرض رسالة توست مؤقتة للمستخدم.
 * @param {string} message - نص الرسالة.
 * @param {string} type - نوع الرسالة ('success', 'error', 'warning', 'info').
 * @param {number} duration - مدة عرض الرسالة بالمللي ثانية (افتراضي 3000).
 */
function showMessage(message, type = 'info', duration = 3000) {
    const toastContainer = document.querySelector('.message-toast-container');
    if (!toastContainer) {
        const div = document.createElement('div');
        div.className = 'message-toast-container';
        document.body.appendChild(div);
    }

    const toast = document.createElement('div');
    toast.className = `message-toast ${type}`;
    toast.innerHTML = `<div class="message-content"><i class="fas fa-info-circle"></i><span>${message}</span></div>`;

    document.querySelector('.message-toast-container').appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutLeft 0.3s ease-out forwards'; // Adjusted for RTL
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, duration);
}

/**
 * يحول الوقت من تنسيق 24 ساعة (HH:MM) إلى تنسيق 12 ساعة (HH:MM AM/PM).
 * @param {string} time24h - الوقت بتنسيق 24 ساعة (مثال: "13:30").
 * @returns {string} الوقت بتنسيق 12 ساعة (مثال: "01:30 PM").
 */
function convertTo12HourFormat(time24h) {
    if (!time24h) return '';
    const [hours, minutes] = time24h.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12; // Converts 0 to 12 for midnight/noon
    return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// عند تحميل الصفحة، عرض الإحصائيات الأولية في الصفحة الرئيسية
document.addEventListener('DOMContentLoaded', () => {
    console.log('Main JavaScript loaded.');

    const updateHomepageStats = () => {
        const doctors = getData('doctors');
        const courses = getData('courses');
        const sections = getData('sections');
        const rooms = getData('rooms');
        const issueReports = getData('issueReports') || []; // جلب البلاغات

        const totalDoctorsElement = document.getElementById('total-doctors');
        const totalCoursesElement = document.getElementById('total-courses');
        const totalSectionsElement = document.getElementById('total-sections');
        const totalRoomsElement = document.getElementById('total-rooms');
        const totalReportsElement = document.getElementById('total-reports'); // جديد
        const pendingReportsElement = document.getElementById('pending-reports'); // جديد

        if (totalDoctorsElement) totalDoctorsElement.textContent = doctors.length;
        if (totalCoursesElement) totalCoursesElement.textContent = courses.length;
        if (totalSectionsElement) totalSectionsElement.textContent = sections.length;
        if (totalRoomsElement) totalRoomsElement.textContent = rooms.length;
        if (totalReportsElement) totalReportsElement.textContent = issueReports.length;
        if (pendingReportsElement) pendingReportsElement.textContent = issueReports.filter(r => r.status === 'pending').length;
    };

    // إضافة كلاس 'homepage' إلى body في index.html ليعمل هذا الكود
    if (document.body.classList.contains('homepage')) {
        updateHomepageStats();
    }
});
