// js/generate.js

let doctors = getData('doctors');
let courses = getData('courses');
let sections = getData('sections');
let rooms = getData('rooms');

const schedule = {}; // الجدول العام
const doctorSchedules = {}; // جداول الدكاترة الفردية
const roomAvailability = {}; // توافر القاعات

// أوقات المحاضرات المتاحة من 8:00 صباحًا إلى 5:00 مساءً (بنظام 24 ساعة)
const timeSlots = [
    "08:00", "08:50", "09:40", "10:30", "11:20", "12:10", "13:00", "13:50", "14:40", "15:30", "16:20", "17:10" // 17:10 PM is 5:10 PM, last slot ends at 18:00 which is 6 PM
];

const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];

const lectureDurations = {
    short: 50,  // 1 hour unit in course.hours (e.g., for 1-hour courses or part of 3-hour courses)
    long: 100   // 2 hour units in course.hours (e.g., for 2-hour courses or part of 3-hour courses)
};
const MIN_BREAK_TIME_MINUTES = 10; // 10 دقائق فاصل بين المحاضرات

// تعريف أوقات بداية ونهاية اليوم الدراسي الحضوري (بنظام الدقائق من منتصف الليل)
const DAY_START_MINUTES = timeToMinutes("08:00"); // 8:00 AM
const DAY_END_MINUTES = timeToMinutes("17:00");   // 5:00 PM

// --- متغيرات وضع التحرير الجديد ---
let editMode = false;
let selectedLectureForMove = null; // سيحتوي على بيانات المحاضرة التي تم النقر بزر الفأرة الأيمن عليها
let contextMenu = null; // للتحكم بالقائمة المنبثقة

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
const hasEnoughBreakTime = (doctorId, day, currentStartTimeMinutes) => {
    const timeSlotIndex = timeSlots.indexOf(timeSlots.find(slot => timeToMinutes(slot) === currentStartTimeMinutes));
    if (timeSlotIndex === 0) return true; // أول محاضرة في اليوم لا تحتاج لفاصل قبلها

    const prevTimeSlot = timeSlots[timeSlotIndex - 1];
    const prevLectureData = doctorSchedules[doctorId][day][prevTimeSlot];

    if (prevLectureData) {
        const prevLectureEndTimeMinutes = timeToMinutes(prevLectureData.startTime) + lectureDurations[prevLectureData.type];
        if (currentStartTimeMinutes - prevLectureEndTimeMinutes < MIN_BREAK_TIME_MINUTES) {
            return false; // لا يوجد وقت كاف للراحة
        }
    }
    return true;
};

const isDoctorAvailable = (doctor, day, startTime, lectureLengthMinutes) => {
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

    // 1. قيد الوقت اليومي (8 صباحًا - 5 مساءً)
    if (startLectureMinutes < DAY_START_MINUTES || endLectureMinutes > DAY_END_MINUTES) {
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
        const parts = forbiddenTimeRange.split(/[\s-]/).filter(Boolean);
        if (parts.length >= 3) {
            const forbiddenDayArabic = parts[0].trim();
            const forbiddenDayEnglish = arabicDayMap[forbiddenDayArabic] || forbiddenDayArabic.toLowerCase();
            const forbiddenStartStr = parts[1].trim();
            const forbiddenEndStr = parts[2].trim();

            if (forbiddenDayEnglish === day) {
                const forbiddenStartMinutes = timeToMinutes(forbiddenStartStr);
                const forbiddenEndMinutes = timeToMinutes(forbiddenEndStr);

                if (!(endLectureMinutes <= forbiddenStartMinutes || startLectureMinutes >= forbiddenEndMinutes)) {
                    return false;
                }
            }
        }
    }

    // 4. تحقق من عدم وجود تعارض في جدول الدكتور (المحاضرات المجدولة بالفعل)
    const timeSlotIndex = timeSlots.indexOf(startTime);
    const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short);

    for (let i = 0; i < slotsNeeded; i++) {
        const currentSlot = timeSlots[timeSlotIndex + i];
        if (!currentSlot || doctorSchedules[doctor.id][day][currentSlot]) {
            return false;
        }
    }

    // 5. تحقق من وجود فاصل زمني كافٍ قبل المحاضرة الحالية
    if (!hasEnoughBreakTime(doctor.id, day, startLectureMinutes)) {
        return false;
    }

    return true;
};

const isRoomAvailable = (room, day, startTime, lectureLengthMinutes) => {
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

    // 1. قيد الوقت اليومي (8 صباحًا - 5 مساءً)
    if (startLectureMinutes < DAY_START_MINUTES || endLectureMinutes > DAY_END_MINUTES) {
        return false;
    }

    // 2. تحقق من الأوقات ممنوعة لاستخدام المعامل (فقط للمعامل)
    if (room.type === 'lab') {
        const arabicDayMap = {
            'الأحد': 'sunday', 'الإثنين': 'monday', 'الثلاثاء': 'tuesday',
            'الأربعاء': 'wednesday', 'الخميس': 'thursday', 'الجمعة': 'friday', 'السبت': 'saturday'
        };
        for (const forbiddenTimeRange of room.forbiddenTimes) {
            const parts = forbiddenTimeRange.split(/[\s-]/).filter(Boolean);
            if (parts.length >= 3) {
                const forbiddenDayArabic = parts[0].trim();
                const forbiddenDayEnglish = arabicDayMap[forbiddenDayArabic] || forbiddenDayArabic.toLowerCase();
                const forbiddenStartStr = parts[1].trim();
                const forbiddenEndStr = parts[2].trim();

                if (forbiddenDayEnglish === day) {
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
    const timeSlotIndex = timeSlots.indexOf(startTime);
    const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short);

    for (let i = 0; i < slotsNeeded; i++) {
        const currentSlot = timeSlots[timeSlotIndex + i];
        if (!currentSlot || schedule[day][currentSlot][room.id]) {
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

    initializeScheduleStructures();

    const lecturesToSchedule = [];
    sections.forEach(section => {
        const course = courses.find(c => c.id === section.courseId);
        if (!course) {
            console.warn(`Section ${section.name} linked to non-existent course.`);
            return;
        }
        
        let remainingHours = course.hours;
        let lectureCounter = 0;

        // تقسيم المقررات بدقة حسب عدد الساعات
        // 3 ساعات: 100 دقيقة + 50 دقيقة
        if (remainingHours === 3) {
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'long', durationMinutes: lectureDurations.long, lectureIndex: lectureCounter++
            });
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'short', durationMinutes: lectureDurations.short, lectureIndex: lectureCounter++
            });
            remainingHours = 0;
        } 
        // 2 ساعات: 50 دقيقة + 50 دقيقة
        else if (remainingHours === 2) {
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'short', durationMinutes: lectureDurations.short, lectureIndex: lectureCounter++
            });
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'short', durationMinutes: lectureDurations.short, lectureIndex: lectureCounter++
            });
            remainingHours = 0;
        } 
        // 1 ساعة: 50 دقيقة
        else if (remainingHours === 1) {
            lecturesToSchedule.push({
                sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                requiredType: 'short', durationMinutes: lectureDurations.short, lectureIndex: lectureCounter++
            });
            remainingHours = 0;
        } 
        // لأي ساعات أخرى (أكثر من 3 أو غير صحيحة)، نتبع المنطق السابق
        else {
            while (remainingHours > 0) {
                let lectureTypeForThisUnit = 'short'; // افتراضي قصير
                let durationForThisUnit = lectureDurations.short;
                let hoursConsumed = 1;

                if (remainingHours >= 2 && course.type === 'long') { // إذا كان المقرر يفضل الطويلة ولديه ساعتين على الأقل
                    lectureTypeForThisUnit = 'long';
                    durationForThisUnit = lectureDurations.long;
                    hoursConsumed = 2;
                }

                lecturesToSchedule.push({
                    sectionId: section.id, courseId: course.id, doctorId: section.doctorId,
                    requiredType: lectureTypeForThisUnit, durationMinutes: durationForThisUnit, lectureIndex: lectureCounter++
                });
                remainingHours -= hoursConsumed;
            }
        }
    });

    const sortedLectures = lecturesToSchedule.sort((a, b) => {
        if (a.requiredType === 'long' && b.requiredType === 'short') return -1;
        if (a.requiredType === 'short' && b.requiredType === 'long') return 1;

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

                if (isDoctorAvailable(doctor, day, timeSlot, lectureLengthMinutes)) {
                    for (const room of suitableRooms) {
                        if (isRoomAvailable(room, day, timeSlot, lectureLengthMinutes)) {
                            const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short);
                            const startIndex = timeSlots.indexOf(timeSlot);
                            let canScheduleInSlots = true;

                            for (let j = 0; j < slotsNeeded; j++) {
                                const currentSlot = timeSlots[startIndex + j];
                                if (!currentSlot || schedule[day][currentSlot][room.id]) {
                                    canScheduleInSlots = false;
                                    break;
                                }
                            }

                            if (canScheduleInSlots) {
                                for (let j = 0; j < slotsNeeded; j++) {
                                    const currentSlot = timeSlots[startIndex + j];
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
                                        durationSlots: slotsNeeded,
                                        lectureIndex: lectureUnit.lectureIndex
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
        const occupiedCells = new Set();

        timeSlots.forEach(timeSlot => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="schedule-table-time-header">${convertTo12HourFormat(timeSlot)}</td>`;

            days.forEach(day => {
                const td = document.createElement('td');
                td.className = `schedule-table-cell`;
                td.setAttribute('data-day', day);
                td.setAttribute('data-timeslot', timeSlot);
                td.setAttribute('data-doctorid', doctor.id);

                const cellId = `${doctorId}-${day}-${timeSlot}`;
                // هذا هو مفتاح الخلية التي قد تكون مشغولة من محاضرة طويلة سابقة
                // إذا كانت الخلية مشغولة، لا نعالجها هنا لأنها جزء من صف مدمج
                if (occupiedCells.has(cellId)) {
                    // لا نفعل شيئًا هنا، الخلية الأصلية (مع rowspan) ستغطيها
                    return;
                }

                const lecture = doctorSchedules[doctorId][day][timeSlot];
                if (lecture && lecture.startTime === timeSlot) { // تأكد أنه بداية المحاضرة وليس جزء منها
                    const lectureLengthMinutes = lectureDurations[lecture.type];
                    const slotsOccupied = Math.ceil(lectureLengthMinutes / lectureDurations.short);

                    if (slotsOccupied > 1) {
                        td.rowSpan = slotsOccupied;
                        // وضع علامة على الخلايا التالية كـ "مشغولة" لتجنب توليد TD إضافية لها
                        for (let i = 1; i < slotsOccupied; i++) {
                            const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + i;
                            if (nextTimeSlotIndex < timeSlots.length) {
                                occupiedCells.add(`${doctorId}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                            }
                        }
                    }

                    const lectureCard = document.createElement('div');
                    const courseColorClass = getCourseColorClass(lecture.courseId);
                    // Add class for edit mode to dim non-editable parts
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


                    lectureCard.innerHTML = `
                        <div class="schedule-slot-subject" ${editMode ? 'contenteditable="true"' : ''} data-field="courseName">${lecture.courseName}</div>
                        <div class="schedule-slot-info" ${editMode ? 'contenteditable="true"' : ''} data-field="sectionName">${lecture.sectionName}</div>
                        <div class="schedule-slot-info" ${editMode ? 'contenteditable="true"' : ''} data-field="roomName">${lecture.roomName}</div>
                        <div class="schedule-slot-info">(${lecture.type === 'short' ? 'قصيرة' : 'طويلة'})</div>
                    `;
                    td.appendChild(lectureCard);
                    td.classList.add('has-lecture');
                } else if (!lecture) { // If no lecture and not occupied, it's an empty cell
                    td.textContent = '';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    addContentEditableListeners(); // إعادة إضافة مستمعي الأحداث لتحرير النص المباشر
    addCellClickListeners(); // إضافة مستمعي الأحداث للنقر على الخلايا في وضع التحرير
};

// --- وظائف التحرير بالضغط بزر الفأرة الأيمن ---
const enableEditMode = () => {
    editMode = true;
    document.getElementById('edit-schedule-btn').classList.add('btn-warning');
    document.getElementById('edit-schedule-btn').innerHTML = '<i class="fas fa-save"></i> حفظ التغييرات';
    document.getElementById('cancel-edit-btn').classList.remove('hidden'); // إظهار زر الإلغاء

    document.querySelectorAll('.schedule-table-cell').forEach(cell => {
        cell.classList.add('edit-mode-active'); // لإضافة تنسيق بصري لوضع التحرير

        // مستمع للنقر بزر الفأرة الأيمن على المحاضرات الموجودة
        const lectureCard = cell.querySelector('.schedule-slot');
        if (lectureCard) {
            lectureCard.addEventListener('contextmenu', handleLectureRightClick);
        }

        // مستمع للنقر بزر الفأرة الأيمن على الخلايا الفارغة
        cell.addEventListener('contextmenu', handleEmptyCellRightClick);
    });
    // إعادة عرض الجداول لتطبيق الكلاسات contenteditable='true' و 'editable-lecture'
    displayGeneratedSchedules();
    showMessage('وضع التحرير مفعل. انقر بزر الفأرة الأيمن على محاضرة لنقلها أو على خلية فارغة لنقل محاضرة إليها.', 'info', 7000);
};

const disableEditMode = (saveChanges = true) => {
    editMode = false;
    document.getElementById('edit-schedule-btn').classList.remove('btn-warning');
    document.getElementById('edit-schedule-btn').innerHTML = '<i class="fas fa-edit"></i> تحرير الجداول';
    document.getElementById('cancel-edit-btn').classList.add('hidden'); // إخفاء زر الإلغاء

    document.querySelectorAll('.schedule-table-cell').forEach(cell => {
        cell.classList.remove('edit-mode-active'); // إزالة تنسيق وضع التحرير

        const lectureCard = cell.querySelector('.schedule-slot');
        if (lectureCard) {
            lectureCard.removeEventListener('contextmenu', handleLectureRightClick);
        }
        cell.removeEventListener('contextmenu', handleEmptyCellRightClick);
    });

    if (saveChanges) {
        // يتم حفظ البيانات تلقائياً عند كل تغيير مباشر أو نقل
        // لكن يمكن إضافة حفظ نهائي هنا إذا أردنا
        showMessage('تم الخروج من وضع التحرير.', 'info');
    } else {
        // إذا تم الإلغاء، قد تحتاج إلى استعادة الجداول من LocalStorage إذا كانت هناك تغييرات لم يتم حفظها
        // في هذا التصميم، التغييرات تُحفظ فوراً، لذا "إلغاء التحرير" يعني فقط الخروج من الوضع
        showMessage('تم إلغاء وضع التحرير.', 'info');
    }
    // إعادة عرض الجداول لإزالة الكلاسات contenteditable='true' و 'editable-lecture'
    displayGeneratedSchedules();
    selectedLectureForMove = null; // مسح المحاضرة المختارة للنقل
    hideContextMenu();
};

const handleLectureRightClick = (e) => {
    e.preventDefault(); // منع قائمة المتصفح الافتراضية
    if (!editMode) return;

    hideContextMenu(); // إخفاء أي قائمة سابقة

    const lectureCard = e.currentTarget; // العنصر الذي تم النقر عليه
    const lectureId = lectureCard.getAttribute('data-lecture-id');
    const doctorId = parseInt(lectureCard.getAttribute('data-doctor-id'));
    const day = lectureCard.getAttribute('data-original-day');
    const timeSlot = lectureCard.getAttribute('data-original-timeslot');

    selectedLectureForMove = {
        id: lectureId,
        originalDoctorId: doctorId,
        originalDay: day,
        originalTimeSlot: timeSlot,
        lectureData: doctorSchedules[doctorId][day][timeSlot] // جلب بيانات المحاضرة الكاملة
    };

    showMessage(`تم تحديد المحاضرة: ${selectedLectureForMove.lectureData.courseName} للدكتور ${selectedLectureForMove.lectureData.doctorName}. انقر بزر الفأرة الأيمن على خلية فارغة لنقلها.`, 'info', 5000);
    // تلوين المحاضرة المحددة (اختياري)
    lectureCard.classList.add('selected-for-move');
    // إخفاء المحاضرة المحددة في جدولها الأصلي (اختياري)
    // lectureCard.style.opacity = '0.5';

    showContextMenu(e.clientX, e.clientY, [
        { text: 'نقل هذه المحاضرة', action: () => {} } // مجرد إشارة للمستخدم
    ]);
};

const handleEmptyCellRightClick = (e) => {
    e.preventDefault(); // منع قائمة المتصفح الافتراضية
    if (!editMode || !selectedLectureForMove) return; // يجب أن تكون هناك محاضرة محددة للنقل

    hideContextMenu();

    const targetCell = e.currentTarget;
    const targetDay = targetCell.getAttribute('data-day');
    const targetTimeSlot = targetCell.getAttribute('data-timeslot');
    const targetDoctorId = parseInt(targetCell.getAttribute('data-doctorid'));

    const { lectureData, originalDoctorId, originalDay, originalTimeSlot } = selectedLectureForMove;
    const lectureType = lectureData.type;
    const durationSlots = lectureData.durationSlots;
    const lectureLengthMinutes = lectureDurations[lectureType];

    // --- تحقق من الصلاحية قبل النقل الفعلي ---
    const newDoctor = doctors.find(d => d.id === targetDoctorId);
    const room = rooms.find(r => r.id === lectureData.roomId); // القاعة تبقى نفسها عند النقل

    if (!newDoctor || !room) {
        showMessage('بيانات غير مكتملة (دكتور أو قاعة).', 'error');
        return;
    }

    // A. التحقق من توفر الخلية الهدف
    if (targetCell.querySelector('.schedule-slot')) {
        showMessage('الخلية الهدف مشغولة بالفعل. لا يمكن النقل.', 'error');
        selectedLectureForMove = null; // مسح التحديد
        displayGeneratedSchedules(); // لإزالة أي تلوين
        return;
    }

    // B. التحقق من أن هناك مساحة كافية للمحاضرة الطويلة
    const targetTimeSlotIndex = timeSlots.indexOf(targetTimeSlot);
    for (let i = 0; i < durationSlots; i++) {
        const checkSlot = timeSlots[targetTimeSlotIndex + i];
        if (!checkSlot) {
            showMessage('لا توجد فترات زمنية كافية في الموقع الجديد.', 'warning');
            selectedLectureForMove = null;
            displayGeneratedSchedules();
            return;
        }
        // تحقق من أن الخلايا اللاحقة فارغة
        const futureCell = document.querySelector(`td[data-day="${targetDay}"][data-timeslot="${checkSlot}"][data-doctorid="${targetDoctorId}"]`);
        if (futureCell && futureCell.querySelector('.schedule-slot') && futureCell.querySelector('.schedule-slot') !== lectureCard) { // Ensure it's not the lecture itself if it was already there (unlikely with this logic)
            showMessage('الموقع الجديد يتعارض مع محاضرة أخرى.', 'warning');
            selectedLectureForMove = null;
            displayGeneratedSchedules();
            return;
        }
    }


    // C. التحقق من توافر الدكتور والقاعة (باستخدام المنطق الذي يزيح المحاضرة مؤقتاً)
    const tempDoctorSchedules = JSON.parse(JSON.stringify(doctorSchedules));
    const tempRoomAvailability = JSON.parse(JSON.stringify(roomAvailability));
    const tempDoctors = JSON.parse(JSON.stringify(doctors));

    // إزالة المحاضرة مؤقتًا من جدولها الأصلي في النسخ المؤقتة
    const tempOldDoctor = tempDoctors.find(d => d.id === originalDoctorId);
    if (tempOldDoctor) {
        tempOldDoctor.assignedHours -= lectureLengthMinutes;
        for (let i = 0; i < durationSlots; i++) {
            const currentOriginalSlot = timeSlots[timeSlots.indexOf(originalTimeSlot) + i];
            if (currentOriginalSlot && tempDoctorSchedules[originalDoctorId] && tempDoctorSchedules[originalDoctorId][originalDay]) {
                tempDoctorSchedules[originalDoctorId][originalDay][currentOriginalSlot] = null;
            }
        }
    }
    for (let i = 0; i < durationSlots; i++) {
        const currentOriginalSlot = timeSlots[timeSlots.indexOf(originalTimeSlot) + i];
        if (currentOriginalSlot && tempRoomAvailability[lectureData.roomId] && tempRoomAvailability[lectureData.roomId][originalDay]) {
            tempRoomAvailability[lectureData.roomId][originalDay][currentOriginalSlot] = true;
        }
    }

    const newDoctorTemp = tempDoctors.find(d => d.id === targetDoctorId);

    const doctorAvailable = isDoctorAvailableCheckForDrag(newDoctorTemp, targetDay, targetTimeSlot, lectureLengthMinutes, tempDoctorSchedules);
    const roomAvailable = isRoomAvailableCheckForDrag(room, targetDay, targetTimeSlot, lectureLengthMinutes, tempRoomAvailability);

    if (!doctorAvailable) {
        showMessage(`الدكتور ${newDoctor.name} غير متاح في ${daysArabic[targetDay]} ${convertTo12HourFormat(targetTimeSlot)} أو سيتجاوز ساعاته.`, 'warning');
        selectedLectureForMove = null;
        displayGeneratedSchedules();
        return;
    }

    if (!roomAvailable) {
        showMessage(`القاعة ${room.name} غير متاحة في ${daysArabic[targetDay]} ${convertTo12HourFormat(targetTimeSlot)}.`, 'warning');
        selectedLectureForMove = null;
        displayGeneratedSchedules();
        return;
    }
    // --- نهاية تحقق الصلاحية ---

    // الآن نفذ النقل الفعلي
    const currentLectureId = selectedLectureForMove.id; // ID فريد للمحاضرة

    // 1. إزالة المحاضرة من مكانها الأصلي (بشكل دائم)
    const oldDoctorGlobal = doctors.find(d => d.id === originalDoctorId);
    if (oldDoctorGlobal) {
        oldDoctorGlobal.assignedHours -= lectureLengthMinutes;
    }
    for (let i = 0; i < durationSlots; i++) {
        const currentOriginalSlot = timeSlots[timeSlots.indexOf(originalTimeSlot) + i];
        if (currentOriginalSlot) {
            if (schedule[originalDay] && schedule[originalDay][currentOriginalSlot] && schedule[originalDay][currentOriginalSlot][lectureData.roomId]) {
                delete schedule[originalDay][currentOriginalSlot][lectureData.roomId];
            }
            if (roomAvailability[lectureData.roomId] && roomAvailability[lectureData.roomId][originalDay]) {
                roomAvailability[lectureData.roomId][originalDay][currentOriginalSlot] = true;
            }
            if (doctorSchedules[originalDoctorId] && doctorSchedules[originalDoctorId][originalDay]) {
                doctorSchedules[originalDoctorId][originalDay][currentOriginalSlot] = null;
            }
        }
    }

    // 2. إضافة المحاضرة إلى مكانها الجديد (بشكل دائم)
    const newLectureData = {
        ...lectureData, // نسخ البيانات الأصلية
        doctorId: targetDoctorId, // قد يتغير الدكتور إذا نقلت لجدول دكتور آخر
        doctorName: newDoctor.name,
        startTime: targetTimeSlot,
        // (day و roomId لا يتغيران عادة في هذا المنطق، ولكن startTime و doctorId قد يتغيران)
    };

    const newDoctorGlobal = doctors.find(d => d.id === targetDoctorId);
    if (newDoctorGlobal) {
        newDoctorGlobal.assignedHours += lectureLengthMinutes;
    }
    for (let i = 0; i < durationSlots; i++) {
        const currentTargetSlot = timeSlots[timeSlots.indexOf(targetTimeSlot) + i];
        if (currentTargetSlot) {
            if (!schedule[targetDay]) schedule[targetDay] = {};
            if (!schedule[targetDay][currentTargetSlot]) schedule[targetDay][currentTargetSlot] = {};
            schedule[targetDay][currentTargetSlot][lectureData.roomId] = newLectureData;

            if (!roomAvailability[lectureData.roomId]) roomAvailability[lectureData.roomId] = {};
            if (!roomAvailability[lectureData.roomId][targetDay]) roomAvailability[lectureData.roomId][targetDay] = {};
            roomAvailability[lectureData.roomId][targetDay][currentTargetSlot] = false;

            if (!doctorSchedules[targetDoctorId]) doctorSchedules[targetDoctorId] = {};
            if (!doctorSchedules[targetDoctorId][targetDay]) doctorSchedules[targetDoctorId][targetDay] = {};
            doctorSchedules[targetDoctorId][targetDay][currentTargetSlot] = newLectureData;
        }
    }

    // حفظ التغييرات
    saveData('generatedSchedule', schedule);
    saveData('doctorSchedules', doctorSchedules);
    saveData('doctors', doctors);

    showMessage('تم نقل المحاضرة بنجاح!', 'success');
    selectedLectureForMove = null; // مسح المحاضرة المحددة بعد النقل
    displayGeneratedSchedules(); // إعادة عرض لتحديث الجداول

    // إزالة أي كلاسات تلوين سابقة من المحاضرة التي تم تحديدها للنقل
    document.querySelectorAll('.selected-for-move').forEach(el => el.classList.remove('selected-for-move'));
};

const showContextMenu = (x, y, options) => {
    hideContextMenu(); // إخفاء أي قائمة موجودة

    contextMenu = document.createElement('div');
    contextMenu.className = 'custom-context-menu'; // ستحتاج إلى تنسيق هذا في style.css
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.right = 'auto'; // مهم لـ RTL

    options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'context-menu-item'; // ستحتاج إلى تنسيق هذا
        item.textContent = option.text;
        item.addEventListener('click', () => {
            option.action();
            hideContextMenu();
        });
        contextMenu.appendChild(item);
    });

    document.body.appendChild(contextMenu);

    // إخفاء القائمة عند النقر خارجها
    document.addEventListener('click', hideContextMenuOutside, { once: true });
};

const hideContextMenu = () => {
    if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
    }
    // إزالة تلوين المحاضرة المحددة (إذا لم يتم نقلها)
    document.querySelectorAll('.selected-for-move').forEach(el => el.classList.remove('selected-for-move'));
};

const hideContextMenuOutside = (event) => {
    // إخفاء القائمة فقط إذا لم يكن النقر داخلها
    if (contextMenu && !contextMenu.contains(event.target)) {
        hideContextMenu();
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

    doctorScheduleCards.forEach((card, index) => {
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
    if (schedulesToPrint && schedulesToPrint.children.length === 0 || document.getElementById('no-schedules-message').classList.contains('hidden')) { // Fixed logic
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


// زر التبديل لوضع التحرير
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
