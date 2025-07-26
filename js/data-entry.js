// js/data-entry.js

// جلب البيانات الأولية من LocalStorage
let doctors = getData('doctors');
let courses = getData('courses');
let sections = getData('sections');
let rooms = getData('rooms');

// أيام الأسبوع للواجهة (قابلة للتخصيص حسب نظام الجامعة)
const daysOfWeek = [
    { id: 'sunday', name: 'الأحد' },
    { id: 'monday', name: 'الإثنين' },
    { id: 'tuesday', name: 'الثلاثاء' },
    { id: 'wednesday', name: 'الأربعاء' },
    { id: 'thursday', name: 'الخميس' }
    // يمكنك إضافة 'friday' و 'saturday' إذا كانت أيام عمل
];

/**
 * وظيفة لعرض قائمة الدكاترة.
 */
const displayDoctors = () => {
    const doctorsUl = document.getElementById('doctors-ul');
    doctorsUl.innerHTML = ''; // مسح القائمة الحالية

    if (doctors.length === 0) {
        doctorsUl.innerHTML = '<li style="color: #6b7280;">لا توجد بيانات دكاترة بعد.</li>';
        return;
    }

    doctors.forEach((doctor, index) => {
        const li = document.createElement('li');
        li.className = 'item-list-item'; // لتطبيق التنسيقات من style.css
        // بناء سلسلة الأوقات المتاحة بشكل مقروء
        const availableTimesStr = daysOfWeek.map(dayInfo => {
            const slot = doctor.availableTimes[dayInfo.id];
            return slot && slot.start && slot.end ? `${dayInfo.name}: ${slot.start}-${slot.end}` : '';
        }).filter(Boolean).join(', '); // تصفية السلاسل الفارغة وضمها

        li.innerHTML = `
            ${doctor.name} - ساعات: ${doctor.weeklyHours} | متاح: ${availableTimesStr || 'غير محدد'} | غير متاح: ${doctor.unavailableTimes.join(', ') || 'لا يوجد'}
            <button onclick="deleteItem('doctors', ${index})" class="delete-button">حذف</button>
        `;
        doctorsUl.appendChild(li);
    });
};

/**
 * وظيفة لعرض قائمة المقررات.
 */
const displayCourses = () => {
    const coursesUl = document.getElementById('courses-ul');
    coursesUl.innerHTML = '';

    if (courses.length === 0) {
        coursesUl.innerHTML = '<li style="color: #6b7280;">لا توجد بيانات مقررات بعد.</li>';
        return;
    }

    courses.forEach((course, index) => {
        const li = document.createElement('li');
        li.className = 'item-list-item';
        li.innerHTML = `
            ${course.name} (${course.code}) - ساعات: ${course.hours} - نوع: ${course.type === 'short' ? 'قصيرة (50 دقيقة)' : 'طويلة (1 ساعة و40 دقيقة)'} ${course.requiresLab ? '(يتطلب معمل)' : ''}
            <button onclick="deleteItem('courses', ${index})" class="delete-button">حذف</button>
        `;
        coursesUl.appendChild(li);
    });
};

/**
 * وظيفة لعرض قائمة الشعب.
 */
const displaySections = () => {
    const sectionsUl = document.getElementById('sections-ul');
    sectionsUl.innerHTML = '';

    if (sections.length === 0) {
        sectionsUl.innerHTML = '<li style="color: #6b7280;">لا توجد بيانات شُعب بعد.</li>';
        return;
    }

    sections.forEach((section, index) => {
        const doctor = doctors.find(d => d.id === section.doctorId);
        const course = courses.find(c => c.id === section.courseId);
        const li = document.createElement('li');
        li.className = 'item-list-item';
        li.innerHTML = `
            ${section.name} - طلاب: ${section.students} - مقرر: ${course ? course.name : 'غير معروف'} - دكتور: ${doctor ? doctor.name : 'غير معروف'}
            <button onclick="deleteItem('sections', ${index})" class="delete-button">حذف</button>
        `;
        sectionsUl.appendChild(li);
    });
};

/**
 * وظيفة لعرض قائمة القاعات.
 */
const displayRooms = () => {
    const roomsUl = document.getElementById('rooms-ul');
    roomsUl.innerHTML = '';

    if (rooms.length === 0) {
        roomsUl.innerHTML = '<li style="color: #6b7280;">لا توجد بيانات قاعات بعد.</li>';
        return;
    }

    rooms.forEach((room, index) => {
        const li = document.createElement('li');
        li.className = 'item-list-item';
        li.innerHTML = `
            ${room.name} - سعة: ${room.capacity} - نوع: ${room.type === 'classroom' ? 'قاعة دراسية' : room.type === 'lab' ? 'معمل' : 'قاعة تدريب'} ${room.forbiddenTimes.length > 0 ? `(أوقات ممنوعة: ${room.forbiddenTimes.join(', ')})` : ''}
            <button onclick="deleteItem('rooms', ${index})" class="delete-button">حذف</button>
        `;
        roomsUl.appendChild(li);
    });
};

/**
 * وظيفة لحذف عنصر من القوائم وحفظ البيانات.
 * @param {string} type - نوع البيانات (doctors, courses, sections, rooms).
 * @param {number} index - فهرس العنصر المراد حذفه.
 */
window.deleteItem = (type, index) => {
    if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
        if (type === 'doctors') {
            doctors.splice(index, 1);
            saveData('doctors', doctors);
            displayDoctors();
        } else if (type === 'courses') {
            courses.splice(index, 1);
            saveData('courses', courses);
            displayCourses();
            populateSectionsSelects(); // تحديث قائمة المقررات في الشعب بعد الحذف
        } else if (type === 'sections') {
            sections.splice(index, 1);
            saveData('sections', sections);
            displaySections();
        } else if (type === 'rooms') {
            rooms.splice(index, 1);
            saveData('rooms', rooms);
            displayRooms();
            // populateRoomIssueSelect(); // إذا كانت دالة في صفحة doctor-view، يجب أن تكون في سياق تلك الصفحة
        }
    }
};

/**
 * وظيفة لملء قوائم الاختيار (select) في نموذج الشعب ببيانات المقررات والدكاترة.
 */
const populateSectionsSelects = () => {
    const sectionCourseSelect = document.getElementById('section-course');
    const sectionDoctorSelect = document.getElementById('section-doctor');

    // مسح الخيارات الحالية
    sectionCourseSelect.innerHTML = '<option value="">اختر مقررًا</option>';
    sectionDoctorSelect.innerHTML = '<option value="">اختر دكتورًا</option>';

    // ملء خيارات المقررات
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        sectionCourseSelect.appendChild(option);
    });

    // ملء خيارات الدكاترة
    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = doctor.name;
        sectionDoctorSelect.appendChild(option);
    });
};

// معالج حدث لإرسال نموذج الدكتور
document.getElementById('doctor-form').addEventListener('submit', (e) => {
    e.preventDefault(); // منع الإرسال الافتراضي للصفحة

    const name = document.getElementById('doctor-name').value;
    const weeklyHours = parseInt(document.getElementById('doctor-hours').value);

    // جمع الأوقات المتاحة لكل يوم
    const availableTimes = {};
    daysOfWeek.forEach(dayInfo => {
        const startInput = document.querySelector(`.time-input[data-day="${dayInfo.id}"][data-type="start"]`);
        const endInput = document.querySelector(`.time-input[data-day="${dayInfo.id}"][data-type="end"]`);
        if (startInput && endInput && startInput.value && endInput.value) {
            availableTimes[dayInfo.id] = { start: startInput.value, end: endInput.value };
        }
    });

    const unavailableTimesInput = document.getElementById('doctor-unavailable').value;
    // تقسيم الأوقات غير المناسبة وتنظيف المسافات البيضاء
    const unavailableTimes = unavailableTimesInput ? unavailableTimesInput.split(',').map(t => t.trim()) : [];

    const newDoctor = {
        id: Date.now(), // معرف فريد باستخدام الطابع الزمني
        name,
        weeklyHours,
        availableTimes,
        unavailableTimes,
        assignedHours: 0 // عدد الساعات المجدولة فعليًا للدكتور، يتم تحديثه في generate.js
    };
    doctors.push(newDoctor);
    saveData('doctors', doctors); // حفظ البيانات المحدثة في LocalStorage
    displayDoctors(); // تحديث عرض القائمة
    populateSectionsSelects(); // تحديث قائمة الدكاترة في الشعب
    e.target.reset(); // مسح حقول النموذج
});

// معالج حدث لإرسال نموذج المقرر
document.getElementById('course-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('course-name').value;
    const code = document.getElementById('course-code').value;
    const hours = parseInt(document.getElementById('course-hours').value);
    const type = document.getElementById('course-type').value;
    const requiresLab = document.getElementById('course-requires-lab').checked;

    const newCourse = {
        id: Date.now(),
        name,
        code,
        hours,
        type,
        requiresLab,
        assignedSections: [] // لتتبع الشعب المخصصة لهذا المقرر (يمكن استخدامها في منطق التوليد)
    };
    courses.push(newCourse);
    saveData('courses', courses);
    displayCourses();
    populateSectionsSelects(); // تحديث قائمة المقررات في الشعب
    e.target.reset();
});

// معالج حدث لإرسال نموذج الشعبة
document.getElementById('section-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('section-name').value;
    const students = parseInt(document.getElementById('section-students').value);
    const courseId = parseInt(document.getElementById('section-course').value);
    const doctorId = parseInt(document.getElementById('section-doctor').value);

    // التحقق من أن المقرر والدكتور المختارين موجودين
    if (isNaN(courseId) || isNaN(doctorId) || !courses.some(c => c.id === courseId) || !doctors.some(d => d.id === doctorId)) {
        alert('الرجاء اختيار مقرر ودكتور صالحين.');
        return;
    }

    const newSection = {
        id: Date.now(),
        name,
        students,
        courseId,
        doctorId,
        isScheduled: false // لتتبع ما إذا تم جدولة هذه الشعبة في generate.js
    };
    sections.push(newSection);
    saveData('sections', sections);
    displaySections();
    e.target.reset();
});

// معالج حدث لإرسال نموذج القاعة
document.getElementById('room-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('room-name').value;
    const capacity = parseInt(document.getElementById('room-capacity').value);
    const type = document.getElementById('room-type').value;

    const labForbiddenTimesInput = document.getElementById('lab-forbidden-times').value;
    // تقسيم الأوقات الممنوعة للمعامل وتنظيف المسافات البيضاء
    const forbiddenTimes = labForbiddenTimesInput ? labForbiddenTimesInput.split(',').map(t => t.trim()) : [];

    const newRoom = {
        id: Date.now(),
        name,
        capacity,
        type,
        forbiddenTimes
    };
    rooms.push(newRoom);
    saveData('rooms', rooms);
    displayRooms();
    // populateRoomIssueSelect(); // هذه الوظيفة تنتمي لـ doctor-view.js
    e.target.reset();
});

// عند تحميل الصفحة، يتم عرض جميع البيانات الموجودة وملء قوائم الاختيار
document.addEventListener('DOMContentLoaded', () => {
    displayDoctors();
    displayCourses();
    displaySections();
    displayRooms();
    populateSectionsSelects(); // لملء قوائم الاختيار بعد تحميل البيانات
});