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
    { id: 'tuesday', 'name': 'الثلاثاء' },
    { id: 'wednesday', name: 'الأربعاء' },
    { id: 'thursday', name: 'الخميس' },
    { id: 'friday', name: 'الجمعة' },
    { id: 'saturday', name: 'السبت' }
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
    element.classList.add('input-error');
}

function clearValidationError(elementId) {
    const errorSpan = document.getElementById(`${elementId}-error`);
    if (errorSpan) {
        errorSpan.textContent = '';
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('input-error');
        }
    }
}

// --- وظائف العرض (Display Functions) ---

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

        const availableTimesStr = daysOfWeek.slice(0, 5).map(dayInfo => { // فقط أيام العمل الأحد-الخميس للعرض
            const slot = doctor.availableTimes[dayInfo.id];
            return slot && slot.start && slot.end ? `${dayInfo.name}: ${convertTo12HourFormat(slot.start)}-${convertTo12HourFormat(slot.end)}` : '';
        }).filter(Boolean).join(' | ');

        // تحويل الأوقات غير المتاحة إلى نص عرضي
        const unavailableTimesDisplay = (doctor.unavailableTimes && doctor.unavailableTimes.length > 0) 
            ? doctor.unavailableTimes.map(range => {
                const parts = range.split(' ');
                if (parts.length === 3) {
                    // تحويل اسم اليوم من الإنجليزي إلى العربي للعرض
                    const dayName = daysOfWeek.find(d => d.id === parts[0]);
                    return `${dayName ? dayName.name : parts[0]} ${convertTo12HourFormat(parts[1])}-${convertTo12HourFormat(parts[2])}`;
                }
                return range;
            }).join(' | ') 
            : 'لا يوجد';

        doctorCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${doctor.name}</div>
                <div class="item-actions">
                    <button onclick="duplicateItem('doctors', ${doctor.id})" class="btn btn-primary btn-sm"><i class="fas fa-copy"></i> تكرار</button>
                    <button onclick="editItem('doctors', ${doctor.id})" class="btn btn-warning btn-sm"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteItem('doctors', ${doctor.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
            <div class="item-details">
                <div class="item-detail"><strong>الساعات الأسبوعية:</strong> ${doctor.weeklyHours}</div>
                <div class="item-detail"><strong>الأوقات المتاحة:</strong> ${availableTimesStr || 'غير محدد'}</div>
                <div class="item-detail"><strong>أوقات غير مناسبة:</strong> ${unavailableTimesDisplay}</div>
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
                    <button onclick="duplicateItem('courses', ${course.id})" class="btn btn-primary btn-sm"><i class="fas fa-copy"></i> تكرار</button>
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
                    <button onclick="duplicateItem('sections', ${section.id})" class="btn btn-primary btn-sm"><i class="fas fa-copy"></i> تكرار</button>
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

        // تحويل أوقات المعامل الممنوعة إلى نص عرضي
        const forbiddenTimesDisplay = (room.forbiddenTimes && room.forbiddenTimes.length > 0)
            ? room.forbiddenTimes.map(range => {
                const parts = range.split(' ');
                if (parts.length === 3) {
                    const dayName = daysOfWeek.find(d => d.id === parts[0]);
                    return `${dayName ? dayName.name : parts[0]} ${convertTo12HourFormat(parts[1])}-${convertTo12HourFormat(parts[2])}`;
                }
                return range;
            }).join(' | ')
            : 'لا يوجد';

        roomCard.innerHTML = `
            <div class="item-header">
                <div class="item-title">${room.name}</div>
                <div class="item-actions">
                    <button onclick="duplicateItem('rooms', ${room.id})" class="btn btn-primary btn-sm"><i class="fas fa-copy"></i> تكرار</button>
                    <button onclick="editItem('rooms', ${room.id})" class="btn btn-warning btn-sm"><i class="fas fa-edit"></i> تعديل</button>
                    <button onclick="deleteItem('rooms', ${room.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> حذف</button>
                </div>
            </div>
            <div class="item-details">
                <div class="item-detail"><strong>السعة:</strong> ${room.capacity}</div>
                <div class="item-detail"><strong>النوع:</strong> ${room.type === 'classroom' ? 'قاعة دراسية' : room.type === 'lab' ? 'معمل' : 'قاعة تدريب'}</div>
                <div class="item-detail"><strong>أوقات ممنوعة:</strong> ${forbiddenTimesDisplay}</div>
            </div>
        `;
        roomsListDiv.appendChild(roomCard);
    });
};

// --- وظائف التعديل والحذف والتكرار والملء (Edit, Delete, Duplicate, Populate) ---

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

            saveData(saveKey, newCollection);
            displayFn();
            populateSectionsSelects();
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

    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.dataset.tab === `${type}-tab`) {
            button.click();
        }
    });

    if (type === 'doctors') {
        itemToEdit = doctors.find(d => d.id === idToEdit);
        formElement = document.getElementById('doctor-form');
        submitButton = document.getElementById('doctor-form-submit-btn');
        if (itemToEdit) {
            document.getElementById('doctor-name').value = itemToEdit.name;
            document.getElementById('doctor-hours').value = itemToEdit.weeklyHours;
            daysOfWeek.slice(0, 5).forEach(dayInfo => {
                const startInput = document.getElementById(`${dayInfo.id}-start`);
                const endInput = document.getElementById(`${dayInfo.id}-end`);
                if (startInput && endInput) {
                    startInput.value = itemToEdit.availableTimes[dayInfo.id]?.start || '';
                    endInput.value = itemToEdit.availableTimes[dayInfo.id]?.end || '';
                }
            });
            populateDynamicTimeRanges(itemToEdit.unavailableTimes, 'doctor');
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
            populateDynamicTimeRanges(itemToEdit.forbiddenTimes, 'lab');
        }
    }
    
    if (itemToEdit) {
        submitButton.textContent = 'حفظ التعديلات';
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('btn-warning');
    }
};

window.duplicateItem = (type, idToDuplicate) => {
    let itemToDuplicate;
    let formElement;
    let submitButton;

    resetFormToAddMode(type); // Reset form and editing state

    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.dataset.tab === `${type}-tab`) {
            button.click();
        }
    });

    if (type === 'doctors') {
        itemToDuplicate = doctors.find(d => d.id === idToDuplicate);
        formElement = document.getElementById('doctor-form');
        submitButton = document.getElementById('doctor-form-submit-btn');
        if (itemToDuplicate) {
            document.getElementById('doctor-name').value = itemToDuplicate.name + ' (نسخة)';
            document.getElementById('doctor-hours').value = itemToDuplicate.weeklyHours;
            daysOfWeek.slice(0, 5).forEach(dayInfo => {
                const startInput = document.getElementById(`${dayInfo.id}-start`);
                const endInput = document.getElementById(`${dayInfo.id}-end`);
                if (startInput && endInput) {
                    startInput.value = itemToDuplicate.availableTimes[dayInfo.id]?.start || '';
                    endInput.value = itemToDuplicate.availableTimes[dayInfo.id]?.end || '';
                }
            });
            populateDynamicTimeRanges(itemToDuplicate.unavailableTimes, 'doctor');
        }
    } else if (type === 'courses') {
        itemToDuplicate = courses.find(c => c.id === idToDuplicate);
        formElement = document.getElementById('course-form');
        submitButton = document.getElementById('course-form-submit-btn');
        if (itemToDuplicate) {
            document.getElementById('course-name').value = itemToDuplicate.name + ' (نسخة)';
            document.getElementById('course-code').value = itemToDuplicate.code + 'CP'; // Example suffix
            document.getElementById('course-hours').value = itemToDuplicate.hours;
            document.getElementById('course-type').value = itemToDuplicate.type;
            document.getElementById('course-requires-lab').checked = itemToDuplicate.requiresLab;
        }
    } else if (type === 'sections') {
        itemToDuplicate = sections.find(s => s.id === idToDuplicate);
        formElement = document.getElementById('section-form');
        submitButton = document.getElementById('section-form-submit-btn');
        if (itemToDuplicate) {
            document.getElementById('section-name').value = itemToDuplicate.name + ' (نسخة)';
            document.getElementById('section-students').value = itemToDuplicate.students;
            populateSectionsSelects();
            document.getElementById('section-course').value = itemToDuplicate.courseId;
            document.getElementById('section-doctor').value = itemToDuplicate.doctorId;
        }
    } else if (type === 'rooms') {
        itemToDuplicate = rooms.find(r => r.id === idToDuplicate);
        formElement = document.getElementById('room-form');
        submitButton = document.getElementById('room-form-submit-btn');
        if (itemToDuplicate) {
            document.getElementById('room-name').value = itemToDuplicate.name + ' (نسخة)';
            document.getElementById('room-capacity').value = itemToDuplicate.capacity;
            document.getElementById('room-type').value = itemToDuplicate.type;
            populateDynamicTimeRanges(itemToDuplicate.forbiddenTimes, 'lab');
        }
    }
    
    if (itemToDuplicate) {
        showMessage('تم ملء النموذج ببيانات مكررة. يمكنك الآن تعديلها وإضافتها كعنصر جديد.', 'info', 5000);
    }
};

const resetFormToAddMode = (type) => {
    editingItemId = null;
    editingItemType = null;
    let submitButton;
    if (type === 'doctors') {
        submitButton = document.getElementById('doctor-form-submit-btn');
        if (submitButton) submitButton.textContent = 'إضافة دكتور';
        populateDynamicTimeRanges([], 'doctor'); // Clear dynamic times
    }
    else if (type === 'courses') {
        submitButton = document.getElementById('course-form-submit-btn');
        if (submitButton) submitButton.textContent = 'إضافة مقرر';
    }
    else if (type === 'sections') {
        submitButton = document.getElementById('section-form-submit-btn');
        if (submitButton) submitButton.textContent = 'إضافة شعبة';
        document.getElementById('section-name').value = ''; // مسح حقل اسم الشعبة الفردي
        document.getElementById('num-sections-to-generate').value = '1'; // إعادة ضبط حقل توليد الشعب
    }
    else if (type === 'rooms') {
        submitButton = document.getElementById('room-form-submit-btn');
        if (submitButton) submitButton.textContent = 'إضافة قاعة';
        populateDynamicTimeRanges([], 'lab'); // Clear dynamic times
    }
    if (submitButton) {
        submitButton.classList.add('btn-primary');
        submitButton.classList.remove('btn-warning');
    }
};

const populateSectionsSelects = () => {
    const sectionCourseSelect = document.getElementById('section-course');
    const sectionDoctorSelect = document.getElementById('section-doctor');

    const currentCourseId = sectionCourseSelect.value;
    const currentDoctorId = sectionDoctorSelect.value;

    sectionCourseSelect.innerHTML = '<option value="">اختر مقررًا</option>';
    sectionDoctorSelect.innerHTML = '<option value="">اختر دكتورًا</option>';

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

    if (editingItemType === 'sections' && editingItemId) {
        const currentSection = sections.find(s => s.id === editingItemId);
        if (currentSection) {
            sectionCourseSelect.value = currentSection.courseId;
            sectionDoctorSelect.value = currentSection.doctorId;
        }
    } else {
        if (currentCourseId && sectionCourseSelect.querySelector(`option[value="${currentCourseId}"]`)) {
            sectionCourseSelect.value = currentCourseId;
        }
        if (currentDoctorId && sectionDoctorSelect.querySelector(`option[value="${currentDoctorId}"]`)) {
            sectionDoctorSelect.value = currentDoctorId;
        }
    }
};

// --- وظائف لإدارة مدخلات الأوقات الديناميكية (جديد) ---
const doctorUnavailableRanges = []; // لتخزين النطاقات المؤقتة للدكتور
const labForbiddenRanges = [];     // لتخزين النطاقات المؤقتة للمعمل

const getDayNameFromId = (id) => {
    const day = daysOfWeek.find(d => d.id === id);
    return day ? day.name : id;
};

const populateDynamicTimeRanges = (ranges, type) => {
    let container;
    let tempArray;
    if (type === 'doctor') {
        container = document.getElementById('doctor-unavailable-times-list');
        tempArray = doctorUnavailableRanges;
    } else { // type === 'lab'
        container = document.getElementById('lab-forbidden-times-list');
        tempArray = labForbiddenRanges;
    }

    tempArray.length = 0;
    if (ranges) {
        ranges.forEach(range => tempArray.push(range));
    }

    renderDynamicTimeRanges(type);
};

const renderDynamicTimeRanges = (type) => {
    let container;
    let tempArray;
    if (type === 'doctor') {
        container = document.getElementById('doctor-unavailable-times-list');
        tempArray = doctorUnavailableRanges;
    } else { // type === 'lab'
        container = document.getElementById('lab-forbidden-times-list');
        tempArray = labForbiddenRanges;
    }
    container.innerHTML = ''; // Clear container

    if (tempArray.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 10px; margin-top: 0;"><p style="font-size: 0.9rem;"><i class="fas fa-info-circle"></i> لا توجد أوقات مضافة بعد.</p></div>';
        return;
    }

    tempArray.forEach((range, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'dynamic-time-range-item';
        
        const parts = range.split(' ');
        let displayText = range;
        if (parts.length === 3) { // Format: "day HH:MM-HH:MM"
            displayText = `${getDayNameFromId(parts[0])} ${convertTo12HourFormat(parts[1])}-${convertTo12HourFormat(parts[2])}`;
        }

        itemDiv.innerHTML = `
            <span>${displayText}</span>
            <button type="button" class="delete-btn" onclick="removeDynamicTimeRange('${type}', ${index})"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(itemDiv);
    });
};

window.removeDynamicTimeRange = (type, index) => {
    let tempArray;
    if (type === 'doctor') {
        tempArray = doctorUnavailableRanges;
    } else { // type === 'lab'
        tempArray = labForbiddenRanges;
    }
    tempArray.splice(index, 1);
    renderDynamicTimeRanges(type);
};

const addDynamicTimeRange = (type) => {
    let daySelectId, startInputId, endInputId, tempArray;
    if (type === 'doctor') {
        daySelectId = 'add-doctor-unavailable-day';
        startInputId = 'add-doctor-unavailable-start';
        endInputId = 'add-doctor-unavailable-end';
        tempArray = doctorUnavailableRanges;
    } else { // type === 'lab'
        daySelectId = 'add-lab-forbidden-day';
        startInputId = 'add-lab-forbidden-start';
        endInputId = 'add-lab-forbidden-end';
        tempArray = labForbiddenRanges;
    }

    const day = document.getElementById(daySelectId).value;
    const start = document.getElementById(startInputId).value;
    const end = document.getElementById(endInputId).value;

    if (!day || !start || !end) {
        showMessage('الرجاء تعبئة اليوم ووقت البداية والنهاية.', 'warning');
        return;
    }
    if (timeToMinutes(start) === -1 || timeToMinutes(end) === -1 || timeToMinutes(start) >= timeToMinutes(end)) {
        showMessage('وقت النهاية يجب أن يكون بعد وقت البداية.', 'warning');
        return;
    }

    const newRange = `${day} ${start}-${end}`;
    if (tempArray.includes(newRange)) {
        showMessage('هذه الفترة الزمنية مضافة بالفعل.', 'warning');
        return;
    }
    tempArray.push(newRange);
    renderDynamicTimeRanges(type);

    document.getElementById(daySelectId).value = '';
    document.getElementById(startInputId).value = '';
    document.getElementById(endInputId).value = '';
};


// --- وظيفة إنشاء شُعب متعددة تلقائياً ---
const generateMultipleSections = () => {
    let isValid = true;
    clearValidationError('num-sections-to-generate'); // مسح أي أخطاء سابقة
    
    // التحقق من أن حقول المقرر والدكتور وعدد الطلاب مملوءة في نموذج الشعبة الرئيسي
    const students = parseInt(document.getElementById('section-students').value);
    const courseId = parseInt(document.getElementById('section-course').value);
    const doctorId = parseInt(document.getElementById('section-doctor').value);
    const numSectionsToGenerate = parseInt(document.getElementById('num-sections-to-generate').value);

    if (isNaN(students) || students <= 0) { showValidationError('section-students', 'عدد الطلاب مطلوب.'); isValid = false; }
    if (isNaN(courseId) || document.getElementById('section-course').value === '') { showValidationError('section-course', 'المقرر مطلوب.'); isValid = false; }
    if (isNaN(doctorId) || document.getElementById('section-doctor').value === '') { showValidationError('section-doctor', 'الدكتور مطلوب.'); isValid = false; }
    if (isNaN(numSectionsToGenerate) || numSectionsToGenerate <= 0) { showValidationError('num-sections-to-generate', 'عدد الشُعب يجب أن يكون رقماً موجباً.'); isValid = false; }

    if (!isValid) {
        showMessage('الرجاء تعبئة حقول "عدد الطلاب" و "المقرر" و "الدكتور" و "عدد الشُعب المراد إنشاؤها" بشكل صحيح.', 'error', 7000);
        return;
    }

    let sectionsAddedCount = 0;
    for (let i = 1; i <= numSectionsToGenerate; i++) {
        const newSection = {
            id: Date.now() + i, // استخدام Date.now() + i لضمان معرف فريد لكل شعبة
            name: `الشعبة ${i}`,
            students: students,
            courseId: courseId,
            doctorId: doctorId,
            isScheduled: false
        };
        sections.push(newSection);
        sectionsAddedCount++;
    }
    saveData('sections', sections);
    displaySections();
    populateSectionsSelects();
    showMessage(`تمت إضافة ${sectionsAddedCount} شُعب جديدة بنجاح!`, 'success');

    // إعادة ضبط حقل عدد الشعب فقط بعد الإنشاء التلقائي
    document.getElementById('num-sections-to-generate').value = '1';
};


// --- معالجات الأحداث (Event Handlers) ---

document.getElementById('doctor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;
    document.querySelectorAll('#doctor-form .field-error').forEach(span => span.textContent = '');
    document.querySelectorAll('#doctor-form .input-error').forEach(el => el.classList.remove('input-error'));

    if (document.getElementById('doctor-name').value.trim() === '') { showValidationError('doctor-name', 'اسم الدكتور مطلوب.'); isValid = false; }
    const hours = parseInt(document.getElementById('doctor-hours').value);
    if (isNaN(hours) || hours <= 0) { showValidationError('doctor-hours', 'عدد ساعات العمل يجب أن يكون رقماً موجباً.'); isValid = false; }

    daysOfWeek.slice(0, 5).forEach(dayInfo => {
        const startInput = document.getElementById(`${dayInfo.id}-start`);
        const endInput = document.getElementById(`${dayInfo.id}-end`);
        if (startInput && endInput && startInput.value && endInput.value) {
            if (timeToMinutes(startInput.value) === -1 || timeToMinutes(endInput.value) === -1 || timeToMinutes(startInput.value) >= timeToMinutes(endInput.value)) {
                showValidationError(startInput.id, 'وقت النهاية يجب أن يكون بعد وقت البداية.');
                isValid = false;
            }
        } else if (startInput && !endInput.value || !startInput.value && endInput.value) {
            showValidationError(startInput.id, 'الرجاء إدخال وقت البداية والنهاية لليوم.');
            isValid = false;
        }
    });

    if (!isValid) {
        showMessage('الرجاء تصحيح الأخطاء في نموذج الدكاترة.', 'error');
        return;
    }

    const name = document.getElementById('doctor-name').value;
    const weeklyHours = parseInt(document.getElementById('doctor-hours').value);
    const availableTimes = {};
    daysOfWeek.slice(0, 5).forEach(dayInfo => {
        const startInput = document.getElementById(`${dayInfo.id}-start`);
        const endInput = document.getElementById(`${dayInfo.id}-end`);
        if (startInput && endInput && startInput.value && endInput.value) {
            availableTimes[dayInfo.id] = { start: startInput.value, end: endInput.value };
        }
    });
    const unavailableTimes = [...doctorUnavailableRanges]; 

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
    document.querySelectorAll('#course-form .field-error').forEach(span => span.textContent = '');
    document.querySelectorAll('#course-form .input-error').forEach(el => el.classList.remove('input-error'));

    if (document.getElementById('course-name').value.trim() === '') { showValidationError('course-name', 'اسم المقرر مطلوب.'); isValid = false; }
    if (document.getElementById('course-code').value.trim() === '') { showValidationError('course-code', 'رمز المقرر مطلوب.'); isValid = false; }
    const hours = parseInt(document.getElementById('course-hours').value);
    if (isNaN(hours) || hours <= 0) { showValidationError('course-hours', 'عدد ساعات المقرر يجب أن يكون رقماً موجباً.'); isValid = false; }

    if (!isValid) {
        showMessage('الرجاء تصحيح الأخطاء في نموذج المقررات.', 'error');
        return;
    }
    
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
    document.querySelectorAll('#section-form .field-error').forEach(span => span.textContent = '');
    document.querySelectorAll('#section-form .input-error').forEach(el => el.classList.remove('input-error'));

    // حقل اسم الشعبة أصبح اختيارياً إذا كنت تستخدم توليد الشعب المتعددة
    const sectionNameInput = document.getElementById('section-name');
    if (sectionNameInput.value.trim() === '' && !document.getElementById('generate-multiple-sections-btn').clicked) { 
        showValidationError('section-name', 'اسم الشعبة مطلوب.'); 
        isValid = false; 
    }
    
    const students = parseInt(document.getElementById('section-students').value);
    if (isNaN(students) || students <= 0) { showValidationError('section-students', 'عدد الطلاب يجب أن يكون رقماً موجباً.'); isValid = false; }
    if (document.getElementById('section-course').value === '') { showValidationError('section-course', 'الرجاء اختيار مقرر.'); isValid = false; }
    if (document.getElementById('section-doctor').value === '') { showValidationError('section-doctor', 'الرجاء اختيار دكتور.'); isValid = false; }

    if (!isValid) {
        showMessage('الرجاء تصحيح الأخطاء في نموذج الشُعب.', 'error');
        return;
    }
    
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
    document.querySelectorAll('#room-form .field-error').forEach(span => span.textContent = '');
    document.querySelectorAll('#room-form .input-error').forEach(el => el.classList.remove('input-error'));

    if (document.getElementById('room-name').value.trim() === '') { showValidationError('room-name', 'اسم القاعة مطلوب.'); isValid = false; }
    const capacity = parseInt(document.getElementById('room-capacity').value);
    if (isNaN(capacity) || capacity <= 0) { showValidationError('room-capacity', 'سعة القاعة يجب أن يكون رقماً موجباً.'); isValid = false; }
    if (document.getElementById('room-type').value === '') { showValidationError('room-type', 'الرجاء اختيار نوع القاعة.'); isValid = false; }

    if (!isValid) {
        showMessage('الرجاء تصحيح الأخطاء في نموذج القاعات.', 'error');
        return;
    }
    
    const name = document.getElementById('room-name').value;
    const capacityVal = parseInt(document.getElementById('room-capacity').value);
    const type = document.getElementById('room-type').value;
    const forbiddenTimes = [...labForbiddenRanges]; 

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

// --- Tabs Logic ---
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        const targetTabId = button.dataset.tab;
        document.getElementById(targetTabId).classList.add('active');

        const activeFormId = targetTabId.replace('-tab', '-form');
        const activeForm = document.getElementById(activeFormId);
        if (activeForm) {
            activeForm.reset();
            resetFormToAddMode(activeFormId.replace('-form', 's'));
            document.querySelectorAll(`#${activeFormId} .field-error`).forEach(span => span.textContent = '');
            document.querySelectorAll(`#${activeFormId} .input-error`).forEach(el => el.classList.remove('input-error'));
        }
        populateSectionsSelects();
    });
});

// --- Attach dynamic time range controls ---
// Check if buttons exist before adding listeners
const addDoctorUnavailableBtn = document.getElementById('add-doctor-unavailable-btn');
if (addDoctorUnavailableBtn) {
    addDoctorUnavailableBtn.addEventListener('click', () => addDynamicTimeRange('doctor'));
} else {
    console.warn("Element with ID 'add-doctor-unavailable-btn' not found.");
}

const addLabForbiddenBtn = document.getElementById('add-lab-forbidden-btn');
if (addLabForbiddenBtn) {
    addLabForbiddenBtn.addEventListener('click', () => addDynamicTimeRange('lab'));
} else {
    console.warn("Element with ID 'add-lab-forbidden-btn' not found.");
}


// --- وظائف للأزرار المساعدة (جديد) ---
const smartFillMorningBtn = document.getElementById('smart-fill-morning-btn');
if (smartFillMorningBtn) {
    smartFillMorningBtn.addEventListener('click', () => {
        const defaultStart = "08:00";
        const defaultEnd = "12:00"; // 12:00 PM
        daysOfWeek.slice(0, 5).forEach(dayInfo => { // الأحد إلى الخميس
            document.getElementById(`${dayInfo.id}-start`).value = defaultStart;
            document.getElementById(`${dayInfo.id}-end`).value = defaultEnd;
            clearValidationError(`${dayInfo.id}-start`);
        });
        showMessage('تم ملء أوقات الدوام الصباحي (08:00 صباحاً - 12:00 ظهراً) لكل أيام الأسبوع.', 'info', 5000);
    });
} else {
    console.warn("Element with ID 'smart-fill-morning-btn' not found.");
}


const smartFillFullDayBtn = document.getElementById('smart-fill-full-day-btn');
if (smartFillFullDayBtn) {
    smartFillFullDayBtn.addEventListener('click', () => {
        const defaultStart = "08:00";
        const defaultEnd = "17:00"; // 5:00 PM
        daysOfWeek.slice(0, 5).forEach(dayInfo => { // الأحد إلى الخميس
            document.getElementById(`${dayInfo.id}-start`).value = defaultStart;
            document.getElementById(`${dayInfo.id}-end`).value = defaultEnd;
            clearValidationError(`${dayInfo.id}-start`);
        });
        showMessage('تم ملء أوقات الدوام الكامل (08:00 صباحاً - 05:00 مساءً) لكل أيام الأسبوع.', 'info', 5000);
    });
} else {
    console.warn("Element with ID 'smart-fill-full-day-btn' not found.");
}


const applyToAllWeekdaysBtn = document.getElementById('apply-to-all-weekdays-btn');
if (applyToAllWeekdaysBtn) {
    applyToAllWeekdaysBtn.addEventListener('click', () => { // Keep this for custom copy
        const sundayStart = document.getElementById('sunday-start').value;
        const sundayEnd = document.getElementById('sunday-end').value;

        if (!sundayStart || !sundayEnd) {
            showMessage('الرجاء إدخال أوقات الأحد أولاً لتطبيقها.', 'warning');
            return;
        }
        if (timeToMinutes(sundayStart) === -1 || timeToMinutes(sundayEnd) === -1 || timeToMinutes(sundayStart) >= timeToMinutes(sundayEnd)) {
            showMessage('وقت نهاية الأحد يجب أن يكون بعد وقت بدايته.', 'warning');
            return;
        }

        daysOfWeek.slice(1, 5).forEach(dayInfo => { // من الإثنين إلى الخميس
            document.getElementById(`${dayInfo.id}-start`).value = sundayStart;
            document.getElementById(`${dayInfo.id}-end`).value = sundayEnd;
            clearValidationError(`${dayInfo.id}-start`); // Clear potential errors
        });
        showMessage('تم تطبيق أوقات الأحد على أيام العمل الأخرى.', 'info');
    });
} else {
    console.warn("Element with ID 'apply-to-all-weekdays-btn' not found.");
}


const clearAllAvailableTimesBtn = document.getElementById('clear-all-available-times-btn');
if (clearAllAvailableTimesBtn) {
    clearAllAvailableTimesBtn.addEventListener('click', () => {
        daysOfWeek.slice(0, 5).forEach(dayInfo => { // الأحد إلى الخميس
            document.getElementById(`${dayInfo.id}-start`).value = '';
            document.getElementById(`${dayInfo.id}-end`).value = '';
            clearValidationError(`${dayInfo.id}-start`); // Clear potential errors
        });
        showMessage('تم مسح جميع الأوقات المتاحة.', 'info');
    });
} else {
    console.warn("Element with ID 'clear-all-available-times-btn' not found.");
}

// Event listener لزر إنشاء شُعب تلقائياً
const generateMultipleSectionsBtn = document.getElementById('generate-multiple-sections-btn');
if (generateMultipleSectionsBtn) {
    generateMultipleSectionsBtn.addEventListener('click', generateMultipleSections);
} else {
    console.warn("Element with ID 'generate-multiple-sections-btn' not found.");
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("data-entry.js loaded and DOM content loaded");

    displayDoctors();
    displayCourses();
    displaySections();
    displayRooms();
    populateSectionsSelects();

    const firstTabButton = document.querySelector('.tab-button.active');
    if (firstTabButton) {
        console.log("Activating first tab on load.");
        firstTabButton.click();
    } else {
        console.warn("No active tab button found on load. Ensure first tab has 'active' class.");
    }
});
