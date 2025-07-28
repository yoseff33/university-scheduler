// js/main.js

/**
 * يعرض رسالة توست مؤقتة للمستخدم.
 * @param {string} message - نص الرسالة.
 * @param {string} type - نوع الرسالة ('success', 'error', 'warning', 'info').
 * @param {number} duration - مدة عرض الرسالة بالمللي ثانية (افتراضي 3000).
 */
function showMessage(message, type = 'info', duration = 3000) {
    let toastContainer = document.querySelector('.message-toast-container');
    if (!toastContainer) {
        // إذا لم يتم العثور على الحاوية في الـ DOM، قم بإنشائها
        toastContainer = document.createElement('div');
        toastContainer.className = 'message-toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    // إضافة فئة 'slideInLeft' لبدء الحركة من اليسار (لأن الـ RTL)
    toast.className = `message-toast ${type} slideInLeft`; 
    
    // تحديد الأيقونة بناءً على نوع الرسالة
    let iconClass = 'fas fa-info-circle'; // افتراضي
    if (type === 'success') {
        iconClass = 'fas fa-check-circle';
    } else if (type === 'error') {
        iconClass = 'fas fa-times-circle';
    } else if (type === 'warning') {
        iconClass = 'fas fa-exclamation-triangle';
    }
    
    toast.innerHTML = `<div class="message-content"><i class="${iconClass}"></i><span>${message}</span></div>`;

    toastContainer.appendChild(toast); // استخدام toastContainer الذي تم التأكد من وجوده

    // إزالة الرسالة بعد المدة المحددة
    setTimeout(() => {
        // إضافة فئة 'slideOutLeft' لتشغيل حركة الاختفاء لليسار (لأن الـ RTL)
        toast.classList.remove('slideInLeft'); // إزالة حركة الدخول قبل تشغيل الخروج
        toast.classList.add('slideOutLeft');
        toast.addEventListener('animationend', () => {
            toast.remove();
        }, { once: true }); // استخدام { once: true } لضمان تنفيذ المستمع مرة واحدة فقط
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

// Navbar shrink on scroll logic
let lastScrollTop = 0; // To track scroll direction for future features

document.addEventListener('DOMContentLoaded', () => {
    console.log('Main JavaScript loaded.');

    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > 50) { // Shrink after scrolling 50px
                navbar.classList.add('shrink');
            } else {
                navbar.classList.remove('shrink');
            }
            lastScrollTop = scrollTop;
        });
    }

    // --- كود تفعيل زر الهامبرغر وقائمة التنقل ---
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (navToggle && navMenu) { // التأكد من وجود العناصر
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open'); // تبديل فئة 'open' لإظهار/إخفاء القائمة
        });

        // إغلاق القائمة عند النقر على رابط (اختياري، ولكن يحسن تجربة المستخدم)
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open'); // إزالة فئة 'open' لإغلاق القائمة
            });
        });
    }
    // --- نهاية كود تفعيل زر الهامبرغر ---


    const updateHomepageStats = () => {
        // تأكد أن دالة getData موجودة في utils.js ويتم تحميلها قبله
        // إذا لم تكن موجودة بعد، ستحتاج إلى جلبها من مكانها أو تعريفها هنا
        const doctors = typeof getData !== 'undefined' ? getData('doctors') : [];
        const courses = typeof getData !== 'undefined' ? getData('courses') : [];
        const sections = typeof getData !== 'undefined' ? getData('sections') : [];
        const rooms = typeof getData !== 'undefined' ? getData('rooms') : [];
        const issueReports = typeof getData !== 'undefined' ? (getData('issueReports') || []) : [];

        const totalDoctorsElement = document.getElementById('total-doctors');
        const totalCoursesElement = document.getElementById('total-courses');
        const totalSectionsElement = document.getElementById('total-sections');
        const totalRoomsElement = document.getElementById('total-rooms');
        const totalReportsElement = document.getElementById('total-reports');
        const pendingReportsElement = document.getElementById('pending-reports');

        if (totalDoctorsElement) totalDoctorsElement.textContent = doctors.length;
        if (totalCoursesElement) totalCoursesElement.textContent = courses.length;
        if (totalSectionsElement) totalSectionsElement.textContent = sections.length;
        if (totalRoomsElement) totalRoomsElement.textContent = rooms.length;
        if (totalReportsElement) totalReportsElement.textContent = issueReports.length;
        if (pendingReportsElement) pendingReportsElement.textContent = issueReports.filter(r => r.status === 'pending').length;
    };

    if (document.body.classList.contains('homepage')) {
        updateHomepageStats();
    }
});
