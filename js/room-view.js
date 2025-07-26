// js/room-view.js

let rooms = getData('rooms');
let schedule = getData('generatedSchedule'); // جدول العام للمحاضرات
let doctors = getData('doctors'); // لجلب اسم الدكتور
let courses = getData('courses'); // لجلب اسم المقرر

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

const populateRoomSelect = () => {
    const roomSelect = document.getElementById('room-select');
    roomSelect.innerHTML = '<option value="">-- اختر قاعة --</option>';

    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        roomSelect.appendChild(option);
    });
};

const displayRoomSchedule = (roomId) => {
    const scheduleDisplayDiv = document.getElementById('room-schedule-display');
    const selectedRoomNameElem = document.getElementById('selected-room-name');
    const roomScheduleBody = document.getElementById('room-schedule-body');
    const noRoomSelectedMessage = document.getElementById('no-room-selected-message');

    scheduleDisplayDiv.classList.add('hidden');
    noRoomSelectedMessage.classList.remove('hidden');
    roomScheduleBody.innerHTML = '';

    const room = rooms.find(r => r.id === roomId);
    if (!room || Object.keys(schedule).length === 0 || doctors.length === 0 || courses.length === 0) {
        selectedRoomNameElem.textContent = 'الرجاء اختيار قاعة.';
        return;
    }

    selectedRoomNameElem.textContent = `جدول القاعة: ${room.name}`;
    scheduleDisplayDiv.classList.remove('hidden');
    noRoomSelectedMessage.classList.add('hidden');

    const occupiedCells = new Set();

    for (let i = 0; i < timeSlots.length; i++) {
        const timeSlot = timeSlots[i];
        const displayTime = timeSlot.endsWith(':00') ? convertTo12HourFormat(timeSlot) : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="schedule-table-time-header">${displayTime}</td>`;

        days.forEach(day => {
            const cellKey = `${roomId}-${day}-${timeSlot}`;
            if (occupiedCells.has(cellKey)) {
                return;
            }

            const td = document.createElement('td');
            td.className = 'schedule-table-cell';

            // Find lecture in this room, day, time slot
            let lecture = null;
            if (schedule[day] && schedule[day][timeSlot] && schedule[day][timeSlot][roomId]) {
                lecture = schedule[day][timeSlot][roomId];
            }

            if (lecture && lecture.startTime === timeSlot) {
                const slotsOccupied = lecture.slotsOccupied;

                if (slotsOccupied > 1) {
                    td.rowSpan = slotsOccupied;
                    for (let j = 1; j < slotsOccupied; j++) {
                        const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + j;
                        if (nextTimeSlotIndex < timeSlots.length) {
                            occupiedCells.add(`${roomId}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                        }
                    }
                }
                const courseColorClass = getCourseColorClass(lecture.courseId);
                const labOrTheory = lecture.isLab ? 'عملي' : 'نظري';

                td.innerHTML = `
                    <div class="schedule-slot colored-lecture ${courseColorClass}">
                        <div class="schedule-slot-subject">${lecture.courseName}</div>
                        <div class="schedule-slot-info">${lecture.sectionName}</div>
                        <div class="schedule-slot-info">د. ${lecture.doctorName}</div>
                        <div class="schedule-slot-details">
                            <span>${lecture.courseCode}</span> | <span>${labOrTheory}</span> | <span>(${lecture.durationMinutes} دقيقة)</span>
                        </div>
                    </div>
                `;
                td.classList.add('has-lecture');
            } else if (!lecture) {
                td.textContent = '';
            }
            tr.appendChild(td);
        });
        roomScheduleBody.appendChild(tr);
    }
};

document.getElementById('room-select').addEventListener('change', (e) => {
    const selectedRoomId = parseInt(e.target.value);
    if (!isNaN(selectedRoomId) && selectedRoomId > 0) {
        displayRoomSchedule(selectedRoomId);
    } else {
        document.getElementById('room-schedule-display').classList.add('hidden');
        document.getElementById('no-room-selected-message').classList.remove('hidden');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    populateRoomSelect();

    rooms = getData('rooms');
    schedule = getData('generatedSchedule');
    doctors = getData('doctors');
    courses = getData('courses');

    if (rooms.length > 0 && Object.keys(schedule).length > 0) {
        const firstRoomId = rooms[0].id;
        document.getElementById('room-select').value = firstRoomId;
        displayRoomSchedule(firstRoomId);
    } else {
        document.getElementById('no-room-selected-message').classList.remove('hidden');
    }
});
