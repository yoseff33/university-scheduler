// js/room-view.js

let rooms = getData('rooms');
let schedule = getData('generatedSchedule'); // جدول العام للمحاضرات

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
    if (!room || Object.keys(schedule).length === 0) { // Check if general schedule exists
        selectedRoomNameElem.textContent = 'الرجاء اختيار قاعة.';
        return;
    }

    selectedRoomNameElem.textContent = `جدول القاعة: ${room.name}`;
    scheduleDisplayDiv.classList.remove('hidden');
    noRoomSelectedMessage.classList.add('hidden');

    const occupiedCells = new Set();

    timeSlots.forEach(timeSlot => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="schedule-table-time-header">${convertTo12HourFormat(timeSlot)}</td>`;

        days.forEach(day => {
            const cellId = `${roomId}-${day}-${timeSlot}`;
            if (occupiedCells.has(cellId)) {
                return;
            }

            const td = document.createElement('td');
            td.className = 'schedule-table-cell';

            // Find lecture in this room, day, time slot
            let lecture = null;
            if (schedule[day] && schedule[day][timeSlot] && schedule[day][timeSlot][roomId]) {
                lecture = schedule[day][timeSlot][roomId];
            }

            if (lecture && lecture.startTime === timeSlot) { // Make sure it's the start of the lecture block
                const lectureType = lecture.type;
                const lectureDurationMinutes = lectureType === 'short' ? 50 : 100;
                const slotsOccupied = Math.ceil(lectureDurationMinutes / 50);

                if (slotsOccupied > 1) {
                    td.rowSpan = slotsOccupied;
                    for (let i = 1; i < slotsOccupied; i++) {
                        const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + i;
                        if (nextTimeSlotIndex < timeSlots.length) {
                            occupiedCells.add(`${roomId}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                        }
                    }
                }
                const courseColorClass = getCourseColorClass(lecture.courseId);
                td.innerHTML = `
                    <div class="schedule-slot colored-lecture ${courseColorClass}">
                        <div class="schedule-slot-subject">${lecture.courseName}</div>
                        <div class="schedule-slot-info">${lecture.sectionName}</div>
                        <div class="schedule-slot-info">د. ${lecture.doctorName}</div>
                        <div class="schedule-slot-info">(${lectureType === 'short' ? 'قصيرة' : 'طويلة'})</div>
                    </div>
                `;
                td.classList.add('has-lecture');
            } else if (!lecture && !occupiedCells.has(cellId)) {
                td.textContent = '';
            }
            tr.appendChild(td);
        });
        roomScheduleBody.appendChild(tr);
    });
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

    if (rooms.length > 0 && Object.keys(schedule).length > 0) {
        const firstRoomId = rooms[0].id;
        document.getElementById('room-select').value = firstRoomId;
        displayRoomSchedule(firstRoomId);
    } else {
        document.getElementById('no-room-selected-message').classList.remove('hidden');
    }
});
