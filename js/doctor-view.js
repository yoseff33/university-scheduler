// js/doctor-view.js

// جلب البيانات من LocalStorage
let doctors = getData('doctors');
let rooms = getData('rooms');
let doctorSchedules = getData('doctorSchedules');

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
    doctorSelect.innerHTML = '<option value="">-- اختر دكتور --</option>';

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
    const noDoctorSelectedMessage = document.getElementById('no-doctor-selected-message');

    scheduleDisplayDiv.classList.add('hidden');
    noDoctorSelectedMessage.classList.remove('hidden'); // عرض رسالة "اختر دكتور" افتراضياً
    doctorScheduleBody.innerHTML = '';

    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor || !doctorSchedules[doctorId] || Object.keys(doctorSchedules[doctorId]).every(day => Object.values(doctorSchedules[doctorId][day]).every(slot => slot === null))) {
        selectedDoctorNameElem.textContent = 'الرجاء اختيار دكتور.';
        return;
    }

    selectedDoctorNameElem.textContent = `جدول الدكتور: ${doctor.name}`;
    scheduleDisplayDiv.classList.remove('hidden');
    noDoctorSelectedMessage.classList.add('hidden'); // إخفاء رسالة "اختر دكتور"

    const occupiedCells = new Set();

    timeSlots.forEach(timeSlot => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="schedule-table-time-header">${timeSlot}</td>`;

        days.forEach(day => {
            const cellId = `${doctorId}-${day}-${timeSlot}`;
            if (occupiedCells.has(cellId)) {
                return;
            }

            const td = document.createElement('td');
            td.className = 'schedule-table-cell';

            const lecture = doctorSchedules[doctorId][day][timeSlot];
            if (lecture && lecture.startTime === timeSlot) {
                const lectureType = lecture.type;
                const lectureDurationMinutes = lectureType === 'short' ? 50 : 100;
                const slotsOccupied = Math.ceil(lectureDurationMinutes / 50);

                if (slotsOccupied > 1) {
                    td.rowSpan = slotsOccupied;
                    for (let i = 1; i < slotsOccupied; i++) {
                        const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + i;
                        if (nextTimeSlotIndex < timeSlots.length) {
                            occupiedCells.add(`${doctorId}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                        }
                    }
                }

                td.innerHTML = `
                    <div class="schedule-slot">
                        <div class="schedule-slot-subject">${lecture.courseName}</div>
                        <div class="schedule-slot-info">${lecture.sectionName}</div>
                        <div class="schedule-slot-info">${lecture.roomName}</div>
                        <div class="schedule-slot-info">(${lectureType === 'short' ? 'قصيرة' : 'طويلة'})</div>
                    </div>
                `;
                td.classList.add('has-lecture');
            } else if (!lecture && !occupiedCells.has(cellId)) {
                td.textContent = '';
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
        document.getElementById('no-doctor-selected-message').classList.remove('hidden');
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
        showMessage('الرجاء اختيار قاعة صالحة.', 'error');
        return;
    }

    const room = rooms.find(r => r.id === roomId);
    
    // يمكن هنا تخزين البلاغات في localStorage أيضاً
    // مثال بسيط جداً:
    let issueReports = getData('issueReports') || [];
    issueReports.push({
        id: Date.now(),
        roomId: roomId,
        roomName: room.name,
        issueType: issueType,
        description: issueDescription,
        timestamp: new Date().toLocaleString(),
        status: 'pending' // حالة افتراضية
    });
    saveData('issueReports', issueReports);

    showMessage(`تم استلام بلاغك عن مشكلة "${issueType}" في القاعة "${room.name}" بنجاح!`, 'success');

    e.target.reset(); // مسح حقول النموذج بعد الإرسال
});

// عند تحميل الصفحة، يتم ملء قوائم الاختيار وعرض أول جدول دكتور إذا كان موجوداً
document.addEventListener('DOMContentLoaded', () => {
    populateDoctorSelect();
    populateRoomIssueSelect();

    if (doctors.length > 0 && Object.keys(doctorSchedules).length > 0) {
        const firstDoctorId = doctors[0].id;
        document.getElementById('doctor-select').value = firstDoctorId;
        displayDoctorSchedule(firstDoctorId);
    } else {
        document.getElementById('no-doctor-selected-message').classList.remove('hidden');
    }
});
