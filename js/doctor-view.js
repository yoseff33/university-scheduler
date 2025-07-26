// js/doctor-view.js

let doctors = getData('doctors');
let rooms = getData('rooms'); // لا تزال مطلوبة لـ populateRoomIssueSelect في admin-reports.html
let doctorSchedules = getData('doctorSchedules');
// issueReports لم تعد هنا، تم نقلها إلى admin-reports.js

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

    timeSlots.forEach(timeSlot => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="schedule-table-time-header">${convertTo12HourFormat(timeSlot)}</td>`;

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
                const courseColorClass = getCourseColorClass(lecture.courseId);
                td.innerHTML = `
                    <div class="schedule-slot colored-lecture ${courseColorClass}">
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
