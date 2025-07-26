// js/generate.js

let doctors = getData('doctors');
let courses = getData('courses');
let sections = getData('sections');
let rooms = getData('rooms');

const schedule = {}; // الجدول العام
const doctorSchedules = {}; // جداول الدكاترة الفردية
const roomAvailability = {}; // توافر القاعات

// أوقات الجدول الآن بفواصل 30 دقيقة
const timeSlots = [];
for (let h = 8; h <= 17; h++) { // من 8 صباحاً إلى 5 مساءً (بما في ذلك 5:00)
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 17) { // لا نضيف 30 دقيقة بعد 5:00 PM
        timeSlots.push(`${String(h).padStart(2, '0')}:30`);
    }
}

const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];

// مدة المحاضرات بالدقائق
const LECTURE_DURATION_SHORT = 50;  // محاضرة 1 ساعة
const LECTURE_DURATION_LONG = 100; // محاضرة 1 ساعة و 40 دقيقة

const MIN_BREAK_TIME_MINUTES = 10; // 10 دقائق فاصل بين المحاضرات

// تعريف أوقات بداية ونهاية اليوم الدراسي الحضوري (بنظام الدقائق من منتصف الليل)
const DAY_START_MINUTES = timeToMinutes("08:00"); // 8:00 AM
const DAY_END_MINUTES = timeToMinutes("17:00");   // 5:00 PM

// --- متغيرات وضع التحرير الجديد ---
let editMode = false;
let selectedLectureForMove = null; // سيحتوي على بيانات المحاضرة التي تم النقر المزدوج عليها أول مرة

// وظيفة الحصول على لون عشوائي بناءً على ID المقرر
const getCourseColorClass = (courseId) => {
    const colorClasses = [
        'lecture-color-0', 'lecture-color-1', 'lecture-color-2', 'lecture-color-3',
        'lecture-color-4', 'lecture-color-5', 'lecture-color-6'
    ];
    return colorClasses[courseId % colorClasses.length];
};

const initializeScheduleStructures = () => {
    days.forEach(day => {
        schedule[day] = {};
        timeSlots.forEach(slot => {
            schedule[day][slot] = {};
        });
    });

    doctors.forEach(doctor => {
        doctorSchedules[doctor.id] = {};
        days.forEach(day => {
            doctorSchedules[doctor.id][day] = {};
            timeSlots.forEach(slot => {
                doctorSchedules[doctor.id][day][slot] = null;
            });
        });
        doctor.assignedHours = 0;
    });

    rooms.forEach(room => {
        roomAvailability[room.id] = {};
        days.forEach(day => {
            roomAvailability[room.id][day] = {};
            timeSlots.forEach(slot => {
                roomAvailability[room.id][day][slot] = true;
            });
        });
    });

    sections.forEach(section => {
        section.isScheduled = false;
    });
};

// وظيفة مساعدة لتحديد ما إذا كان هناك وقت كافٍ للراحة بعد المحاضرة السابقة
const hasEnoughBreakTime = (doctorId, day, currentStartTimeMinutes, currentDoctorSchedulesState) => {
    // نجد أقرب وقت بداية سابق للمحاضرة الحالية
    let prevLectureEndTimeMinutes = -1;
    // Iterate backwards from currentStartTimeMinutes index in timeSlots
    const currentSlotIndex = timeSlots.indexOf(timeSlots.find(slot => timeToMinutes(slot) === currentStartTimeMinutes));

    for (let i = currentSlotIndex - 1; i >= 0; i--) {
        const prevSlotToCheck = timeSlots[i];
        const lectureAtPrevSlot = currentDoctorSchedulesState[doctorId][day][prevSlotToCheck];

        if (lectureAtPrevSlot) {
            // Found a lecture in a previous slot. Now determine its actual end time.
            const lectureStartInPrevSlot = lectureAtPrevSlot.startTime;
            const lectureDurationInPrevSlot = (lectureAtPrevSlot.type === 'long' ? LECTURE_DURATION_LONG : LECTURE_DURATION_SHORT);
            prevLectureEndTimeMinutes = timeToMinutes(lectureStartInPrevSlot) + lectureDurationInPrevSlot;
            break; // Found the previous lecture that matters, break the loop
        }
    }

    if (prevLectureEndTimeMinutes !== -1) {
        if (currentStartTimeMinutes - prevLectureEndTimeMinutes < MIN_BREAK_TIME_MINUTES) {
            return false; // لا يوجد وقت كاف للراحة
        }
    }
    return true;
};


const isDoctorAvailable = (doctor, day, startTime, lectureLengthMinutes, currentDoctorSchedulesState) => {
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

    // 1. قيد الوقت اليومي (8 صباحًا - 5 مساءً)
    if (startLectureMinutes < DAY_START_MINUTES || endLectureMinutes > DAY_END_MINUTES + 1) { // +1 to allow 17:00-17:50 to fit
        return false;
    }

    // 2. تحقق من الأوقات المتاحة للدكتور بشكل عام لهذا اليوم
    const availableDaySlot = doctor.availableTimes[day];
    if (!availableDaySlot || timeToMinutes(availableDaySlot.start) === -1 || timeToMinutes(availableDaySlot.end) === -1) {
        return false;
    }

    const doctorAvailableStartMinutes = timeToMinutes(availableDaySlot.start);
    const doctorAvailableEndMinutes = timeToMinutes(availableDaySlot.end);

    if (startLectureMinutes < doctorAvailableStartMinutes || endLectureMinutes > doctorAvailableEndMinutes) {
        return false;
    }

    // 3. تحقق من الأوقات غير المناسبة للدكتور
    const arabicDayMap = {
        'الأحد': 'sunday', 'الإثنين': 'monday', 'الثلاثاء': 'tuesday',
        'الأربعاء': 'wednesday', 'الخميس': 'thursday', 'الجمعة': 'friday', 'السبت': 'saturday'
    };
    for (const forbiddenTimeRange of doctor.unavailableTimes) {
        const parts = forbiddenTimeRange.split(' '); // Split by space
        if (parts.length >= 3) {
            const forbiddenDayId = parts[0].trim();
            const forbiddenStartStr = parts[1].split('-')[0].trim();
            const forbiddenEndStr = parts[1].split('-')[1].trim();

            if (forbiddenDayId === day) {
                const forbiddenStartMinutes = timeToMinutes(forbiddenStartStr);
                const forbiddenEndMinutes = timeToMinutes(forbiddenEndStr);

                if (!(endLectureMinutes <= forbiddenStartMinutes || startLectureMinutes >= forbiddenEndMinutes)) {
                    return false;
                }
            }
        }
    }

    // 4. تحقق من عدم وجود تعارض في جدول الدكتور (المحاضرات المجدولة بالفعل)
    const startIndexInSlots = timeSlots.indexOf(startTime);
    const slotsNeeded = Math.ceil(lectureLengthMinutes / 30); // كل صف 30 دقيقة

    for (let i = 0; i < slotsNeeded; i++) {
        const currentSlot = timeSlots[startIndexInSlots + i];
        if (!currentSlot || (currentDoctorSchedulesState[doctor.id][day] && currentDoctorSchedulesState[doctor.id][day][currentSlot])) {
            return false;
        }
    }

    // 5. تحقق من وجود فاصل زمني كافٍ قبل المحاضرة الحالية
    if (!hasEnoughBreakTime(doctor.id, day, startLectureMinutes, currentDoctorSchedulesState)) {
        return false;
    }

    return true;
};

const isRoomAvailable = (room, day, startTime, lectureLengthMinutes, currentRoomAvailabilityState) => {
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

    // 1. قيد الوقت اليومي (8 صباحًا - 5 مساءً)
    if (startLectureMinutes < DAY_START_MINUTES || endLectureMinutes > DAY_END_MINUTES + 1) {
        return false;
    }

    // 2. تحقق من الأوقات ممنوعة لاستخدام المعامل (فقط للمعامل)
    if (room.type === 'lab') {
        const arabicDayMap = {
            'الأحد': 'sunday', 'الإثنين': 'monday', 'الثلاثاء': 'tuesday',
            'الأربعاء': 'wednesday', 'الخميس': 'thursday', 'الجمعة': 'friday', 'السبت': 'saturday'
        };
        for (const forbiddenTimeRange of room.forbiddenTimes) {
            const parts = forbiddenTimeRange.split(' '); // Split by space
            if (parts.length >= 3) {
                const forbiddenDayId = parts[0].trim();
                const forbiddenStartStr = parts[1].split('-')[0].trim();
                const forbiddenEndStr = parts[1].split('-')[1].trim();

                if (forbiddenDayId === day) {
                    const forbiddenStartMinutes = timeToMinutes(forbiddenStartStr);
                    const forbiddenEndMinutes = timeToMinutes(forbiddenEndStr);

                    if (!(endLectureMinutes <= forbiddenStartMinutes || startLectureMinutes >= forbiddenEndMinutes)) {
                        return false;
                    }
                }
            }
        }
    }

    // 3. تحقق من توافر القاعة في الجدول الكلي (عدم وجود حجز آخر)
    const startIndexInSlots = timeSlots.indexOf(startTime);
    const slotsNeeded = Math.ceil(lectureLengthMinutes / 30); // كل صف 30 دقيقة

    for (let i = 0; i < slotsNeeded; i++) {
        const currentSlot = timeSlots[startIndexInSlots + i];
        if (!currentSlot || (currentRoomAvailabilityState[room.id] && currentRoomAvailabilityState[room.id][day] && !currentRoomAvailabilityState[room.id][day][currentSlot])) {
            return false;
        }
    }
    return true;
};

const generateSchedules = () => {
    const statusMessageElem = document.getElementById('generation-status');
    statusMessageElem.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري توليد الجداول... قد يستغرق الأمر بعض الوقت.';
    statusMessageElem.className = 'status-message info';
    statusMessageElem.style.display = 'flex';

    if (editMode) {
        disableEditMode(false);
    }

    initializeScheduleStructures();

    const lecturesToSchedule = [];
    sections.forEach(section => {
        const course = courses.find(c => c.id === section.courseId);
        if (!course) {
            console.warn(`Section ${section.name} linked to non-existent course.`);
            return;
        }
        
        let remainingHours = course.hours;
        let lectureCounter = 0; // for distinguishing parts of the same course

        // Special handling for 3-hour courses: long then short
        if (remainingHours === 3) {
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'long', durationMinutes: LECTURE_DURATION_LONG, lectureIndex: lectureCounter++, partOrder: 1
            });
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'short', durationMinutes: LECTURE_DURATION_SHORT, lectureIndex: lectureCounter++, partOrder: 2
            });
            remainingHours = 0;
        }
        // Special handling for 2-hour courses: two shorts
        else if (remainingHours === 2) {
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'short', durationMinutes: LECTURE_DURATION_SHORT, lectureIndex: lectureCounter++, partOrder: 1
            });
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'short', durationMinutes: LECTURE_DURATION_SHORT, lectureIndex: lectureCounter++, partOrder: 2
            });
            remainingHours = 0;
        }
        // Special handling for 1-hour courses: one short
        else if (remainingHours === 1) {
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'short', durationMinutes: LECTURE_DURATION_SHORT, lectureIndex: lectureCounter++, partOrder: 1
            });
            remainingHours = 0;
        }
        // Fallback for other hour counts (e.g., 4, 5, or invalid)
        else {
            while (remainingHours > 0) {
                let currentLectureType = 'short';
                let currentDuration = LECTURE_DURATION_SHORT;
                let hoursConsumed = 1;

                if (remainingHours >= 2 && course.type === 'long') {
                    currentLectureType = 'long';
                    currentDuration = LECTURE_DURATION_LONG;
                    hoursConsumed = 2;
                }

                lecturesToSchedule.push({
                    sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                    requiredType: currentLectureType, durationMinutes: currentDuration, lectureIndex: lectureCounter++, partOrder: 1 // Default partOrder
                });
                remainingHours -= hoursConsumed;
            }
        }
    });

    const sortedLectures = lecturesToSchedule.sort((a, b) => {
        // Primary sort: Long lectures before short lectures
        if (a.requiredType === 'long' && b.requiredType === 'short') return -1;
        if (a.requiredType === 'short' && b.requiredType === 'long') return 1;

        // Secondary sort: For 3-hour courses, ensure long part (partOrder: 1) comes before short part (partOrder: 2)
        if (a.sectionId === b.sectionId && a.courseId === b.courseId && a.partOrder && b.partOrder) {
            return a.partOrder - b.partOrder;
        }

        // Tertiary sort: Larger sections first (harder to fit)
        const sectionA = sections.find(s => s.id === a.sectionId);
        const sectionB = sections.find(s => s.id === b.sectionId);
        if (sectionA && sectionB) {
            return sectionB.students - sectionA.students;
        }
        return 0;
    });

    let successfullyScheduledCount = 0;
    let failedToScheduleCount = 0;
    let unscheduledLecturesDetails = [];

    for (const lectureUnit of sortedLectures) {
        let lectureScheduled = false;
        const doctor = doctors.find(d => d.id === lectureUnit.doctorId);
        const course = courses.find(c => c.id === lectureUnit.courseId);
        const section = sections.find(s => s.id === lectureUnit.sectionId);

        if (!doctor || !course || !section) {
            console.warn(`Skipping lecture unit: missing associated data for section ${section ? section.name : 'N/A'}.`);
            unscheduledLecturesDetails.push(`الشعبة "${section ? section.name : 'غير معروف'}" - المقرر "${course ? course.name : 'غير معروف'}" (بيانات غير مكتملة)`);
            failedToScheduleCount++;
            continue;
        }

        const lectureLengthMinutes = lectureUnit.durationMinutes;

        // Shuffle days based on doctor's current load (for even distribution)
        const doctorDaysLoad = {};
        days.forEach(day => doctorDaysLoad[day] = 0);
        for(const docDay of days) {
            for(const slot of timeSlots) {
                if(doctorSchedules[doctor.id][docDay][slot] && doctorSchedules[doctor.id][docDay][slot].startTime === slot) {
                    doctorDaysLoad[docDay]++;
                }
            }
        }
        const shuffledDays = [...days].sort((a, b) => doctorDaysLoad[a] - doctorDaysLoad[b] || 0.5 - Math.random());


        for (const day of shuffledDays) {
            if (lectureScheduled) break;

            const suitableRooms = rooms.filter(r => {
                return r.capacity >= section.students &&
                       (course.requiresLab ? r.type === 'lab' : r.type !== 'lab');
            }).sort(() => 0.5 - Math.random());

            const shuffledTimeSlots = [...timeSlots].sort(() => 0.5 - Math.random());

            for (const timeSlot of shuffledTimeSlots) {
                if (lectureScheduled) break;

                const remainingDoctorHours = (doctor.weeklyHours * 60) - doctor.assignedHours;
                if (remainingDoctorHours < lectureLengthMinutes) {
                    continue;
                }

                if (isDoctorAvailable(doctor, day, timeSlot, lectureLengthMinutes, doctorSchedules)) {
                    for (const room of suitableRooms) {
                        if (isRoomAvailable(room, day, timeSlot, lectureLengthMinutes, roomAvailability)) {
                            const startIndexInSlots = timeSlots.indexOf(timeSlot);
                            const slotsNeeded = Math.ceil(lectureLengthMinutes / 30); // Each row is 30 دقيقة

                            let canScheduleInSlots = true;
                            for (let i = 0; i < slotsNeeded; i++) {
                                const currentSlot = timeSlots[startIndexInSlots + i];
                                if (!currentSlot || schedule[day][currentSlot][room.id]) {
                                    canScheduleInSlots = false;
                                    break;
                                }
                            }

                            if (canScheduleInSlots) {
                                for (let i = 0; i < slotsNeeded; i++) {
                                    const currentSlot = timeSlots[startIndexInSlots + i];
                                    const assignedLectureData = {
                                        sectionId: lectureUnit.sectionId,
                                        doctorId: lectureUnit.doctorId,
                                        courseId: lectureUnit.courseId,
                                        roomName: room.name,
                                        courseName: course.name,
                                        sectionName: section.name,
                                        doctorName: doctor.name,
                                        type: lectureUnit.requiredType,
                                        startTime: timeSlot, // The actual start time of this lecture part
                                        durationMinutes: lectureLengthMinutes,
                                        slotsOccupied: slotsNeeded, // How many 30-min slots it occupies
                                        lectureIndex: lectureUnit.lectureIndex,
                                        courseCode: course.code, // New detail
                                        isLab: course.requiresLab // New detail
                                    };
                                    schedule[day][currentSlot][room.id] = assignedLectureData;
                                    roomAvailability[room.id][day][currentSlot] = false;
                                    doctorSchedules[doctor.id][day][currentSlot] = assignedLectureData;
                                }
                                doctor.assignedHours += lectureLengthMinutes;
                                successfullyScheduledCount++;
                                lectureScheduled = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
        if (!lectureScheduled) {
            unscheduledLecturesDetails.push(`الشعبة "${section.name}" (المقرر: ${course.name}, محاضرة #${lectureUnit.lectureIndex + 1} من نوع ${lectureUnit.requiredType === 'short' ? 'قصيرة' : 'طويلة'})`);
            failedToScheduleCount++;
        }
    }

    saveData('generatedSchedule', schedule);
    saveData('doctorSchedules', doctorSchedules);
    saveData('doctors', doctors);
    
    sections.forEach(s => {
        const allLectureUnitsForSection = lecturesToSchedule.filter(lu => lu.sectionId === s.id);
        const scheduledLectureUnitsForSection = allLectureUnitsForSection.filter(lu => {
            const docSched = doctorSchedules[lu.doctorId];
            if (!docSched) return false;
            for (const day in docSched) {
                for (const slot in docSched[day]) {
                    const scheduledLecture = docSched[day][slot];
                    if (scheduledLecture &&
                        scheduledLecture.sectionId === lu.sectionId &&
                        scheduledLecture.courseId === lu.courseId &&
                        scheduledLecture.lectureIndex === lu.lectureIndex &&
                        scheduledLecture.startTime === slot) {
                        return true;
                    }
                }
            }
            return false;
        });
        s.isScheduled = (allLectureUnitsForSection.length === scheduledLectureUnitsForSection.length && allLectureUnitsForSection.length > 0);
    });
    saveData('sections', sections);

    if (failedToScheduleCount > 0) {
        let warningMessage = `تم توليد الجداول مع بعض القيود. فشل جدولة ${failedToScheduleCount} محاضرة.`;
        if (unscheduledLecturesDetails.length > 0) {
             warningMessage += `<br> تفاصيل: <ul>${[...new Set(unscheduledLecturesDetails)].map(item => `<li>${item}</li>`).join('')}</ul>`;
        }
        statusMessageElem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${warningMessage}`;
        statusMessageElem.className = 'status-message warning';
        showMessage(`تم توليد الجداول مع بعض القيود. فشل جدولة ${failedToScheduleCount} محاضرة.`, 'warning', 10000);
    } else {
        statusMessageElem.innerHTML = '<i class="fas fa-check-circle"></i> تم توليد الجداول بنجاح!';
        statusMessageElem.className = 'status-message success';
        showMessage('تم توليد الجداول بنجاح!', 'success');
    }
    statusMessageElem.style.display = 'flex';
    displayGeneratedSchedules();
};

const displayGeneratedSchedules = () => {
    const scheduleOutput = document.getElementById('schedule-output');
    const noSchedulesMessage = document.getElementById('no-schedules-message');
    scheduleOutput.innerHTML = '';
    noSchedulesMessage.classList.add('hidden');

    const daysArabic = {
        sunday: "الأحد",
        monday: "الإثنين",
        tuesday: "الثلاثاء",
        wednesday: "الأربعاء",
        thursday: "الخميس"
    };

    if (Object.keys(doctorSchedules).length === 0 || doctors.length === 0) {
        noSchedulesMessage.classList.remove('hidden');
        return;
    }

    for (const doctorId in doctorSchedules) {
        const doctor = doctors.find(d => d.id === parseInt(doctorId));
        if (!doctor) continue;

        const doctorScheduleDiv = document.createElement('div');
        doctorScheduleDiv.className = 'card doctor-schedule-card';
        doctorScheduleDiv.id = `doctor-schedule-${doctor.id}`;

        doctorScheduleDiv.innerHTML = `
            <div class="card-header">
                <h2><i class="fas fa-user-md"></i> جدول الدكتور: ${doctor.name}</h2>
            </div>
            <div class="card-body">
                <p>الساعات المجدولة: ${Math.round(doctor.assignedHours / 60)} ساعة من ${doctor.weeklyHours} ساعة أسبوعيًا</p>
                <div class="table-container">
                    <table class="schedule-table">
                        <thead>
                            <tr>
                                <th>الوقت</th>
                                ${days.map(day => `<th>${daysArabic[day]}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody id="doctor-${doctor.id}-schedule-body">
                            </tbody>
                    </table>
                </div>
            </div>
        `;
        scheduleOutput.appendChild(doctorScheduleDiv);

        const tbody = document.getElementById(`doctor-${doctor.id}-schedule-body`);
        const occupiedCells = new Set(); // Stores cell IDs like 'docId-day-timeSlot'

        for (let i = 0; i < timeSlots.length; i++) {
            const timeSlot = timeSlots[i];
            const displayTime = timeSlot.endsWith(':00') ? convertTo12HourFormat(timeSlot) : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="schedule-table-time-header">${displayTime}</td>`;

            days.forEach(day => {
                const td = document.createElement('td');
                td.className = `schedule-table-cell`;
                td.setAttribute('data-day', day);
                td.setAttribute('data-timeslot', timeSlot); // Keep 24h for internal logic
                td.setAttribute('data-doctorid', doctor.id);

                const cellId = `${doctorId}-${day}-${timeSlot}`;
                if (occupiedCells.has(cellId)) {
                    return;
                }

                const lecture = doctorSchedules[doctorId][day][timeSlot];
                if (lecture && lecture.startTime === timeSlot) { // تأكد أنه بداية المحاضرة وليس جزء منها
                    const slotsOccupied = lecture.slotsOccupied; // This is the number of 30-min slots

                    if (slotsOccupied > 1) {
                        td.rowSpan = slotsOccupied;
                        for (let j = 1; j < slotsOccupied; j++) {
                            const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + j;
                            if (nextTimeSlotIndex < timeSlots.length) {
                                occupiedCells.add(`${doctorId}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                            }
                        }
                    }

                    const lectureCard = document.createElement('div');
                    const courseColorClass = getCourseColorClass(lecture.courseId);
                    lectureCard.className = `schedule-slot colored-lecture ${courseColorClass} ${editMode ? 'editable-lecture' : ''}`;
                    lectureCard.setAttribute('data-lecture-id', `${doctor.id}-${day}-${timeSlot}-${lecture.sectionId}-${lecture.courseId}-${lecture.lectureIndex}`);
                    lectureCard.setAttribute('data-course-id', lecture.courseId);
                    lectureCard.setAttribute('data-section-id', lecture.sectionId);
                    lectureCard.setAttribute('data-room-id', lecture.roomId);
                    lectureCard.setAttribute('data-lecture-type', lecture.type);
                    lectureCard.setAttribute('data-original-day', day);
                    lectureCard.setAttribute('data-original-timeslot', timeSlot);
                    lectureCard.setAttribute('data-doctor-id', lecture.doctorId);
                    lectureCard.setAttribute('data-duration-slots', slotsOccupied);
                    lectureCard.setAttribute('data-lecture-index', lecture.lectureIndex);

                    const labOrTheory = lecture.isLab ? 'عملي' : 'نظري';
                    lectureCard.innerHTML = `
                        <div class="schedule-slot-subject" ${editMode ? 'contenteditable="true"' : ''} data-field="courseName">${lecture.courseName}</div>
                        <div class="schedule-slot-info" ${editMode ? 'contenteditable="true"' : ''} data-field="sectionName">${lecture.sectionName}</div>
                        <div class="schedule-slot-info" ${editMode ? 'contenteditable="true"' : ''} data-field="roomName">${lecture.roomName}</div>
                        <div class="schedule-slot-details">
                            <span>${lecture.courseCode}</span> | <span>${labOrTheory}</span> | <span>(${lecture.durationMinutes} دقيقة)</span>
                        </div>
                    `;
                    td.appendChild(lectureCard);
                    td.classList.add('has-lecture');
                } else if (!lecture) {
                    td.textContent = '';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
    }

    addContentEditableListeners();
    attachDoubleClickListeners();
    attachClickAnywhereElseListener();
};

// --- وظائف التحرير بالنقر المزدوج (Double-Click Editing Functions) ---
const enableEditMode = () => {
    editMode = true;
    document.getElementById('edit-schedule-btn').classList.add('btn-warning');
    document.getElementById('edit-schedule-btn').innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
    document.getElementById('cancel-edit-btn').classList.remove('hidden');

    displayGeneratedSchedules(); // Re-render to apply edit mode styles and contenteditable

    showMessage('وضع التحرير مفعل. انقر مرتين على محاضرة لتحديدها، ثم انقر مرتين على خلية فارغة لنقلها.', 'info', 7000);
};

const disableEditMode = (saveChanges = true) => {
    editMode = false;
    document.getElementById('edit-schedule-btn').classList.remove('btn-warning');
    document.getElementById('edit-schedule-btn').innerHTML = '<i class="fas fa-edit"></i> تحرير الجداول';
    document.getElementById('cancel-edit-btn').classList.add('hidden');

    document.querySelectorAll('.selected-for-move').forEach(el => el.classList.remove('selected-for-move'));
    document.querySelectorAll('.selected-move-target').forEach(el => el.classList.remove('selected-move-target'));

    displayGeneratedSchedules(); // Re-render to remove edit mode styles and contenteditable

    if (saveChanges) {
        showMessage('تم الخروج من وضع التحرير.', 'info');
    } else {
        showMessage('تم إلغاء وضع التحرير.', 'info');
    }
    selectedLectureForMove = null;
};


const attachDoubleClickListeners = () => {
    document.querySelectorAll('.schedule-table-cell').forEach(cell => {
        cell.removeEventListener('dblclick', handleCellDoubleClick); // Remove old listeners
    });

    if (editMode) {
        document.querySelectorAll('.schedule-table-cell').forEach(cell => {
            cell.addEventListener('dblclick', handleCellDoubleClick); // Add new listeners if in edit mode
        });
    }
};

const attachClickAnywhereElseListener = () => {
    document.removeEventListener('click', handleClickAnywhereElse); // Remove old listener
    if (editMode) {
        document.addEventListener('click', handleClickAnywhereElse); // Add new listener if in edit mode
    }
};

const handleClickAnywhereElse = (e) => {
    // If a lecture is selected and the click was not on a lecture card or a table cell
    if (selectedLectureForMove && !e.target.closest('.schedule-slot') && !e.target.closest('.schedule-table-cell')) {
        showMessage('تم إلغاء تحديد المحاضرة.', 'info');
        selectedLectureForMove = null;
        document.querySelectorAll('.selected-for-move').forEach(el => el.classList.remove('selected-for-move'));
        document.querySelectorAll('.selected-move-target').forEach(el => el.classList.remove('selected-move-target'));
    }
};


const handleCellDoubleClick = (e) => {
    if (!editMode) return;

    const targetCell = e.currentTarget;
    const lectureInCell = targetCell.querySelector('.schedule-slot');

    document.querySelectorAll('.selected-move-target').forEach(el => el.classList.remove('selected-move-target'));

    if (selectedLectureForMove) {
        const targetDay = targetCell.getAttribute('data-day');
        const targetTimeSlot = targetCell.getAttribute('data-timeslot');
        const targetDoctorId = parseInt(targetCell.getAttribute('data-doctorid'));

        // If target cell has a lecture, and it's not the one we're trying to move, then it's occupied.
        if (lectureInCell && lectureInCell.getAttribute('data-lecture-id') !== selectedLectureForMove.id) {
            showMessage('الخلية الهدف مشغولة بالفعل بمحاضرة أخرى. لا يمكن النقل.', 'error');
            selectedLectureForMove = null;
            document.querySelectorAll('.selected-for-move').forEach(el => el.classList.remove('selected-for-move'));
            return;
        }
        
        // Attempt to move the selected lecture to this cell
        moveSelectedLectureTo(targetCell);

    } else if (lectureInCell) {
        // If no lecture is selected yet, and this cell has one, select it for move
        const lectureId = lectureInCell.getAttribute('data-lecture-id');
        const doctorId = parseInt(lectureInCell.getAttribute('data-doctor-id'));
        const day = lectureInCell.getAttribute('data-original-day');
        const timeSlot = lectureInCell.getAttribute('data-original-timeslot');

        selectedLectureForMove = {
            id: lectureId,
            originalDoctorId: doctorId,
            originalDay: day,
            originalTimeSlot: timeSlot,
            lectureData: doctorSchedules[doctorId][day][timeSlot]
        };

        document.querySelectorAll('.selected-for-move').forEach(el => el.classList.remove('selected-for-move'));
        lectureInCell.classList.add('selected-for-move');

        showMessage(`تم تحديد المحاضرة: ${selectedLectureForMove.lectureData.courseName}. انقر مرتين على خلية فارغة لنقلها.`, 'info', 5000);

    } else {
        // Empty cell, and no lecture selected
        showMessage('لا توجد محاضرة محددة للنقل. انقر مرتين على محاضرة أولاً لتحديدها.', 'warning');
    }
};

const moveSelectedLectureTo = (targetCell) => {
    if (!selectedLectureForMove) return;

    const targetDay = targetCell.getAttribute('data-day');
    const targetTimeSlot = targetCell.getAttribute('data-timeslot');
    const targetDoctorId = parseInt(targetCell.getAttribute('data-doctorid'));

    const { lectureData, originalDoctorId, originalDay, originalTimeSlot } = selectedLectureForMove;
    const lectureType = lectureData.type;
    const durationMinutes = lectureData.durationMinutes;
    const slotsOccupied = lectureData.slotsOccupied; // Slots occupied by the lecture itself

    const course = courses.find(c => c.id === lectureData.courseId);
    const room = rooms.find(r => r.id === lectureData.roomId);

    if (!course || !room) {
        showMessage('خطأ: بيانات المقرر أو القاعة غير مكتملة للمحاضرة.', 'error');
        selectedLectureForMove = null;
        displayGeneratedSchedules();
        return;
    }

    // --- Validity checks for the move (using temporary states) ---
    const tempDoctorSchedules = JSON.parse(JSON.stringify(doctorSchedules));
    const tempRoomAvailability = JSON.parse(JSON.stringify(roomAvailability));
    const tempDoctors = JSON.parse(JSON.stringify(doctors));
    const originalLectureRoomId = lectureData.roomId;

    // Temporarily "remove" the lecture from its original spot in the temporary copies
    const tempOldDoctor = tempDoctors.find(d => d.id === originalDoctorId);
    if (tempOldDoctor) {
        tempOldDoctor.assignedHours -= durationMinutes;
        const originalLectureStartSlotIndex = timeSlots.indexOf(originalTimeSlot);
        for (let i = 0; i < slotsOccupied; i++) {
            const currentOriginalSlot = timeSlots[originalLectureStartSlotIndex + i];
            if (currentOriginalSlot && tempDoctorSchedules[originalDoctorId] && tempDoctorSchedules[originalDoctorId][originalDay]) {
                tempDoctorSchedules[originalDoctorId][originalDay][currentOriginalSlot] = null;
            }
        }
    }
    for (let i = 0; i < slotsOccupied; i++) {
        const currentOriginalSlot = timeSlots[timeSlots.indexOf(originalTimeSlot) + i];
        if (currentOriginalSlot && tempRoomAvailability[originalLectureRoomId] && tempRoomAvailability[originalLectureRoomId][originalDay]) {
            tempRoomAvailability[originalLectureRoomId][originalDay][currentOriginalSlot] = true;
        }
    }

    // Now, check availability at the target using these temporary states
    const newDoctorTemp = tempDoctors.find(d => d.id === targetDoctorId);
    if (!newDoctorTemp) {
        showMessage('خطأ داخلي: الدكتور الهدف غير موجود.', 'error');
        selectedLectureForMove = null;
        displayGeneratedSchedules();
        return;
    }

    const doctorAvailable = isDoctorAvailable(newDoctorTemp, targetDay, targetTimeSlot, durationMinutes, tempDoctorSchedules);
    const roomAvailable = isRoomAvailable(room, targetDay, targetTimeSlot, durationMinutes, tempRoomAvailability);

    if (!doctorAvailable) {
        showMessage(`الدكتور ${newDoctorTemp.name} غير متاح في ${daysArabic[targetDay]} ${convertTo12HourFormat(targetTimeSlot)} أو سيتجاوز ساعاته. لا يمكن النقل.`, 'warning');
        selectedLectureForMove = null;
        displayGeneratedSchedules();
        return;
    }

    if (!roomAvailable) {
        showMessage(`القاعة ${room.name} غير متاحة في ${daysArabic[targetDay]} ${convertTo12HourFormat(targetTimeSlot)}. لا يمكن النقل.`, 'warning');
        selectedLectureForMove = null;
        displayGeneratedSchedules();
        return;
    }

    // Final check for consecutive slots at target (should cover doctor and room availability within the new block)
    const targetTimeSlotIndex = timeSlots.indexOf(targetTimeSlot);
    for (let i = 0; i < slotsOccupied; i++) {
        const checkSlot = timeSlots[targetTimeSlotIndex + i];
        if (!checkSlot) {
            showMessage('لا توجد فترات زمنية كافية في الموقع الجديد. لا يمكن النقل.', 'warning');
            selectedLectureForMove = null;
            displayGeneratedSchedules();
            return;
        }
        const doctorSlotOccupied = (tempDoctorSchedules[targetDoctorId] && tempDoctorSchedules[targetDoctorId][targetDay] && tempDoctorSchedules[targetDoctorId][targetDay][checkSlot]);
        const roomSlotOccupied = (tempRoomAvailability[room.id] && tempRoomAvailability[room.id][targetDay] && !tempRoomAvailability[room.id][targetDay][checkSlot]); // If room is not available
        
        if (doctorSlotOccupied || !roomSlotOccupied) {
             showMessage('تعارض في الموقع الجديد خلال التحقق الأخير (قد يكون الوقت محجوزاً أو القاعة غير متاحة). لا يمكن النقل.', 'warning');
             selectedLectureForMove = null;
             displayGeneratedSchedules();
             return;
        }
    }
    // --- نهاية تحقق الصلاحية ---

    // الآن، قم بتنفيذ النقل الفعلي والدائم
    const newLectureData = {
        ...lectureData,
        doctorId: targetDoctorId,
        doctorName: newDoctorTemp.name,
        startTime: targetTimeSlot,
    };

    // إزالة دائمة من المكان الأصلي
    const oldDoctorGlobal = doctors.find(d => d.id === originalDoctorId);
    if (oldDoctorGlobal) {
        oldDoctorGlobal.assignedHours -= durationMinutes;
    }
    const originalLectureStartSlotIndex = timeSlots.indexOf(originalTimeSlot);
    for (let i = 0; i < slotsOccupied; i++) {
        const currentOriginalSlot = timeSlots[originalLectureStartSlotIndex + i];
        if (currentOriginalSlot) {
            if (schedule[originalDay] && schedule[originalDay][currentOriginalSlot] && schedule[originalDay][currentOriginalSlot][originalLectureRoomId]) {
                delete schedule[originalDay][currentOriginalSlot][originalLectureRoomId];
            }
            if (roomAvailability[originalLectureRoomId] && roomAvailability[originalLectureRoomId][originalDay]) {
                roomAvailability[originalLectureRoomId][originalDay][currentOriginalSlot] = true;
            }
            if (doctorSchedules[originalDoctorId] && doctorSchedules[originalDoctorId][originalDay]) {
                doctorSchedules[originalDoctorId][originalDay][currentOriginalSlot] = null;
            }
        }
    }

    // إضافة دائمة إلى المكان الجديد
    const newDoctorGlobal = doctors.find(d => d.id === targetDoctorId);
    if (newDoctorGlobal) {
        newDoctorGlobal.assignedHours += durationMinutes;
    }
    const targetLectureStartSlotIndex = timeSlots.indexOf(targetTimeSlot);
    for (let i = 0; i < slotsOccupied; i++) {
        const currentTargetSlot = timeSlots[targetLectureStartSlotIndex + i];
        if (currentTargetSlot) {
            if (!schedule[targetDay]) schedule[targetDay] = {};
            if (!schedule[targetDay][currentTargetSlot]) schedule[targetDay][currentTargetSlot] = {};
            schedule[targetDay][currentTargetSlot][originalLectureRoomId] = newLectureData;

            if (!roomAvailability[originalLectureRoomId]) roomAvailability[originalLectureRoomId] = {};
            if (!roomAvailability[originalLectureRoomId][targetDay]) roomAvailability[originalLectureRoomId][targetDay] = {};
            roomAvailability[originalLectureRoomId][targetDay][currentTargetSlot] = false;

            if (!doctorSchedules[targetDoctorId]) doctorSchedules[targetDoctorId] = {};
            if (!doctorSchedules[targetDoctorId][targetDay]) doctorSchedules[targetDoctorId][targetDay] = {};
            doctorSchedules[targetDoctorId][targetDay][currentTargetSlot] = newLectureData;
        }
    }

    saveData('generatedSchedule', schedule);
    saveData('doctorSchedules', doctorSchedules);
    saveData('doctors', doctors);

    showMessage('تم نقل المحاضرة بنجاح!', 'success');
    selectedLectureForMove = null;
    displayGeneratedSchedules();
};


const addContentEditableListeners = () => {
    document.querySelectorAll('.schedule-slot [contenteditable="true"]').forEach(element => {
        element.removeEventListener('focus', handleContentEditableFocus);
        element.removeEventListener('blur', handleContentEditableBlur);

        element.addEventListener('focus', handleContentEditableFocus);
        element.addEventListener('blur', handleContentEditableBlur);
    });
};

const handleContentEditableFocus = function() {
    this.setAttribute('data-original-text', this.textContent);
};

const handleContentEditableBlur = function() {
    const originalText = this.getAttribute('data-original-text');
    const newText = this.textContent.trim();

    if (originalText !== newText) {
        const lectureCard = this.closest('.schedule-slot');
        const doctorId = parseInt(lectureCard.getAttribute('data-doctor-id'));
        const day = lectureCard.getAttribute('data-original-day');
        const timeSlot = lectureCard.getAttribute('data-original-timeslot');
        const field = this.getAttribute('data-field');

        const lectureData = doctorSchedules[doctorId][day][timeSlot];
        if (lectureData) {
            lectureData[field] = newText;

            const roomId = lectureData.roomId;
            if (schedule[day] && schedule[day][timeSlot] && schedule[day][timeSlot][roomId]) {
                 schedule[day][timeSlot][roomId][field] = newText;
            }
            
            if (field === 'courseName') {
                const course = courses.find(c => c.id === lectureData.courseId);
                if (course) course.name = newText;
            } else if (field === 'sectionName') {
                const section = sections.find(s => s.id === lectureData.sectionId);
                if (section) section.name = newText;
            } else if (field === 'roomName') {
                const room = rooms.find(r => r.id === lectureData.roomId);
                if (room) room.name = newText;
            }

            saveData('generatedSchedule', schedule);
            saveData('doctorSchedules', doctorSchedules);
            saveData('courses', courses);
            saveData('sections', sections);
            saveData('rooms', rooms);

            showMessage('تم تحديث بيانات المحاضرة يدوياً!', 'success');
        } else {
            showMessage('فشل تحديث بيانات المحاضرة.', 'error');
        }
    }
};


// --- مستمعات الأحداث للأزرار والتحميل ---
document.getElementById('generate-schedule-btn').addEventListener('click', generateSchedules);

document.getElementById('export-schedules-btn').addEventListener('click', () => {
    const doctorScheduleCards = document.querySelectorAll('.doctor-schedule-card');
    if (doctorScheduleCards.length === 0) {
        showMessage('لا توجد جداول لتصديرها. الرجاء توليد الجداول أولاً.', 'warning');
        return;
    }

    showMessage('جاري تصدير الجداول كصور...', 'info', 5000);

    doctorScheduleCards.forEach(card => {
        html2canvas(card, {
            scale: 2,
            logging: false,
            useCORS: true
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            const doctorName = card.querySelector('.card-header h2').textContent.replace(' جدول الدكتور: ', '').trim();
            link.download = `جدول-الدكتور-${doctorName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(error => {
            console.error('Error exporting schedule as image for card:', card.id, error);
            showMessage('حدث خطأ أثناء تصدير الجداول كصور.', 'error');
        });
    });
});

document.getElementById('print-all-schedules-btn').addEventListener('click', () => {
    const schedulesToPrint = document.getElementById('schedule-output');
    if (schedulesToPrint && schedulesToPrint.children.length === 0 || schedulesToPrint && document.getElementById('no-schedules-message') && !document.getElementById('no-schedules-message').classList.contains('hidden')) {
         showMessage('لا توجد جداول لطباعتها. الرجاء توليد الجداول أولاً.', 'warning');
         return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>جداول الدكاترة</title>');
    printWindow.document.write('<link rel="stylesheet" href="css/style.css">');
    printWindow.document.write('<link rel="stylesheet" href="css/print.css" media="print">');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="main-content">');
    printWindow.document.write('<h1 style="text-align: center; margin-bottom: 20px;">جداول الدكاترة</h1>');
    printWindow.document.write(schedulesToPrint.outerHTML);
    printWindow.document.write('</div></body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
});


document.getElementById('clear-schedules-btn').addEventListener('click', () => {
    if (confirm('هل أنت متأكد من بدء فصل جديد؟ سيتم مسح جميع الجداول المجدولة حالياً! لن يتم مسح بيانات الدكاترة والمقررات والشعب والقاعات.')) {
        clearData('generatedSchedule');
        clearData('doctorSchedules');
        doctors.forEach(doc => doc.assignedHours = 0);
        saveData('doctors', doctors);
        sections.forEach(sec => sec.isScheduled = false);
        saveData('sections', sections);

        displayGeneratedSchedules();
        showMessage('تم مسح الجداول بنجاح. يمكنك الآن البدء بجدولة فصل جديد.', 'info');
        document.getElementById('generation-status').innerHTML = '<i class="fas fa-exclamation-triangle"></i> تم مسح الجداول. يمكنك الآن توليد جداول جديدة.';
        document.getElementById('generation-status').className = 'status-message info';
        document.getElementById('generation-status').style.display = 'flex';
    }
});


// زر التبديل لوضع التحرير (Edit Mode Toggle)
document.getElementById('edit-schedule-btn').addEventListener('click', () => {
    if (editMode) {
        disableEditMode(true); // حفظ التغييرات والخروج
    } else {
        enableEditMode(); // تفعيل وضع التحرير
    }
});

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    disableEditMode(false); // إلغاء وضع التحرير بدون حفظ
});


document.addEventListener('DOMContentLoaded', () => {
    const statusMessageElem = document.getElementById('generation-status');
    const noSchedulesMessage = document.getElementById('no-schedules-message');

    const storedSchedule = getData('generatedSchedule');
    const storedDoctorSchedules = getData('doctorSchedules');
    const storedDoctors = getData('doctors');
    const storedSections = getData('sections');

    if (storedSchedule && Object.keys(storedSchedule).length > 0 &&
        storedDoctorSchedules && Object.keys(storedDoctorSchedules).length > 0 &&
        storedDoctors && storedDoctors.length > 0) {
        
        Object.assign(schedule, storedSchedule);
        Object.assign(doctorSchedules, storedDoctorSchedules);
        doctors = storedDoctors;
        sections = storedSections;

        rooms.forEach(room => {
            roomAvailability[room.id] = {};
            days.forEach(day => {
                roomAvailability[room.id][day] = {};
                timeSlots.forEach(slot => {
                    roomAvailability[room.id][day][slot] = true;
                    if (schedule[day] && schedule[day][slot] && schedule[day][slot][room.id]) {
                        roomAvailability[room.id][day][slot] = false;
                    }
                });
            });
        });

        statusMessageElem.innerHTML = '<i class="fas fa-info-circle"></i> تم تحميل الجداول السابقة.';
        statusMessageElem.className = 'status-message info';
        statusMessageElem.style.display = 'flex';
        displayGeneratedSchedules();
    } else {
        statusMessageElem.innerHTML = '<i class="fas fa-exclamation-triangle"></i> لا توجد جداول سابقة. الرجاء إدخال البيانات وتوليد الجداول.';
        statusMessageElem.className = 'status-message warning';
        statusMessageElem.style.display = 'flex';
        noSchedulesMessage.classList.remove('hidden');
    }
});
