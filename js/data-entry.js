// js/data-entry.js

let doctors = getData('doctors');
let courses = getData('courses');
let sections = getData('sections');
let rooms = getData('rooms');

let editingItemId = null;
let editingItemType = null;

const daysOfWeek = [
    { id: 'sunday', name: 'الأحد' },
    { id: 'monday', name: 'الإثنين' },
    { id: 'tuesday', name: 'الثلاثاء' },
    { id: 'wednesday', 'name': 'الأربعاء' },
    { id: 'thursday', name: 'الخميس' }
];

// --- وظائف المساعدة للتحقق من صحة المدخلات ---
function showValidationError(elementId, message) {
    const element = document.getElementById(elementId);
    let errorSpan = document.getElementById(`${elementId}-error`);
    if (!errorSpan) {
        errorSpan = document.createElement('span');
        errorSpan.id = `${elementId}-error`;
        errorSpan.className = 'field-error';
        element.parentNode.insertBefore(errorSpan, element.nextSibling);
    }
    errorSpan.textContent = message;
    element.classList.add('input-error'); // لإضافة تنسيق حدود حمراء مثلاً
}

function clearValidationError(elementId) {
    const errorSpan = document.getElementById(`${elementId}-error`);
    if (errorSpan) {
        errorSpan.textContent = '';
        document.getElementById(elementId).classList.remove('input-error');
    }
}

// --- وظائف العرض (Display Functions) --- (نفس السابق)

const displayDoctors = () => {
    const doctorsListDiv = document.getElementById('doctors-list');
    doctorsListDiv.innerHTML = '';

    if (doctors.length === 0) {
        doctorsListDiv.innerHTML = '<div class="empty-state"><p><i class="fas fa-info-circle"></i> لا توجد بيانات دكاترة بعد.</p></div>';
        return;
    }

    doctors.forEach((doctor) => {
        const doctorCard = document.createElement('div');
        doctorCard.className = 'item-card';

        const availableTimesStr = daysOfWeek.map(dayInfo => {
            const slot = doctor.availableTimes[dayInfo.id];
            return slot && slot.start && slot.end ? `${dayInfo.name}: ${convertTo12HourFormat(slot.start)}-${convertTo12HourFormat(slot.end)}` : '';
        }).filter(Boolean).join(' | ');

        doctorCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${doctor.name}</div>
                <div class="item-actions">
                    <button onclick="editItem('doctors', ${doctor.id})" class="btn btn-warning btn-sm"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteItem('doctors', ${doctor.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
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

const displayCourses = () => {
    const coursesListDiv = document.getElementById('courses-list');
    coursesListDiv.innerHTML = '';

    if (courses.length === 0) {
        coursesListDiv.innerHTML = '<div class="empty-state"><p><i class="fas fa-info-circle"></i> لا توجد بيانات مقررات بعد.</p></div>';
        return;
    }

    courses.forEach((course) => {
        const courseCard = document.createElement('div');
        courseCard.className = 'item-card';
        courseCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${course.name} (${course.code})</div>
                <div class="item-actions">
                    <button onclick="editItem('courses', ${course.id})" class="btn btn-warning btn-sm"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteItem('courses', ${course.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
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

const displaySections = () => {
    const sectionsListDiv = document.getElementById('sections-list');
    sectionsListDiv.innerHTML = '';

    if (sections.length === 0) {
        sectionsListDiv.innerHTML = '<div class="empty-state"><p><i class="fas fa-info-circle"></i> لا توجد بيانات شُعب بعد.</p></div>';
        return;
    }

    sections.forEach((section) => {
        const doctor = doctors.find(d => d.id === section.doctorId);
        const course = courses.find(c => c.id === section.courseId);
        const sectionCard = document.createElement('div');
        sectionCard.className = 'item-card';
        sectionCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${section.name}</div>
                <div class="item-actions">
                    <button onclick="editItem('sections', ${section.id})" class="btn btn-warning btn-sm"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteItem('sections', ${section.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
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

const displayRooms = () => {
    const roomsListDiv = document.getElementById('rooms-list');
    roomsListDiv.innerHTML = '';

    if (rooms.length === 0) {
        roomsListDiv.innerHTML = '<div class="empty-state"><p><i class="fas fa-info-circle"></i> لا توجد بيانات قاعات بعد.</p></div>';
        return;
    }

    rooms.forEach((room) => {
        const roomCard = document.createElement('div');
        roomCard.className = 'item-card';
        roomCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${room.name}</div>
                <div class="item-actions">
                    <button onclick="editItem('rooms', ${room.id})" class="btn btn-warning btn-sm"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteItem('rooms', ${room.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
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

// --- وظائف التعديل والحذف والملء (Edit, Delete, Populate) --- (نفس السابق)

window.deleteItem = (type, idToDelete) => {
    if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
        let collection;
        let displayFn;
        let saveKey;

        if (type === 'doctors') {
            collection = doctors;
            displayFn = displayDoctors;
            saveKey = 'doctors';
        } else if (type === 'courses') {
            collection = courses;
            displayFn = displayCourses;
            saveKey = 'courses';
        } else if (type === 'sections') {
            collection = sections;
            displayFn = displaySections;
            saveKey = 'sections';
        } else if (type === 'rooms') {
            collection = rooms;
            displayFn = displayRooms;
            saveKey = 'rooms';
        } else {
            return;
        }

        const initialLength = collection.length;
        const newCollection = collection.filter(item => item.id !== idToDelete);

        if (newCollection.length < initialLength) {
            if (type === 'doctors') doctors = newCollection;
            else if (type === 'courses') courses = newCollection;
            else if (type === 'sections') sections = newCollection;
            else if (type === 'rooms') rooms = newCollection;

            saveData(saveKey, (type === 'doctors' ? doctors : type === 'courses' ? courses : type === 'sections' ? sections : rooms));
            displayFn();
            populateSectionsSelects(); // تحديث القوائم المنسدلة
            showMessage('تم حذف العنصر بنجاح!', 'success');
        } else {
            showMessage('فشل حذف العنصر. العنصر غير موجود.', 'error');
        }
    }
};

window.editItem = (type, idToEdit) => {
    editingItemId = idToEdit;
    editingItemType = type;
    let itemToEdit;
    let formElement;
    let submitButton;

    if (type === 'doctors') {
        itemToEdit = doctors.find(d => d.id === idToEdit);
        formElement = document.getElementById('doctor-form');
        submitButton = document.getElementById('doctor-form-submit-btn');
        if (itemToEdit) {
            document.getElementById('doctor-name').value = itemToEdit.name;
            document.getElementById('doctor-hours').value = itemToEdit.weeklyHours;
            daysOfWeek.forEach(dayInfo => {
                const startInput = document.querySelector(`[data-day="${dayInfo.id}"][data-type="start"]`);
                const endInput = document.querySelector(`[data-day="${dayInfo.id}"][data-type="end"]`);
                if (startInput && endInput) {
                    startInput.value = itemToEdit.availableTimes[dayInfo.id]?.start || '';
                    endInput.value = itemToEdit.availableTimes[dayInfo.id]?.end || '';
                }
            });
            document.getElementById('doctor-unavailable').value = itemToEdit.unavailableTimes.join(', ');
        }
    } else if (type === 'courses') {
        itemToEdit = courses.find(c => c.id === idToEdit);
        formElement = document.getElementById('course-form');
        submitButton = document.getElementById('course-form-submit-btn');
        if (itemToEdit) {
            document.getElementById('course-name').value = itemToEdit.name;
            document.getElementById('course-code').value = itemToEdit.code;
            document.getElementById('course-hours').value = itemToEdit.hours;
            document.getElementById('course-type').value = itemToEdit.type;
            document.getElementById('course-requires-lab').checked = itemToEdit.requiresLab;
        }
    } else if (type === 'sections') {
        itemToEdit = sections.find(s => s.id === idToEdit);
        formElement = document.getElementById('section-form');
        submitButton = document.getElementById('section-form-submit-btn');
        if (itemToEdit) {
            document.getElementById('section-name').value = itemToEdit.name;
            document.getElementById('section-students').value = itemToEdit.students;
            populateSectionsSelects();
            document.getElementById('section-course').value = itemToEdit.courseId;
            document.getElementById('section-doctor').value = itemToEdit.doctorId;
        }
    } else if (type === 'rooms') {
        itemToEdit = rooms.find(r => r.id === idToEdit);
        formElement = document.getElementById('room-form');
        submitButton = document.getElementById('room-form-submit-btn');
        if (itemToEdit) {
            document.getElementById('room-name').value = itemToEdit.name;
            document.getElementById('room-capacity').value = itemToEdit.capacity;
            document.getElementById('room-type').value = itemToEdit.type;
            document.getElementById('lab-forbidden-times').value = itemToEdit.forbiddenTimes.join(', ');
        }
    }
    
    if (itemToEdit) {
        submitButton.textContent = 'حفظ التعديلات';
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('btn-warning');
        formElement.scrollIntoView({ behavior: 'smooth' });
    }
};

const resetFormToAddMode = (type) => {
    editingItemId = null;
    editingItemType = null;
    let submitButton;
    if (type === 'doctors') {
        submitButton = document.getElementById('doctor-form-submit-btn');
        submitButton.textContent = 'إضافة دكتور';
    } else if (type === 'courses') {
        submitButton = document.getElementById('course-form-submit-btn');
        submitButton.textContent = 'إضافة مقرر';
    } else if (type === 'sections') {
        submitButton = document.getElementById('section-form-submit-btn');
        submitButton.textContent = 'إضافة شعبة';
    } else if (type === 'rooms') {
        submitButton = document.getElementById('room-form-submit-btn');
        submitButton.textContent = 'إضافة قاعة';
    }
    submitButton.classList.add('btn-primary');
    submitButton.classList.remove('btn-warning');
};

const populateSectionsSelects = () => {
    const sectionCourseSelect = document.getElementById('section-course');
    const sectionDoctorSelect = document.getElementById('section-doctor');

    // حفظ القيمة المختارة قبل مسح الخيارات
    const currentCourseId = sectionCourseSelect.value;
    const currentDoctorId = sectionDoctorSelect.value;

    sectionCourseSelect.innerHTML = '<option value="">اختر مقررًا</option>';
    sectionDoctorSelect.innerHTML = '<option value="">اختر دكتورًا</option>'; // Always clear and repopulate

    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = doctor.name;
        sectionDoctorSelect.appendChild(option);
    });

    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        sectionCourseSelect.appendChild(option);
    });

    // إعادة تحديد القيمة المختارة إذا كان في وضع التعديل أو كانت هناك قيمة سابقة
    if (editingItemType === 'sections' && editingItemId) {
        const currentSection = sections.find(s => s.id === editingItemId);
        if (currentSection) {
            sectionCourseSelect.value = currentSection.courseId;
            sectionDoctorSelect.value = currentSection.doctorId;
        }
    } else {
        // حاول إعادة تحديد القيمة إذا كانت موجودة (لمنعه من العودة إلى "اختر...")
        if (currentCourseId && sectionCourseSelect.querySelector(`option[value="${currentCourseId}"]`)) {
            sectionCourseSelect.value = currentCourseId;
        }
        if (currentDoctorId && sectionDoctorSelect.querySelector(`option[value="${currentDoctorId}"]`)) {
            sectionDoctorSelect.value = currentDoctorId;
        }
    }
};

// --- معالجات الأحداث (Event Handlers) ---

// إضافة مستمعين للتحقق من صحة الحقول في الوقت الفعلي
document.getElementById('doctor-name').addEventListener('input', (e) => {
    if (e.target.value.trim() === '') showValidationError('doctor-name', 'اسم الدكتور مطلوب.');
    else clearValidationError('doctor-name');
});
document.getElementById('doctor-hours').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value <= 0) showValidationError('doctor-hours', 'عدد ساعات العمل يجب أن يكون رقماً موجباً.');
    else clearValidationError('doctor-hours');
});
// يمكنك إضافة المزيد من التحققات لحقول الوقت، مثل وقت النهاية بعد وقت البداية

document.getElementById('course-name').addEventListener('input', (e) => {
    if (e.target.value.trim() === '') showValidationError('course-name', 'اسم المقرر مطلوب.');
    else clearValidationError('course-name');
});
document.getElementById('course-code').addEventListener('input', (e) => {
    if (e.target.value.trim() === '') showValidationError('course-code', 'رمز المقرر مطلوب.');
    else clearValidationError('course-code');
});
document.getElementById('course-hours').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value <= 0) showValidationError('course-hours', 'عدد ساعات المقرر يجب أن يكون رقماً موجباً.');
    else clearValidationError('course-hours');
});


document.getElementById('section-name').addEventListener('input', (e) => {
    if (e.target.value.trim() === '') showValidationError('section-name', 'اسم الشعبة مطلوب.');
    else clearValidationError('section-name');
});
document.getElementById('section-students').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value <= 0) showValidationError('section-students', 'عدد الطلاب يجب أن يكون رقماً موجباً.');
    else clearValidationError('section-students');
});
document.getElementById('section-course').addEventListener('change', (e) => {
    if (e.target.value === '') showValidationError('section-course', 'الرجاء اختيار مقرر.');
    else clearValidationError('section-course');
});
document.getElementById('section-doctor').addEventListener('change', (e) => {
    if (e.target.value === '') showValidationError('section-doctor', 'الرجاء اختيار دكتور.');
    else clearValidationError('section-doctor');
});


document.getElementById('room-name').addEventListener('input', (e) => {
    if (e.target.value.trim() === '') showValidationError('room-name', 'اسم القاعة مطلوب.');
    else clearValidationError('room-name');
});
document.getElementById('room-capacity').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value <= 0) showValidationError('room-capacity', 'سعة القاعة يجب أن تكون رقماً موجباً.');
    else clearValidationError('room-capacity');
});
document.getElementById('room-type').addEventListener('change', (e) => {
    if (e.target.value === '') showValidationError('room-type', 'الرجاء اختيار نوع القاعة.');
    else clearValidationError('room-type');
});


// ربط معالجات حدث الإرسال (Submit handlers)

document.getElementById('doctor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    // إعادة التحقق قبل الإرسال النهائي
    let isValid = true;
    if (document.getElementById('doctor-name').value.trim() === '') { showValidationError('doctor-name', 'اسم الدكتور مطلوب.'); isValid = false; } else clearValidationError('doctor-name');
    const hours = parseInt(document.getElementById('doctor-hours').value);
    if (isNaN(hours) || hours <= 0) { showValidationError('doctor-hours', 'عدد ساعات العمل يجب أن يكون رقماً موجباً.'); isValid = false; } else clearValidationError('doctor-hours');

    // تحقق من أن الأوقات المتاحة منطقية (وقت النهاية بعد وقت البداية)
    daysOfWeek.forEach(dayInfo => {
        const startInput = document.querySelector(`[data-day="${dayInfo.id}"][data-type="start"]`);
        const endInput = document.querySelector(`[data-day="${dayInfo.id}"][data-type="end"]`);
        if (startInput && endInput && startInput.value && endInput.value) {
            if (timeToMinutes(startInput.value) >= timeToMinutes(endInput.value)) {
                showValidationError(startInput.id, 'وقت النهاية يجب أن يكون بعد وقت البداية.');
                isValid = false;
            } else {
                clearValidationError(startInput.id);
            }
        }
    });

    if (!isValid) {
        showMessage('الرجاء تصحيح الأخطاء في النموذج.', 'error');
        return;
    }

    // ... (بقية منطق الإرسال من الكود السابق) ...
    const name = document.getElementById('doctor-name').value;
    const weeklyHours = parseInt(document.getElementById('doctor-hours').value);
    const availableTimes = {};
    daysOfWeek.forEach(dayInfo => {
        const startInput = document.querySelector(`[data-day="${dayInfo.id}"][data-type="start"]`);
        const endInput = document.querySelector(`[data-day="${dayInfo.id}"][data-type="end"]`);
        if (startInput && endInput && startInput.value && endInput.value) {
            availableTimes[dayInfo.id] = { start: startInput.value, end: endInput.value };
        }
    });
    const unavailableTimesInput = document.getElementById('doctor-unavailable').value;
    const unavailableTimes = unavailableTimesInput ? unavailableTimesInput.split(',').map(t => t.trim()) : [];

    if (editingItemId && editingItemType === 'doctors') {
        const index = doctors.findIndex(d => d.id === editingItemId);
        if (index !== -1) {
            doctors[index] = { ...doctors[index], name, weeklyHours, availableTimes, unavailableTimes };
            saveData('doctors', doctors);
            displayDoctors();
            populateSectionsSelects();
            showMessage('تم تعديل الدكتور بنجاح!', 'success');
        } else {
            showMessage('فشل تعديل الدكتور.', 'error');
        }
    } else {
        const newDoctor = { id: Date.now(), name, weeklyHours, availableTimes, unavailableTimes, assignedHours: 0 };
        doctors.push(newDoctor);
        saveData('doctors', doctors);
        displayDoctors();
        populateSectionsSelects();
        showMessage('تمت إضافة الدكتور بنجاح!', 'success');
    }
    e.target.reset();
    resetFormToAddMode('doctors');
});

document.getElementById('course-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;
    if (document.getElementById('course-name').value.trim() === '') { showValidationError('course-name', 'اسم المقرر مطلوب.'); isValid = false; } else clearValidationError('course-name');
    if (document.getElementById('course-code').value.trim() === '') { showValidationError('course-code', 'رمز المقرر مطلوب.'); isValid = false; } else clearValidationError('course-code');
    const hours = parseInt(document.getElementById('course-hours').value);
    if (isNaN(hours) || hours <= 0) { showValidationError('course-hours', 'عدد ساعات المقرر يجب أن يكون رقماً موجباً.'); isValid = false; } else clearValidationError('course-hours');

    if (!isValid) {
        showMessage('الرجاء تصحيح الأخطاء في النموذج.', 'error');
        return;
    }
    
    // ... (بقية منطق الإرسال من الكود السابق) ...
    const name = document.getElementById('course-name').value;
    const code = document.getElementById('course-code').value;
    const type = document.getElementById('course-type').value;
    const requiresLab = document.getElementById('course-requires-lab').checked;

    if (editingItemId && editingItemType === 'courses') {
        const index = courses.findIndex(c => c.id === editingItemId);
        if (index !== -1) {
            courses[index] = { ...courses[index], name, code, hours, type, requiresLab };
            saveData('courses', courses);
            displayCourses();
            populateSectionsSelects();
            showMessage('تم تعديل المقرر بنجاح!', 'success');
        } else {
            showMessage('فشل تعديل المقرر.', 'error');
        }
    } else {
        const newCourse = { id: Date.now(), name, code, hours, type, requiresLab, assignedSections: [] };
        courses.push(newCourse);
        saveData('courses', courses);
        displayCourses();
        populateSectionsSelects();
        showMessage('تمت إضافة المقرر بنجاح!', 'success');
    }
    e.target.reset();
    resetFormToAddMode('courses');
});

document.getElementById('section-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;
    if (document.getElementById('section-name').value.trim() === '') { showValidationError('section-name', 'اسم الشعبة مطلوب.'); isValid = false; } else clearValidationError('section-name');
    const students = parseInt(document.getElementById('section-students').value);
    if (isNaN(students) || students <= 0) { showValidationError('section-students', 'عدد الطلاب يجب أن يكون رقماً موجباً.'); isValid = false; } else clearValidationError('section-students');
    if (document.getElementById('section-course').value === '') { showValidationError('section-course', 'الرجاء اختيار مقرر.'); isValid = false; } else clearValidationError('section-course');
    if (document.getElementById('section-doctor').value === '') { showValidationError('section-doctor', 'الرجاء اختيار دكتور.'); isValid = false; } else clearValidationError('section-doctor');

    if (!isValid) {
        showMessage('الرجاء تصحيح الأخطاء في النموذج.', 'error');
        return;
    }
    
    // ... (بقية منطق الإرسال من الكود السابق) ...
    const name = document.getElementById('section-name').value;
    const studentsVal = parseInt(document.getElementById('section-students').value);
    const courseId = parseInt(document.getElementById('section-course').value);
    const doctorId = parseInt(document.getElementById('section-doctor').value);

    if (editingItemId && editingItemType === 'sections') {
        const index = sections.findIndex(s => s.id === editingItemId);
        if (index !== -1) {
            sections[index] = { ...sections[index], name, students: studentsVal, courseId, doctorId };
            saveData('sections', sections);
            displaySections();
            showMessage('تم تعديل الشعبة بنجاح!', 'success');
        } else {
            showMessage('فشل تعديل الشعبة.', 'error');
        }
    } else {
        const newSection = { id: Date.now(), name, students: studentsVal, courseId, doctorId, isScheduled: false };
        sections.push(newSection);
        saveData('sections', sections);
        displaySections();
        showMessage('تمت إضافة الشعبة بنجاح!', 'success');
    }
    e.target.reset();
    resetFormToAddMode('sections');
});

document.getElementById('room-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;
    if (document.getElementById('room-name').value.trim() === '') { showValidationError('room-name', 'اسم القاعة مطلوب.'); isValid = false; } else clearValidationError('room-name');
    const capacity = parseInt(document.getElementById('room-capacity').value);
    if (isNaN(capacity) || capacity <= 0) { showValidationError('room-capacity', 'سعة القاعة يجب أن تكون رقماً موجباً.'); isValid = false; } else clearValidationError('room-capacity');
    if (document.getElementById('room-type').value === '') { showValidationError('room-type', 'الرجاء اختيار نوع القاعة.'); isValid = false; } else clearValidationError('room-type');

    if (!isValid) {
        showMessage('الرجاء تصحيح الأخطاء في النموذج.', 'error');
        return;
    }
    
    // ... (بقية منطق الإرسال من الكود السابق) ...
    const name = document.getElementById('room-name').value;
    const capacityVal = parseInt(document.getElementById('room-capacity').value);
    const type = document.getElementById('room-type').value;
    const labForbiddenTimesInput = document.getElementById('lab-forbidden-times').value;
    const forbiddenTimes = labForbiddenTimesInput ? labForbiddenTimesInput.split(',').map(t => t.trim()) : [];

    if (editingItemId && editingItemType === 'rooms') {
        const index = rooms.findIndex(r => r.id === editingItemId);
        if (index !== -1) {
            rooms[index] = { ...rooms[index], name, capacity: capacityVal, type, forbiddenTimes };
            saveData('rooms', rooms);
            displayRooms();
            showMessage('تم تعديل القاعة بنجاح!', 'success');
        } else {
            showMessage('فشل تعديل القاعة.', 'error');
        }
    } else {
        const newRoom = { id: Date.now(), name, capacity: capacityVal, type, forbiddenTimes };
        rooms.push(newRoom);
        saveData('rooms', rooms);
        displayRooms();
        showMessage('تمت إضافة القاعة بنجاح!', 'success');
    }
    e.target.reset();
    resetFormToAddMode('rooms');
});

document.addEventListener('DOMContentLoaded', () => {
    displayDoctors();
    displayCourses();
    displaySections();
    displayRooms();
    populateSectionsSelects();
});
