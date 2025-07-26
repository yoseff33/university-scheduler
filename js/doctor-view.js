// js/doctor-view.js

let doctors = getData('doctors');
let rooms = getData('rooms');
let doctorSchedules = getData('doctorSchedules');

const daysArabic = {
    sunday: "الأحد",
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس"
};
// أوقات الجدول الآن بفواصل 30 دقيقة
const timeSlots = [];
for (let h = 8; h <= 17; h++) { // من 8 صباحاً إلى 5 مساءً (بما في ذلك 5:00)
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 17) { // لا نضيف 30 دقيقة بعد 5:00 PM
        timeSlots.push(`${String(h).padStart(2, '0')}:30`);
    }
}
const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];

const getCourseColorClass = (courseId) => {
    const colorClasses = [
        'lecture-color-0', 'lecture-color-1', 'lecture-color-2', 'lecture-color-3',
        'lecture-color-4', 'lecture-color-5', 'lecture-color-6'
    ];
    return colorClasses[courseId % colorClasses.length];
};

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

const displayDoctorSchedule = (doctorId) => {
    const scheduleDisplayDiv = document.getElementById('doctor-schedule-display');
    const selectedDoctorNameElem = document.getElementById('selected-doctor-name');
    const doctorScheduleBody = document.getElementById('doctor-schedule-body');
    const noDoctorSelectedMessage = document.getElementById('no-doctor-selected-message');

    scheduleDisplayDiv.classList.add('hidden');
    noDoctorSelectedMessage.classList.remove('hidden');
    doctorScheduleBody.innerHTML = '';

    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor || !doctorSchedules[doctorId] || Object.keys(doctorSchedules[doctorId]).every(day => Object.values(doctorSchedules[doctorId][day]).every(slot => slot === null))) {
        selectedDoctorNameElem.textContent = 'الرجاء اختيار دكتور.';
        return;
    }

    selectedDoctorNameElem.textContent = `جدول الدكتور: ${doctor.name}`;
    scheduleDisplayDiv.classList.remove('hidden');
    noDoctorSelectedMessage.classList.add('hidden');

    const occupiedCells = new Set();

    for (let i = 0; i < timeSlots.length; i++) {
        const timeSlot = timeSlots[i];
        const displayTime = timeSlot.endsWith(':00') ? convertTo12HourFormat(timeSlot) : '';

        if (displayTime === '') {
            const prevHourSlot = timeSlots[i-1];
            let shouldSkipRow = false;
            for (const day of days) {
                const lecture = doctorSchedules[doctorId][day][prevHourSlot];
                if (lecture && lecture.startTime === prevHourSlot && lecture.slotsOccupied > 1) {
                    shouldSkipRow = true;
                    break;
                }
            }
            if (shouldSkipRow) continue;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="schedule-table-time-header">${displayTime}</td>`;

        days.forEach(day => {
            const cellKey = `${doctorId}-${day}-${timeSlot}`;
            if (occupiedCells.has(cellKey)) {
                return;
            }

            const td = document.createElement('td');
            td.className = 'schedule-table-cell';

            const lecture = doctorSchedules[doctorId][day][timeSlot];
            if (lecture && lecture.startTime === timeSlot) {
                const slotsOccupied = lecture.slotsOccupied;

                if (slotsOccupied > 1) {
                    td.rowSpan = slotsOccupied;
                    for (let j = 1; j < slotsOccupied; j++) {
                        const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + j;
                        if (nextTimeSlotIndex < timeSlots.length) {
                            occupiedCells.add(`${doctorId}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                        }
                    }
                }
                const courseColorClass = getCourseColorClass(lecture.courseId);
                const labOrTheory = lecture.isLab ? 'عملي' : 'نظري'; // Use isLab property

                td.innerHTML = `
                    <div class="schedule-slot colored-lecture ${courseColorClass}">
                        <div class="schedule-slot-subject">${lecture.courseName}</div>
                        <div class="schedule-slot-info">${lecture.sectionName}</div>
                        <div class="schedule-slot-info">${lecture.roomName}</div>
                        <div class="schedule-slot-details">
                            <span>${lecture.courseCode}</span> | <span>${labOrTheory}</span> | <span>(${lecture.type === 'short' ? '50 دقيقة' : '100 دقيقة'})</span>
                        </div>
                    </div>
                `;
                td.classList.add('has-lecture');
            } else if (!lecture) {
                td.textContent = '';
            }
            tr.appendChild(td);
        });
        doctorScheduleBody.appendChild(tr);
    });
};

document.getElementById('doctor-select').addEventListener('change', (e) => {
    const selectedDoctorId = parseInt(e.target.value);
    if (!isNaN(selectedDoctorId) && selectedDoctorId > 0) {
        displayDoctorSchedule(selectedDoctorId);
    } else {
        document.getElementById('doctor-schedule-display').classList.add('hidden');
        document.getElementById('no-doctor-selected-message').classList.remove('hidden');
    }
});

// زر الطباعة
document.getElementById('print-doctor-schedule-btn').addEventListener('click', () => {
    const doctorId = document.getElementById('doctor-select').value;
    if (!doctorId || document.getElementById('doctor-schedule-display').classList.contains('hidden')) {
        showMessage('الرجاء اختيار دكتور لعرض جدوله ثم الطباعة.', 'warning');
        return;
    }

    const scheduleToPrint = document.getElementById('doctor-schedule-display');
    if (scheduleToPrint) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>جدول الدكتور</title>');
        printWindow.document.write('<link rel="stylesheet" href="css/style.css">');
        printWindow.document.write('<link rel="stylesheet" href="css/print.css" media="print">');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div class="main-content">');
        printWindow.document.write(scheduleToPrint.outerHTML);
        printWindow.document.write('</div></body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    populateDoctorSelect();

    if (doctors.length > 0 && Object.keys(doctorSchedules).length > 0) {
        const firstDoctorId = doctors[0].id;
        document.getElementById('doctor-select').value = firstDoctorId;
        displayDoctorSchedule(firstDoctorId);
    } else {
        document.getElementById('no-doctor-selected-message').classList.remove('hidden');
    }
});
