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

const MIN_BREAK_TIME_MINUTES = 0; // تم ضبطه على 0 للسماح بالجدولة المتتالية دون فاصل إجباري

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
    console.log(`[hasEnoughBreakTime] Checking for doctor ${doctorId} on ${day} at ${minutesToTime(currentStartTimeMinutes)}`);
    let prevLectureEndTimeMinutes = -1;
    const currentSlotIndex = timeSlots.indexOf(timeSlots.find(slot => timeToMinutes(slot) === currentStartTimeMinutes));

    for (let i = currentSlotIndex - 1; i >= 0; i--) {
        const prevSlotToCheck = timeSlots[i];
        const lectureAtPrevSlot = currentDoctorSchedulesState[doctorId][day][prevSlotToCheck];

        if (lectureAtPrevSlot) {
            const lectureStartInPrevSlot = lectureAtPrevSlot.startTime;
            const lectureDurationInPrevSlot = (lectureAtPrevSlot.type === 'long' ? LECTURE_DURATION_LONG : LECTURE_DURATION_SHORT);
            prevLectureEndTimeMinutes = timeToMinutes(lectureStartInPrevSlot) + lectureDurationInPrevSlot;
            console.log(`[hasEnoughBreakTime] Found previous lecture for doctor ${doctorId} at ${prevSlotToCheck}, ends at ${minutesToTime(prevLectureEndTimeMinutes)}`);
            break;
        }
    }

    if (prevLectureEndTimeMinutes !== -1) {
        const breakDuration = currentStartTimeMinutes - prevLectureEndTimeMinutes;
        console.log(`[hasEnoughBreakTime] Break duration: ${breakDuration} minutes. Required: ${MIN_BREAK_TIME_MINUTES} minutes.`);
        if (breakDuration < MIN_BREAK_TIME_MINUTES) {
            console.log(`[hasEnoughBreakTime] FAIL: Not enough break time.`);
            return false;
        }
    }
    console.log(`[hasEnoughBreakTime] PASS: Enough break time or no previous lecture.`);
    return true;
};


const isDoctorAvailable = (doctor, day, startTime, lectureLengthMinutes, currentDoctorSchedulesState) => {
    console.log(`[isDoctorAvailable] Checking doctor ${doctor.name} (${doctor.id}) for ${day} at ${startTime} for ${lectureLengthMinutes} mins.`);
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

    // 1. قيد الوقت اليومي (8 صباحًا - 5 مساءً)
    if (startLectureMinutes < DAY_START_MINUTES || endLectureMinutes > DAY_END_MINUTES + 1) { // +1 to allow 17:00-17:50 to fit
        console.log(`[isDoctorAvailable] FAIL: Outside daily working hours (8AM-5PM). Start: ${startTime}, End: ${minutesToTime(endLectureMinutes)}`);
        return false;
    }

    // 2. تحقق من الأوقات المتاحة للدكتور بشكل عام لهذا اليوم
    const availableDaySlot = doctor.availableTimes[day];
    if (!availableDaySlot || timeToMinutes(availableDaySlot.start) === -1 || timeToMinutes(availableDaySlot.end) === -1) {
        console.log(`[isDoctorAvailable] FAIL: Doctor ${doctor.name} has no general availability set for ${day}.`);
        return false;
    }

    const doctorAvailableStartMinutes = timeToMinutes(availableDaySlot.start);
    const doctorAvailableEndMinutes = timeToMinutes(availableDaySlot.end);

    if (startLectureMinutes < doctorAvailableStartMinutes || endLectureMinutes > doctorAvailableEndMinutes) {
        console.log(`[isDoctorAvailable] FAIL: Lecture time (${startTime}-${minutesToTime(endLectureMinutes)}) outside doctor's general availability (${availableDaySlot.start}-${availableDaySlot.end}) for ${day}.`);
        return false;
    }

    // 3. تحقق من الأوقات غير المناسبة للدكتور
    const arabicDayMap = {
        'الأحد': 'sunday', 'الإثنين': 'monday', 'الثلاثاء': 'tuesday',
        'الأربعاء': 'wednesday', 'الخميس': 'thursday', 'الجمعة': 'friday', 'السبت': 'saturday'
    };
    for (const forbiddenTimeRange of doctor.unavailableTimes) {
        const parts = forbiddenTimeRange.split(' ');
        if (parts.length >= 3) {
            const forbiddenDayId = parts[0].trim();
            const forbiddenStartStr = parts[1].split('-')[0].trim();
            const forbiddenEndStr = parts[1].split('-')[1].trim();

            if (forbiddenDayId === day) {
                const forbiddenStartMinutes = timeToMinutes(forbiddenStartStr);
                const forbiddenEndMinutes = timeToMinutes(forbiddenEndStr);

                if (!(endLectureMinutes <= forbiddenStartMinutes || startLectureMinutes >= forbiddenEndMinutes)) {
                    console.log(`[isDoctorAvailable] FAIL: Lecture time (${startTime}-${minutesToTime(endLectureMinutes)}) conflicts with doctor's unavailable time (${forbiddenTimeRange}) for ${day}.`);
                    return false;
                }
            }
        }
    }

    // 4. تحقق من عدم وجود تعارض في جدول الدكتور (المحاضرات المجدولة بالفعل)
    const startIndexInSlots = timeSlots.indexOf(startTime);
    const slotsNeeded = Math.ceil(lectureLengthMinutes / 30);

    for (let i = 0; i < slotsNeeded; i++) {
        const currentSlot = timeSlots[startIndexInSlots + i];
        if (!currentSlot) {
            console.log(`[isDoctorAvailable] FAIL: Not enough time slots available for duration starting at ${startTime}.`);
            return false;
        }
        if (currentDoctorSchedulesState[doctor.id][day] && currentDoctorSchedulesState[doctor.id][day][currentSlot]) {
            console.log(`[isDoctorAvailable] FAIL: Doctor ${doctor.name} already has a lecture at ${day} ${currentSlot}. Conflict detected.`);
            return false;
        }
    }

    // 5. تحقق من وجود فاصل زمني كافٍ قبل المحاضرة الحالية
    if (!hasEnoughBreakTime(doctor.id, day, startLectureMinutes, currentDoctorSchedulesState)) {
        console.log(`[isDoctorAvailable] FAIL: Not enough break time for doctor ${doctor.name} before ${startTime}.`);
        return false;
    }

    console.log(`[isDoctorAvailable] PASS: Doctor ${doctor.name} is available.`);
    return true;
};

const isRoomAvailable = (room, day, startTime, lectureLengthMinutes, currentRoomAvailabilityState) => {
    console.log(`[isRoomAvailable] Checking room ${room.name} (${room.id}) for ${day} at ${startTime} for ${lectureLengthMinutes} mins.`);
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

    // 1. قيد الوقت اليومي (8 صباحًا - 5 مساءً)
    if (startLectureMinutes < DAY_START_MINUTES || endLectureMinutes > DAY_END_MINUTES + 1) {
        console.log(`[isRoomAvailable] FAIL: Outside daily working hours (8AM-5PM). Start: ${startTime}, End: ${minutesToTime(endLectureMinutes)}`);
        return false;
    }

    // 2. تحقق من الأوقات ممنوعة لاستخدام المعامل (فقط للمعامل)
    if (room.type === 'lab') {
        for (const forbiddenTimeRange of room.forbiddenTimes) {
            const parts = forbiddenTimeRange.split(' ');
            if (parts.length >= 3) {
                const forbiddenDayId = parts[0].trim();
                const forbiddenStartStr = parts[1].split('-')[0].trim();
                const forbiddenEndStr = parts[1].split('-')[1].trim();

                if (forbiddenDayId === day) {
                    const forbiddenStartMinutes = timeToMinutes(forbiddenStartStr);
                    const forbiddenEndMinutes = timeToMinutes(forbiddenEndStr);

                    if (!(endLectureMinutes <= forbiddenStartMinutes || startLectureMinutes >= forbiddenEndMinutes)) {
                        console.log(`[isRoomAvailable] FAIL: Lecture time (${startTime}-${minutesToTime(endLectureMinutes)}) conflicts with room's forbidden time (${forbiddenTimeRange}) for ${day}.`);
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
        if (!currentSlot) {
            console.log(`[isRoomAvailable] FAIL: Not enough time slots available for duration starting at ${startTime}.`);
            return false;
        }
        if (currentRoomAvailabilityState[room.id] && currentRoomAvailabilityState[room.id][day] && !currentRoomAvailabilityState[room.id][day][currentSlot]) {
            console.log(`[isRoomAvailable] FAIL: Room ${room.name} is already occupied at ${day} ${currentSlot}. Conflict detected.`);
            return false;
        }
    }
    console.log(`[isRoomAvailable] PASS: Room ${room.name} is available.`);
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

    const sortedLectures = [...lecturesToSchedule].sort((a, b) => {
        // 1. الأولوية للمحاضرات الطويلة (100 دقيقة) قبل القصيرة (50 دقيقة) لنفس المقرر والشعبة
        if (a.sectionId === b.sectionId && a.courseId === b.id && a.partOrder && b.partOrder) { // Added course.id for robust check
            if (a.durationMinutes === LECTURE_DURATION_LONG && b.durationMinutes === LECTURE_DURATION_SHORT) return -1; // a (100) comes before b (50)
            if (a.durationMinutes === LECTURE_DURATION_SHORT && b.durationMinutes === LECTURE_DURATION_LONG) return 1;  // b (100) comes before a (50)
        }

        // 2. ثم، الأولوية للمقررات التي تتطلب معمل (لتجد قاعة معمل مبكراً)
        const courseA = courses.find(c => c.id === a.courseId);
        const courseB = courses.find(c => c.id === b.courseId);
        if (courseA && courseB) {
            if (courseA.requiresLab && !courseB.requiresLab) return -1;
            if (!courseA.requiresLab && courseB.requiresLab) return 1;
        }

        // 3. ثم، الأولوية للمقررات ذات الساعات الأسبوعية الأكبر (لأنها قد تكون أصعب في الجدولة)
        if (courseA && courseB && courseA.hours !== courseB.hours) {
            return courseB.hours - courseA.hours;
        }

        // 4. ثم، الأولوية للشعب ذات عدد الطلاب الأكبر (لتجد قاعات أكبر مبكراً)
        const sectionA = sections.find(s => s.id === a.sectionId);
        const sectionB = sections.find(s => s.id === b.sectionId);
        if (sectionA && sectionB) {
            return sectionB.students - sectionA.students;
        }

        // 5. أخيراً، ترتيب أبجدي لأسماء المقررات لتسلسل ثابت
        if (courseA && courseB) {
            return courseA.name.localeCompare(courseB.name);
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
                            const slotsNeeded = Math.ceil(lectureLengthMinutes / 30);

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
                                        startTime: timeSlot,
                                        durationMinutes: lectureLengthMinutes,
                                        slotsOccupied: slotsNeeded,
                                        lectureIndex: lectureUnit.lectureIndex,
                                        courseCode: course.code,
                                        isLab: course.requiresLab
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
    attachClickListenersForModal();
};

// --- وظائف التحرير بالنافذة المنبثقة (Modal-Based Editing Functions) ---
const enableEditMode = () => {
    editMode = true;
    document.getElementById('edit-schedule-btn').classList.add('btn-warning');
    document.getElementById('edit-schedule-btn').innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
    document.getElementById('cancel-edit-btn').classList.remove('hidden');

    displayGeneratedSchedules(); // إعادة عرض لتطبيق كلاسات وضع التحرير و contenteditable="true"

    showMessage('وضع التحرير مفعل. انقر على محاضرة لفتح نافذة التعديل.', 'info', 7000);
    console.log('[Edit Mode] Enabled.');
};

const disableEditMode = (saveChanges = true) => {
    editMode = false;
    document.getElementById('edit-schedule-btn').classList.remove('btn-warning');
    document.getElementById('edit-schedule-btn').innerHTML = '<i class="fas fa-edit"></i> تحرير الجداول';
    document.getElementById('cancel-edit-btn').classList.add('hidden');

    document.querySelectorAll('.selected-for-move').forEach(el => el.classList.remove('selected-for-move'));
    document.querySelectorAll('.selected-move-target').forEach(el => el.classList.remove('selected-move-target'));

    displayGeneratedSchedules(); // إعادة عرض لإزالة كلاسات وضع التحرير و contenteditable="true"

    if (saveChanges) {
        showMessage('تم الخروج من وضع التحرير.', 'info');
    } else {
        showMessage('تم إلغاء وضع التحرير.', 'info');
    }
    selectedLectureForMove = null;
    editingLectureId = null; // Clear editing ID
    console.log(`[Edit Mode] Disabled. Save changes: ${saveChanges}`);
};


// تغيير مستمع الأحداث إلى click لفتح المودال
const attachClickListenersForModal = () => {
    // إزالة المستمعات القديمة لمنع التكرار
    document.querySelectorAll('.schedule-slot').forEach(lectureCard => {
        lectureCard.removeEventListener('click', handleLectureClickForModal);
    });

    if (editMode) {
        document.querySelectorAll('.schedule-slot').forEach(lectureCard => {
            lectureCard.addEventListener('click', handleLectureClickForModal); // Add new click listener
        });
    }
};

const handleLectureClickForModal = (e) => {
    if (!editMode) return;

    const lectureCard = e.currentTarget;
    editingLectureId = lectureCard.getAttribute('data-lecture-id');

    const doctorId = parseInt(lectureCard.getAttribute('data-doctor-id'));
    const day = lectureCard.getAttribute('data-original-day');
    const timeSlot = lectureCard.getAttribute('data-original-timeslot');

    const lectureData = doctorSchedules[doctorId][day][timeSlot];
    if (lectureData) {
        openEditModal(lectureData);
    } else {
        showMessage('خطأ: لم يتم العثور على بيانات المحاضرة.', 'error');
        console.error('Lecture data not found for clicked card:', lectureCard);
    }
};


// --- وظائف المودال (جديد) ---
const editModal = document.getElementById('edit-lecture-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const modalEditForm = document.getElementById('modal-edit-form');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalRemoveBtn = document.getElementById('modal-remove-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalValidationFeedback = document.getElementById('modal-validation-feedback');

const modalNewDaySelect = document.getElementById('modal-new-day');
const modalNewTimeSelect = document.getElementById('modal-new-time');
const modalNewRoomSelect = document.getElementById('modal-new-room');
const modalNewDoctorSelect = document.getElementById('modal-new-doctor');

let currentLectureBeingEdited = null; // Store full lecture data for editing in modal

const openEditModal = (lectureData) => {
    currentLectureBeingEdited = lectureData;
    console.log('[Modal] Opening modal for lecture:', lectureData);

    // Populate current lecture info
    document.getElementById('modal-current-course').textContent = lectureData.courseName;
    document.getElementById('modal-current-section').textContent = lectureData.sectionName;
    document.getElementById('modal-current-doctor').textContent = lectureData.doctorName;
    document.getElementById('modal-current-room').textContent = lectureData.roomName;
    document.getElementById('modal-current-day').textContent = daysArabic[lectureData.originalDay];
    document.getElementById('modal-current-time').textContent = convertTo12HourFormat(lectureData.originalTimeSlot);

    // Populate dropdowns
    populateModalDropdowns(lectureData);

    // Set initial values in dropdowns (current lecture's values)
    modalNewDaySelect.value = lectureData.originalDay;
    modalNewTimeSelect.value = lectureData.originalTimeSlot;
    modalNewRoomSelect.value = lectureData.roomId;
    modalNewDoctorSelect.value = lectureData.doctorId; // Default to current doctor

    modalValidationFeedback.classList.add('hidden'); // Hide validation messages initially

    editModal.classList.remove('hidden'); // Show the modal
    // Attach validation listeners after modal is open and populated
    attachModalValidationListeners();
};

const closeEditModal = () => {
    editModal.classList.add('hidden'); // Hide the modal
    currentLectureBeingEdited = null;
    editingLectureId = null;
    modalEditForm.reset(); // Clear form fields
    modalValidationFeedback.classList.add('hidden'); // Hide validation messages
    // Re-render schedules to ensure no lingering visual selection
    displayGeneratedSchedules();
    console.log('[Modal] Modal closed.');
    // Detach validation listeners when modal is closed
    detachModalValidationListeners();
};

const populateModalDropdowns = (currentLecture) => {
    // Populate Day dropdown
    modalNewDaySelect.innerHTML = '<option value="">اختر يومًا</option>';
    days.forEach(day => {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = daysArabic[day];
        modalNewDaySelect.appendChild(option);
    });

    // Populate Time dropdown
    modalNewTimeSelect.innerHTML = '<option value="">اختر وقتًا</option>';
    timeSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = convertTo12HourFormat(slot);
        modalNewTimeSelect.appendChild(option);
    });

    // Populate Room dropdown
    modalNewRoomSelect.innerHTML = '<option value="">اختر قاعة</option>';
    rooms.forEach(room => {
        const option = document(
    <output truncated>
