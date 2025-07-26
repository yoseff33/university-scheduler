// js/doctor-view.js

// جلب البيانات من LocalStorage
let doctors = getData('doctors');
let rooms = getData('rooms'); // نحتاج القاعات لعرضها في نموذج البلاغات
let doctorSchedules = getData('doctorSchedules'); // الجداول المجدولة للدكاترة

// أيام الأسبوع للواجهة
const daysArabic = {
    sunday: "الأحد",
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس"
};
const timeSlots = [
    "08:00", "08:50", "09:40", "10:30", "11:20", "12:10", "13:00", "13:50", "14:40", "15:30", "16:20", "17:10"
];
const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];

/**
 * وظيفة لملء قائمة الدكاترة المنسدلة.
 */
const populateDoctorSelect = () => {
    const doctorSelect = document.getElementById('doctor-select');
    doctorSelect.innerHTML = '<option value="">-- اختر دكتور --</option>'; // الخيار الافتراضي

    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = doctor.name;
        doctorSelect.appendChild(option);
    });
};

/**
 * وظيفة لعرض جدول دكتور محدد.
 * @param {number} doctorId - معرف الدكتور المراد عرض جدوله.
 */
const displayDoctorSchedule = (doctorId) => {
    const scheduleDisplayDiv = document.getElementById('doctor-schedule-display');
    const selectedDoctorNameElem = document.getElementById('selected-doctor-name');
    const doctorScheduleBody = document.getElementById('doctor-schedule-body');

    scheduleDisplayDiv.classList.add('hidden'); // إخفاء الجدول افتراضيًا
    doctorScheduleBody.innerHTML = ''; // مسح المحتوى القديم

    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor || !doctorSchedules[doctorId]) {
        selectedDoctorNameElem.textContent = 'الرجاء اختيار دكتور.';
        return;
    }

    selectedDoctorNameElem.textContent = `جدول الدكتور: ${doctor.name}`;
    scheduleDisplayDiv.classList.remove('hidden'); // إظهار الجدول

    const occupiedCells = new Set(); // لتتبع الخلايا المدمجة (المشغولة بواسطة محاضرات طويلة)

    timeSlots.forEach(timeSlot => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="time-slot-header">${timeSlot}</td>`;

        days.forEach(day => {
            const cellId = `${doctorId}-${day}-${timeSlot}`;
            if (occupiedCells.has(cellId)) {
                return; // لا نضيف TD إذا كانت الخلية مدمجة بالفعل
            }

            const td = document.createElement('td');
            td.className = 'schedule-cell'; // يمكن إضافة كلاس خاص بالخلايا هنا

            const lecture = doctorSchedules[doctorId][day][timeSlot];
            if (lecture) {
                const lectureType = lecture.type;
                const lectureDurationMinutes = lectureType === 'short' ? 50 : 100;
                const slotsOccupied = Math.ceil(lectureDurationMinutes / 50);

                if (lectureType === 'long' && slotsOccupied > 1) {
                    td.rowSpan = slotsOccupied;
                    for (let i = 1; i < slotsOccupied; i++) {
                        const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + i;
                        if (nextTimeSlotIndex < timeSlots.length) {
                            occupiedCells.add(`${doctorId}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                        }
                    }
                }

                td.innerHTML = `
                    <div class="lecture-display-card">
                        <p class="lecture-course-name">${lecture.courseName}</p>
                        <p class="lecture-section-name">${lecture.sectionName}</p>
                        <p class="lecture-room-name">${lecture.roomName}</p>
                        <p class="lecture-type-info">${lectureType === 'short' ? 'قصيرة' : 'طويلة'}</p>
                    </div>
                `;
                td.classList.add('has-lecture');
            } else {
                td.textContent = ''; // خلية فارغة
            }
            tr.appendChild(td);
        });
        doctorScheduleBody.appendChild(tr);
    });
};

// معالج حدث عند تغيير اختيار الدكتور
document.getElementById('doctor-select').addEventListener('change', (e) => {
    const selectedDoctorId = parseInt(e.target.value);
    if (!isNaN(selectedDoctorId) && selectedDoctorId > 0) {
        displayDoctorSchedule(selectedDoctorId);
    } else {
        document.getElementById('doctor-schedule-display').classList.add('hidden');
        document.getElementById('selected-doctor-name').textContent = 'الرجاء اختيار دكتور.';
    }
});

/**
 * وظيفة لملء قائمة القاعات المنسدلة في نموذج بلاغ المشاكل.
 */
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

// معالج حدث لإرسال نموذج بلاغ مشاكل القاعات
document.getElementById('room-issue-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const roomId = parseInt(document.getElementById('issue-room').value);
    const issueType = document.getElementById('issue-type').value;
    const issueDescription = document.getElementById('issue-description').value;

    if (isNaN(roomId) || !rooms.some(r => r.id === roomId)) {
        alert('الرجاء اختيار قاعة صالحة.');
        return;
    }

    const room = rooms.find(r => r.id === roomId);
    // في بيئة العميل فقط، يمكننا عرض رسالة نجاح بسيطة
    const statusDiv = document.getElementById('issue-report-status');
    statusDiv.textContent = `تم استلام بلاغك عن مشكلة "${issueType}" في القاعة "${room.name}" بنجاح! الوصف: "${issueDescription}"`;
    statusDiv.classList.remove('hidden');

    // يمكن هنا إضافة منطق لحفظ هذه البلاغات في localStorage
    // أو طباعتها في الكونسول للمراجعة
    console.log('New Room Issue Report:', {
        roomId: roomId,
        roomName: room.name,
        issueType: issueType,
        description: issueDescription,
        timestamp: new Date().toLocaleString()
    });

    e.target.reset(); // مسح حقول النموذج بعد الإرسال
    setTimeout(() => {
        statusDiv.classList.add('hidden'); // إخفاء رسالة الحالة بعد فترة
    }, 5000);
});


// عند تحميل الصفحة، يتم ملء قوائم الاختيار وعرض أول جدول دكتور إذا كان موجوداً
document.addEventListener('DOMContentLoaded', () => {
    populateDoctorSelect();
    populateRoomIssueSelect();

    // حاول عرض جدول أول دكتور إذا كان هناك دكاترة وجداول مجدولة
    if (doctors.length > 0 && Object.keys(doctorSchedules).length > 0) {
        const firstDoctorId = doctors[0].id;
        document.getElementById('doctor-select').value = firstDoctorId;
        displayDoctorSchedule(firstDoctorId);
    }
});