/* css/style.css */

/* Global Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    scroll-behavior: smooth;
}

/* ... بقية متغيرات الـ :root ... */

/* Base Body Styles */
html {
    overflow-y: scroll;
    font-size: 100%; /* Default 16px */
}

body {
    font-family: 'Tajawal', 'Inter', sans-serif;
    /* ... بقية الأنماط ... */
}

/* ... بقية أنماط Scrollbar ... */


/* --- Navbar (Sleek and Professional) --- */
.navbar {
    /* ... أنماط موجودة ... */
}

.navbar.shrink {
    /* ... أنماط موجودة ... */
}

.nav-container {
    max-width: 1200px; /* يمكن زيادة هذا قليلاً إذا لم ينفع التصغير */
    margin: 0 auto;
    padding: 0 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
}

.nav-brand {
    display: flex;
    align-items: center;
    gap: 10px; /* تقليل المسافة بين الأيقونة والنص لتوفير مساحة */
    font-size: 1.5rem; /* تصغير حجم الخط للشعار في الحالة الافتراضية (للشاشات الكبيرة) */
    font-weight: 800;
    color: var(--primary-dark);
    text-decoration: none;
    transition: all var(--transition-speed) ease;
    white-space: nowrap; /* منع انقسام النص إلى سطرين */
    letter-spacing: -0.5px; /* تقليل التباعد بين الحروف قليلاً */
    text-shadow: 1px 1px 2px rgba(var(--black-rgb),0.05);
}

.nav-brand:hover {
    color: var(--primary-color);
    transform: translateY(-3px) scale(1.02);
}

/* Adjust brand size on shrink */
.navbar.shrink .nav-brand {
    font-size: 1.3rem; /* حجم أصغر للشعار عند الانكماش */
}

.nav-brand i {
    font-size: 1.9rem; /* تصغير حجم الأيقونة في الحالة الافتراضية */
    background: linear-gradient(45deg, var(--accent-color), var(--accent-dark));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-fill-color: transparent;
    transition: all var(--transition-speed) ease;
    filter: drop-shadow(1px 1px 1px rgba(var(--black-rgb),0.1));
}

/* Adjust brand icon size on shrink */
.navbar.shrink .nav-brand i {
    font-size: 1.8rem; /* حجم أصغر لأيقونة الشعار عند الانكماش */
}

/* ... بقية أنماط Navbar ... */

/* --- Responsive Design --- */

/* Mobile-first approach: General styles apply to small screens first */
/* Base html font-size for mobile devices (480px and below) */
@media (max-width: 480px) {
    html {
        font-size: 81.25%; /* 13px */
    }
    .nav-container {
        padding: 0 10px; /* تباعد أقل جداً على الجوالات */
        height: 60px;
    }
    .nav-brand {
        font-size: 1.1rem; /* حجم أصغر بكثير للشعار على أصغر الجوالات */
        gap: 5px; /* مسافة أصغر */
    }
    .nav-brand i {
        font-size: 1.3rem; /* أيقونة أصغر بكثير */
    }
    /* ... بقية أنماط الجوال ... */
}

/* Tablet (Portrait & Landscape) and smaller Desktops (481px to 992px) */
@media (min-width: 481px) and (max-width: 992px) {
    html {
        font-size: 93.75%; /* 15px */
    }
    .nav-container {
        padding: 0 20px;
    }
    .nav-brand {
        font-size: 1.4rem; /* حجم مناسب للتابلت */
        gap: 8px;
    }
    .nav-brand i {
        font-size: 1.7rem; /* أيقونة مناسبة للتابلت */
    }
    /* ... بقية أنماط التابلت ... */
}


/* Desktops and larger screens (min-width: 993px) */
@media (min-width: 993px) {
    html {
        font-size: 100%; /* Default 16px */
    }
    /* هنا لا حاجة لتصغير إضافي للشعار لأن القيم الافتراضية أصبحت أصغر */
}
