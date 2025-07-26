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
];

/**
 * وظيفة لعرض قائمة الدكاترة.
 */
const displayDoctors = () => {
    const doctorsListDiv = document.getElementById('doctors-list');
    doctorsListDiv.innerHTML = ''; // مسح القائمة الحالية

    if (doctors.length === 0) {
        doctorsListDiv.innerHTML = '<div class="empty-state"><p><i class="fas fa-info-circle"></i> لا توجد بيانات دكاترة بعد.</p></div>';
        return;
    }

    doctors.forEach((doctor, index) => {
        const doctorCard = document.createElement('div');
        doctorCard.className = 'item-card';

        const availableTimesStr = daysOfWeek.map(dayInfo => {
            const slot = doctor.availableTimes[dayInfo.id];
            return slot && slot.start && slot.end ? `${dayInfo.name}: ${slot.start}-${slot.end}` : '';
        }).filter(Boolean).join(' | ');

        doctorCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${doctor.name}</div>
                <div class="item-actions">
                    <button onclick="deleteItem('doctors', ${index})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
            <div class="item-details">
                <div class="item-detail"><strong>الساعات الأسبوعية:</strong> ${doctor.weeklyHours}</div>
                <div class="item-detail"><strong>الأوقات المتاحة:</strong> ${availableTimesStr || 'غير محدد'}</div>
                <div class="item-detail"><strong>أوقات غير مناسبة:</strong> ${doctor.unavailableTimes.join(', ') || 'لا يوجد'}</div>
            </div>
        `;
        doctorsListDiv.appendChild(doctorCard);
    });
};

/**
 * وظيفة لعرض قائمة المقررات.
 */
const displayCourses = () => {
    const coursesListDiv = document.getElementById('courses-list');
    coursesListDiv.innerHTML = '';

    if (courses.length === 0) {
        coursesListDiv.innerHTML = '<div class="empty-state"><p><i class="fas fa-info-circle"></i> لا توجد بيانات مقررات بعد.</p></div>';
        return;
    }

    courses.forEach((course, index) => {
        const courseCard = document.createElement('div');
        courseCard.className = 'item-card';
        courseCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${course.name} (${course.code})</div>
                <div class="item-actions">
                    <button onclick="deleteItem('courses', ${index})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
            <div class="item-details">
                <div class="item-detail"><strong>الساعات:</strong> ${course.hours}</div>
                <div class="item-detail"><strong>النوع:</strong> ${course.type === 'short' ? 'قصيرة (50 دقيقة)' : 'طويلة (1 ساعة و40 دقيقة)'}</div>
                <div class="item-detail"><strong>يتطلب معمل:</strong> ${course.requiresLab ? 'نعم' : 'لا'}</div>
            </div>
        `;
        coursesListDiv.appendChild(courseCard);
    });
};

/**
 * وظيفة لعرض قائمة الشعب.
 */
const displaySections = () => {
    const sectionsListDiv = document.getElementById('sections-list');
    sectionsListDiv.innerHTML = '';

    if (sections.length === 0) {
        sectionsListDiv.innerHTML = '<div class="empty-state"><p><i class="fas fa-info-circle"></i> لا توجد بيانات شُعب بعد.</p></div>';
        return;
    }

    sections.forEach((section, index) => {
        const doctor = doctors.find(d => d.id === section.doctorId);
        const course = courses.find(c => c.id === section.courseId);
        const sectionCard = document.createElement('div');
        sectionCard.className = 'item-card';
        sectionCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${section.name}</div>
                <div class="item-actions">
                    <button onclick="deleteItem('sections', ${index})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
            <div class="item-details">
                <div class="item-detail"><strong>عدد الطلاب:</strong> ${section.students}</div>
                <div class="item-detail"><strong>المقرر:</strong> ${course ? course.name : 'غير معروف'}</div>
                <div class="item-detail"><strong>الدكتور المسؤول:</strong> ${doctor ? doctor.name : 'غير معروف'}</div>
            </div>
        `;
        sectionsListDiv.appendChild(sectionCard);
    });
};

/**
 * وظيفة لعرض قائمة القاعات.
 */
const displayRooms = () => {
    const roomsListDiv = document.getElementById('rooms-list');
    roomsListDiv.innerHTML = '';

    if (rooms.length === 0) {
        roomsListDiv.innerHTML = '<div class="empty-state"><p><i class="fas fa-info-circle"></i> لا توجد بيانات قاعات بعد.</p></div>';
        return;
    }

    rooms.forEach((room, index) => {
        const roomCard = document.createElement('div');
        roomCard.className = 'item-card';
        roomCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${room.name}</div>
                <div class="item-actions">
                    <button onclick="deleteItem('rooms', ${index})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
            <div class="item-details">
                <div class="item-detail"><strong>السعة:</strong> ${room.capacity}</div>
                <div class="item-detail"><strong>النوع:</strong> ${room.type === 'classroom' ? 'قاعة دراسية' : room.type === 'lab' ? 'معمل' : 'قاعة تدريب'}</div>
                <div class="item-detail"><strong>أوقات ممنوعة:</strong> ${room.forbiddenTimes.length > 0 ? room.forbiddenTimes.join(', ') : 'لا يوجد'}</div>
            </div>
        `;
        roomsListDiv.appendChild(roomCard);
    });
};

/**
 * وظيفة لحذف عنصر من القوائم وحفظ البيانات.
 * @param {string} type - نوع البيانات (doctors, courses, sections, rooms).
 * @param {number} index - فهرس العنصر المراد حذفه.
 */
window.deleteItem = (type, index) => {
    if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
        let success = false;
        if (type === 'doctors') {
            doctors.splice(index, 1);
            saveData('doctors', doctors);
            displayDoctors();
            populateSectionsSelects();
            success = true;
        } else if (type === 'courses') {
            courses.splice(index, 1);
            saveData('courses', courses);
            displayCourses();
            populateSectionsSelects();
            success = true;
        } else if (type === 'sections') {
            sections.splice(index, 1);
            saveData('sections', sections);
            displaySections();
            success = true;
        } else if (type === 'rooms') {
            rooms.splice(index, 1);
            saveData('rooms', rooms);
            displayRooms();
            success = true;
        }
        if (success) {
            showMessage('تم حذف العنصر بنجاح!', 'success');
        } else {
            showMessage('فشل حذف العنصر.', 'error');
        }
    }
};

/**
 * وظيفة لملء قوائم الاختيار (select) في نموذج الشعب ببيانات المقررات والدكاترة.
 */
const populateSectionsSelects = () => {
    const sectionCourseSelect = document.getElementById('section-course');
    const sectionDoctorSelect = document.getElementById('section-doctor');

    sectionCourseSelect.innerHTML = '<option value="">اختر مقررًا</option>';
    sectionDoctorSelect.innerHTML = '<option value="">اختر دكتورًا</option>';

    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        sectionCourseSelect.appendChild(option);
    });

    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = doctor.name;
        sectionDoctorSelect.appendChild(option);
    });
};

// معالج حدث لإرسال نموذج الدكتور
document.getElementById('doctor-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('doctor-name').value;
    const weeklyHours = parseInt(document.getElementById('doctor-hours').value);

    const availableTimes = {};
    daysOfWeek.forEach(dayInfo => {
        const startInput = document.querySelector(`.time-input[data-day="${dayInfo.id}"][data-type="start"]`);
        const endInput = document.querySelector(`.time-input[data-day="${dayInfo.id}"][data-type="end"]`);
        if (startInput && endInput && startInput.value && endInput.value) {
            availableTimes[dayInfo.id] = { start: startInput.value, end: endInput.value };
        }
    });

    const unavailableTimesInput = document.getElementById('doctor-unavailable').value;
    const unavailableTimes = unavailableTimesInput ? unavailableTimesInput.split(',').map(t => t.trim()) : [];

    const newDoctor = {
        id: Date.now(),
        name,
        weeklyHours,
        availableTimes,
        unavailableTimes,
        assignedHours: 0
    };
    doctors.push(newDoctor);
    saveData('doctors', doctors);
    displayDoctors();
    populateSectionsSelects();
    e.target.reset();
    showMessage('تمت إضافة الدكتور بنجاح!', 'success');
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
        assignedSections: []
    };
    courses.push(newCourse);
    saveData('courses', courses);
    displayCourses();
    populateSectionsSelects();
    e.target.reset();
    showMessage('تمت إضافة المقرر بنجاح!', 'success');
});

// معالج حدث لإرسال نموذج الشعبة
document.getElementById('section-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('section-name').value;
    const students = parseInt(document.getElementById('section-students').value);
    const courseId = parseInt(document.getElementById('section-course').value);
    const doctorId = parseInt(document.getElementById('section-doctor').value);

    if (isNaN(courseId) || isNaN(doctorId) || !courses.some(c => c.id === courseId) || !doctors.some(d => d.id === doctorId)) {
        showMessage('الرجاء اختيار مقرر ودكتور صالحين.', 'error');
        return;
    }

    const newSection = {
        id: Date.now(),
        name,
        students,
        courseId,
        doctorId,
        isScheduled: false
    };
    sections.push(newSection);
    saveData('sections', sections);
    displaySections();
    e.target.reset();
    showMessage('تمت إضافة الشعبة بنجاح!', 'success');
});

// معالج حدث لإرسال نموذج القاعة
document.getElementById('room-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('room-name').value;
    const capacity = parseInt(document.getElementById('room-capacity').value);
    const type = document.getElementById('room-type').value;

    const labForbiddenTimesInput = document.getElementById('lab-forbidden-times').value;
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
    showMessage('تمت إضافة القاعة بنجاح!', 'success');
});

// عند تحميل الصفحة، يتم عرض جميع البيانات الموجودة وملء قوائم الاختيار
document.addEventListener('DOMContentLoaded', () => {
    displayDoctors();
    displayCourses();
    displaySections();
    displayRooms();
    populateSectionsSelects();
});
