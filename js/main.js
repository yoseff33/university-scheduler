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

    // Fade out and remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, duration);
}


// عند تحميل الصفحة، عرض الإحصائيات الأولية في الصفحة الرئيسية
document.addEventListener('DOMContentLoaded', () => {
    console.log('Main JavaScript loaded.');

    // وظيفة لتحديث إحصائيات الصفحة الرئيسية
    const updateHomepageStats = () => {
        const doctors = getData('doctors');
        const courses = getData('courses');
        const sections = getData('sections');
        const rooms = getData('rooms');

        const totalDoctorsElement = document.getElementById('total-doctors');
        const totalCoursesElement = document.getElementById('total-courses');
        const totalSectionsElement = document.getElementById('total-sections');
        const totalRoomsElement = document.getElementById('total-rooms');

        if (totalDoctorsElement) totalDoctorsElement.textContent = doctors.length;
        if (totalCoursesElement) totalCoursesElement.textContent = courses.length;
        if (totalSectionsElement) totalSectionsElement.textContent = sections.length;
        if (totalRoomsElement) totalRoomsElement.textContent = rooms.length;
    };

    // استدعاء تحديث الإحصائيات عند تحميل الصفحة الرئيسية
    if (document.body.classList.contains('homepage')) { // أضف كلاس 'homepage' لـ body في index.html
        updateHomepageStats();
    }
});

// ملاحظة: لكي تعمل دالة showMessage، يجب أن تكون متاحة عالمياً
// أو يتم استيرادها في الملفات الأخرى. هنا سأعتبرها متاحة عالمياً
// لأنها في ملف main.js الذي يتم تضمينه في كل الصفحات.
