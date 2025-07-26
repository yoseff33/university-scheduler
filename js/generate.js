// js/generate.js

let doctors = getData('doctors');
let courses = getData('courses');
let sections = getData('sections');
let rooms = getData('rooms');

const schedule = {};
const doctorSchedules = {};
const roomAvailability = {};

const timeSlots = [
    "08:00", "08:50", "09:40", "10:30", "11:20", "12:10", "13:00", "13:50", "14:40", "15:30", "16:20", "17:10"
];
const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];

const lectureDurations = {
    short: 50,
    long: 100
};
const MIN_BREAK_TIME_MINUTES = 10; // 10 دقائق فاصل بين المحاضرات (إذا كان ذلك ممكنًا)

// وظيفة الحصول على لون عشوائي بناءً على ID المقرر
const getCourseColorClass = (courseId) => {
    const colorClasses = [
        'lecture-color-0', 'lecture-color-1', 'lecture-color-2', 'lecture-color-3',
        'lecture-color-4', 'lecture-color-5', 'lecture-color-6'
    ];
    // استخدم ID المقرر لتوليد فهرس ثابت للون
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
        section.isScheduled = false; // Reset scheduling status
    });
};

const timeToMinutes = (timeStr) => {
    if (!timeStr) return -1;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// وظيفة مساعدة لتحديد ما إذا كان هناك وقت كافٍ للراحة بعد المحاضرة السابقة
const hasEnoughBreakTime = (doctorId, day, currentStartTimeMinutes, currentLectureType) => {
    const timeSlotIndex = timeSlots.indexOf(timeSlots.find(slot => timeToMinutes(slot) === currentStartTimeMinutes));
    if (timeSlotIndex === 0) return true; // أول محاضرة في اليوم لا تحتاج لفاصل قبلها

    const prevTimeSlot = timeSlots[timeSlotIndex - 1];
    const prevLectureData = doctorSchedules[doctorId][day][prevTimeSlot];

    if (prevLectureData) {
        // المحاضرة السابقة في نفس الـ time slot (لو كانت طويلة) لا تعتبر فاصل
        if (prevLectureData.startTime === prevTimeSlot && prevLectureData.type === 'long' && prevLectureData.durationSlots > 1) {
             // هذه الخلية هي جزء من محاضرة طويلة بدأت في timeSlotIndex - 1، لا تحتاج لفاصل
             return true;
        }

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

    const availableDaySlot = doctor.availableTimes[day];
    if (!availableDaySlot || timeToMinutes(availableDaySlot.start) === -1 || timeToMinutes(availableDaySlot.end) === -1) {
        return false;
    }

    const doctorAvailableStartMinutes = timeToMinutes(availableDaySlot.start);
    const doctorAvailableEndMinutes = timeToMinutes(availableDaySlot.end);

    if (startLectureMinutes < doctorAvailableStartMinutes || endLectureMinutes > doctorAvailableEndMinutes) {
        return false;
    }

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

    const timeSlotIndex = timeSlots.indexOf(startTime);
    const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short);

    for (let i = 0; i < slotsNeeded; i++) {
        const currentSlot = timeSlots[timeSlotIndex + i];
        if (!currentSlot || doctorSchedules[doctor.id][day][currentSlot]) {
            return false;
        }
    }

    // تحقق من وجود فاصل زمني كافٍ قبل المحاضرة الحالية
    if (!hasEnoughBreakTime(doctor.id, day, startLectureMinutes, lectureLengthMinutes)) {
        return false;
    }

    return true;
};

const isRoomAvailable = (room, day, startTime, lectureLengthMinutes) => {
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

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

    // نحدد المحاضرات التي يجب جدولتها (وليست الشعب)
    const lecturesToSchedule = [];
    sections.forEach(section => {
        const course = courses.find(c => c.id === section.courseId);
        if (!course) {
            console.warn(`Section ${section.name} linked to non-existent course.`);
            return;
        }
        // بناءً على course.hours، نحدد كم "وحدة محاضرة" يجب جدولتها
        // نفترض أن كل "ساعة" في course.hours هي وحدة تدريسية
        // إذا كان نوع المحاضرة "طويلة" (100 دقيقة)، فهي تستهلك وحدتين.
        // إذا كان نوع المحاضرة "قصيرة" (50 دقيقة)، فهي تستهلك وحدة واحدة.

        let remainingHours = course.hours;
        let lectureCounter = 0;

        while (remainingHours > 0) {
            let lectureTypeForThisUnit = course.type;
            let durationForThisUnit = lectureDurations[lectureTypeForThisUnit];
            let hoursConsumed = lectureTypeForThisUnit === 'long' ? 2 : 1; // كم وحدة ساعة تستهلك المحاضرة

            if (remainingHours < hoursConsumed) {
                // إذا لم يتبق ساعات كافية لمحاضرة كاملة من هذا النوع، اجعلها قصيرة
                lectureTypeForThisUnit = 'short';
                durationForThisUnit = lectureDurations.short;
                hoursConsumed = 1;
            }

            lecturesToSchedule.push({
                sectionId: section.id,
                courseId: course.id,
                doctorId: section.doctorId,
                requiredType: lectureTypeForThisUnit,
                durationMinutes: durationForThisUnit,
                lectureIndex: lectureCounter++ // لتمييز المحاضرات المتعددة لنفس المقرر
            });
            remainingHours -= hoursConsumed;
        }
    });

    // فرز المحاضرات لجدولة الصعب أولاً
    // (مثلاً، المحاضرات الطويلة أولاً، أو التي تتطلب معامل، أو الشعب الأكبر)
    const sortedLectures = lecturesToSchedule.sort((a, b) => {
        if (a.requiredType === 'long' && b.requiredType === 'short') return -1;
        if (a.requiredType === 'short' && b.requiredType === 'long') return 1;
        // هنا يمكن إضافة عوامل فرز أخرى (مثل الشعبة الأكبر، أو المعامل)
        return 0;
    });

    let successfullyScheduledCount = 0;
    let failedToScheduleCount = 0;
    let unscheduledLecturesDetails = []; // لتتبع المحاضرات التي لم يتم جدولتها

    for (const lectureUnit of sortedLectures) {
        let lectureScheduled = false;
        const doctor = doctors.find(d => d.id === lectureUnit.doctorId);
        const course = courses.find(c => c.id === lectureUnit.courseId);
        const section = sections.find(s => s.id === lectureUnit.sectionId);

        if (!doctor || !course || !section) {
            console.warn(`Skipping lecture unit: missing associated data for section ${section.name}.`);
            unscheduledLecturesDetails.push(`الشعبة "${section ? section.name : 'غير معروف'}" - المقرر "${course ? course.name : 'غير معروف'}" (بيانات غير مكتملة)`);
            failedToScheduleCount++;
            continue;
        }

        const lectureLengthMinutes = lectureUnit.durationMinutes;

        // محاولة توزيع المحاضرات عبر أيام الأسبوع بالتساوي (قدر الإمكان)
        // يمكن تحقيق ذلك عن طريق تدوير ترتيب الأيام أو محاولة الأيام التي لديها أقل عدد من محاضرات هذا الدكتور
        const doctorDaysLoad = {}; // { day: numLectures }
        days.forEach(day => doctorDaysLoad[day] = 0);
        for(const docDay in doctorSchedules[doctor.id]) {
            for(const slot in doctorSchedules[doctor.id][docDay]) {
                if(doctorSchedules[doctor.id][docDay][slot] && doctorSchedules[doctor.id][docDay][slot].startTime === slot) { // فقط بدايات المحاضرات
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
                                        lectureIndex: lectureUnit.lectureIndex // مؤشر الوحدة الفرعية للمحاضرة
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
    // حالة isScheduled للشعبة غير مستخدمة بنفس الأهمية الآن لأننا نتبع وحدات المحاضرات
    // ولكن يمكن تحديثها إذا تم جدولة *جميع* وحدات المحاضرة للشعبة
    sections.forEach(s => {
        s.isScheduled = lecturesToSchedule.filter(lu => lu.sectionId === s.id).every(lu => {
            // تحقق إذا ما تم جدولة هذه الوحدة في أي مكان في doctorSchedules
            const docSched = doctorSchedules[lu.doctorId];
            for (const day in docSched) {
                for (const slot in docSched[day]) {
                    if (docSched[day][slot] && docSched[day][slot].sectionId === lu.sectionId && docSched[day][slot].courseId === lu.courseId && docSched[day][slot].lectureIndex === lu.lectureIndex) {
                        return true;
                    }
                }
            }
            return false;
        });
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
                const cellId = `${doctorId}-${day}-${timeSlot}`;
                if (occupiedCells.has(cellId)) {
                    return;
                }

                const td = document.createElement('td');
                td.className = `schedule-table-cell`;
                td.setAttribute('data-day', day);
                td.setAttribute('data-timeslot', timeSlot);
                td.setAttribute('data-doctorid', doctor.id);

                const lecture = doctorSchedules[doctorId][day][timeSlot];
                if (lecture && lecture.startTime === timeSlot) {
                    const lectureLengthMinutes = lectureDurations[lecture.type];
                    const slotsOccupied = Math.ceil(lectureLengthMinutes / lectureDurations.short);

                    if (slotsOccupied > 1) {
                        td.rowSpan = slotsOccupied;
                        for (let i = 1; i < slotsOccupied; i++) {
                            const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + i;
                            if (nextTimeSlotIndex < timeSlots.length) {
                                occupiedCells.add(`${doctorId}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                            }
                        }
                    }

                    const lectureCard = document.createElement('div');
                    const courseColorClass = getCourseColorClass(lecture.courseId); // الحصول على لون المقرر
                    lectureCard.className = `schedule-slot draggable-lecture colored-lecture ${courseColorClass}`;
                    lectureCard.setAttribute('data-lecture-id', `${doctor.id}-${day}-${timeSlot}-${lecture.sectionId}-${lecture.courseId}-${lecture.lectureIndex}`); // ID فريد للمحاضرة
                    lectureCard.setAttribute('draggable', 'true');
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
                        <div class="schedule-slot-subject" contenteditable="true" data-field="courseName">${lecture.courseName}</div>
                        <div class="schedule-slot-info" contenteditable="true" data-field="sectionName">${lecture.sectionName}</div>
                        <div class="schedule-slot-info" contenteditable="true" data-field="roomName">${lecture.roomName}</div>
                        <div class="schedule-slot-info">(${lecture.type === 'short' ? 'قصيرة' : 'طويلة'})</div>
                    `;
                    td.appendChild(lectureCard);
                    td.classList.add('has-lecture');
                } else if (!lecture && !occupiedCells.has(cellId)) {
                    td.textContent = '';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    initDragula();
    addContentEditableListeners();
};

const addContentEditableListeners = () => {
    document.querySelectorAll('.schedule-slot [contenteditable="true"]').forEach(element => {
        element.addEventListener('focus', function() {
            this.setAttribute('data-original-text', this.textContent);
        });

        element.addEventListener('blur', function() {
            const originalText = this.getAttribute('data-original-text');
            const newText = this.textContent.trim();

            if (originalText !== newText) {
                const lectureCard = this.closest('.draggable-lecture');
                const doctorId = parseInt(lectureCard.getAttribute('data-doctor-id'));
                const day = lectureCard.getAttribute('data-original-day');
                const timeSlot = lectureCard.getAttribute('data-original-timeslot');
                const lectureIndex = parseInt(lectureCard.getAttribute('data-lecture-index')); // معرف المحاضرة الفرعية
                const field = this.getAttribute('data-field');

                const lectureData = doctorSchedules[doctorId][day][timeSlot];
                if (lectureData) {
                    lectureData[field] = newText;

                    const roomId = lectureData.roomId;
                    if (schedule[day] && schedule[day][timeSlot] && schedule[day][timeSlot][roomId]) {
                         schedule[day][timeSlot][roomId][field] = newText;
                    }
                    
                    // تحديث البيانات الأصلية (هذا الجزء يجب استخدامه بحذر)
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
        });
    });
};


const initDragula = () => {
    const containers = Array.from(document.querySelectorAll('.schedule-table-cell'));

    const drake = dragula(containers, {
        moves: function (el, source, handle, sibling) {
            return el.classList.contains('draggable-lecture');
        },
        accepts: function (el, target, source, sibling) {
            if (source === target) {
                return true;
            }

            if (target.children.length > 0 && target.querySelector('.draggable-lecture')) {
                showMessage('الخلية الهدف مشغولة بالفعل.', 'error');
                return false;
            }

            const lectureType = el.getAttribute('data-lecture-type');
            const durationSlots = parseInt(el.getAttribute('data-duration-slots'));

            const targetDay = target.getAttribute('data-day');
            const targetTimeSlot = target.getAttribute('data-timeslot');
            const targetDoctorId = parseInt(target.getAttribute('data-doctorid'));

            const newDoctor = doctors.find(d => d.id === targetDoctorId);
            const courseId = parseInt(el.getAttribute('data-course-id'));
            const course = courses.find(c => c.id === courseId);
            const roomId = parseInt(el.getAttribute('data-room-id'));
            const room = rooms.find(r => r.id === roomId);

            if (!newDoctor || !course || !room) {
                showMessage('بيانات غير مكتملة للمحاضرة أو الدكتور أو القاعة.', 'error');
                return false;
            }

            const originalDay = el.getAttribute('data-original-day');
            const originalTimeSlot = el.getAttribute('data-original-timeslot');
            const originalDoctorId = parseInt(el.getAttribute('data-doctor-id'));
            const originalRoomId = parseInt(el.getAttribute('data-room-id'));
            const lectureLengthMinutes = lectureDurations[lectureType];

            // --- التحقق المؤقت من الصلاحية (Mocking the state) ---
            // 1. إزالة المحاضرة مؤقتًا من جدولها الأصلي
            // (هذا ليس مثالياً إذا كانت الخوارزمية تتأثر بترتيب الجدولة، لكنه مقبول للتحقق المؤقت)
            const tempDoctorSchedules = JSON.parse(JSON.stringify(doctorSchedules));
            const tempRoomAvailability = JSON.parse(JSON.stringify(roomAvailability));
            const tempDoctors = JSON.parse(JSON.stringify(doctors));

            const tempOldDoctor = tempDoctors.find(d => d.id === originalDoctorId);
            if (tempOldDoctor) {
                tempOldDoctor.assignedHours -= lectureLengthMinutes;
                for (let i = 0; i < durationSlots; i++) {
                    const currentOriginalSlot = timeSlots[timeSlots.indexOf(originalTimeSlot) + i];
                    if (currentOriginalSlot && tempDoctorSchedules[originalDoctorId][originalDay]) {
                        tempDoctorSchedules[originalDoctorId][originalDay][currentOriginalSlot] = null;
                    }
                }
            }
            for (let i = 0; i < durationSlots; i++) {
                const currentOriginalSlot = timeSlots[timeSlots.indexOf(originalTimeSlot) + i];
                if (currentOriginalSlot && tempRoomAvailability[originalRoomId]) {
                    tempRoomAvailability[originalRoomId][originalDay][currentOriginalSlot] = true;
                }
            }
            
            // 2. التحقق من التوفر في الموقع الجديد باستخدام الحالة المؤقتة
            const newDoctorTemp = tempDoctors.find(d => d.id === targetDoctorId);
            if (!newDoctorTemp) { // Should not happen if newDoctor exists
                 showMessage('خطأ داخلي: لم يتم العثور على الدكتور الجديد المؤقت.', 'error');
                 return false;
            }

            // A. تحقق من توفر الدكتور
            const doctorAvailable = isDoctorAvailableCheckForDrag(newDoctorTemp, targetDay, targetTimeSlot, lectureLengthMinutes, tempDoctorSchedules);
            if (!doctorAvailable) {
                 showMessage(`الدكتور ${newDoctor.name} غير متاح في ${daysArabic[targetDay]} ${convertTo12HourFormat(targetTimeSlot)} أو سيتجاوز ساعاته.`, 'warning');
                 return false;
            }

            // B. تحقق من توفر القاعة
            const roomAvailable = isRoomAvailableCheckForDrag(room, targetDay, targetTimeSlot, lectureLengthMinutes, tempRoomAvailability);
            if (!roomAvailable) {
                 showMessage(`القاعة ${room.name} غير متاحة في ${daysArabic[targetDay]} ${convertTo12HourFormat(targetTimeSlot)}.`, 'warning');
                 return false;
            }

            // C. تحقق من عدم تداخل المحاضرة الطويلة مع خلايا أخرى في الموقع الجديد
            const targetTimeSlotIndex = timeSlots.indexOf(targetTimeSlot);
            for (let i = 0; i < durationSlots; i++) {
                const checkSlot = timeSlots[targetTimeSlotIndex + i];
                if (!checkSlot) {
                    showMessage('لا توجد فترات زمنية كافية في هذا الموقع.', 'warning');
                    return false;
                }
                const targetCellElement = document.querySelector(`td[data-day="${targetDay}"][data-timeslot="${checkSlot}"][data-doctorid="${targetDoctorId}"]`);
                if (targetCellElement && targetCellElement.querySelector('.draggable-lecture') && targetCellElement.querySelector('.draggable-lecture') !== el) {
                    showMessage('يوجد تداخل مع محاضرة أخرى في الموقع الجديد.', 'warning');
                    return false;
                }
            }
            // --- نهاية التحقق المؤقت ---
            
            return true;
        }
    });

    // وظائف مساعدة للتحقق خلال عملية السحب والإفلات (باستخدام هياكل مؤقتة)
    const isDoctorAvailableCheckForDrag = (doctor, day, startTime, lectureLengthMinutes, currentDoctorSchedules) => {
        const startLectureMinutes = timeToMinutes(startTime);
        const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

        const availableDaySlot = doctor.availableTimes[day];
        if (!availableDaySlot || timeToMinutes(availableDaySlot.start) === -1 || timeToMinutes(availableDaySlot.end) === -1) {
            return false;
        }

        const doctorAvailableStartMinutes = timeToMinutes(availableDaySlot.start);
        const doctorAvailableEndMinutes = timeToMinutes(availableDaySlot.end);
        if (startLectureMinutes < doctorAvailableStartMinutes || endLectureMinutes > doctorAvailableEndMinutes) {
            return false;
        }
        
        const arabicDayMap = { 'الأحد': 'sunday', 'الإثنين': 'monday', 'الثلاثاء': 'tuesday', 'الأربعاء': 'wednesday', 'الخميس': 'thursday', 'الجمعة': 'friday', 'السبت': 'saturday' };
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

        const timeSlotIndex = timeSlots.indexOf(startTime);
        const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short);

        for (let i = 0; i < slotsNeeded; i++) {
            const currentSlot = timeSlots[timeSlotIndex + i];
            if (!currentSlot || currentDoctorSchedules[doctor.id][day][currentSlot]) {
                return false;
            }
        }
        // تحقق من وجود فاصل زمني كافٍ قبل المحاضرة الحالية في الجدول المؤقت
        if (!hasEnoughBreakTimeCheckForDrag(doctor.id, day, startLectureMinutes, lectureLengthMinutes, currentDoctorSchedules)) {
            return false;
        }
        return true;
    };

    const hasEnoughBreakTimeCheckForDrag = (doctorId, day, currentStartTimeMinutes, currentLectureType, currentDoctorSchedules) => {
        const timeSlotIndex = timeSlots.indexOf(timeSlots.find(slot => timeToMinutes(slot) === currentStartTimeMinutes));
        if (timeSlotIndex === 0) return true;

        const prevTimeSlot = timeSlots[timeSlotIndex - 1];
        const prevLectureData = currentDoctorSchedules[doctorId][day][prevTimeSlot];

        if (prevLectureData) {
            if (prevLectureData.startTime === prevTimeSlot && prevLectureData.type === 'long' && prevLectureData.durationSlots > 1) {
                 return true;
            }
            const prevLectureEndTimeMinutes = timeToMinutes(prevLectureData.startTime) + lectureDurations[prevLectureData.type];
            if (currentStartTimeMinutes - prevLectureEndTimeMinutes < MIN_BREAK_TIME_MINUTES) {
                return false;
            }
        }
        return true;
    };

    const isRoomAvailableCheckForDrag = (room, day, startTime, lectureLengthMinutes, currentRoomAvailability) => {
        const startLectureMinutes = timeToMinutes(startTime);
        const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

        if (room.type === 'lab') {
            const arabicDayMap = { 'الأحد': 'sunday', 'الإثنين': 'monday', 'الثلاثاء': 'tuesday', 'الأربعاء': 'wednesday', 'الخميس': 'thursday', 'الجمعة': 'friday', 'السبت': 'saturday' };
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

        const timeSlotIndex = timeSlots.indexOf(startTime);
        const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short);

        for (let i = 0; i < slotsNeeded; i++) {
            const currentSlot = timeSlots[timeSlotIndex + i];
            if (!currentSlot || !currentRoomAvailability[room.id][day][currentSlot]) {
                return false;
            }
        }
        return true;
    };


    drake.on('drop', (el, target, source, sibling) => {
        const lectureId = el.getAttribute('data-lecture-id');
        const originalDay = el.getAttribute('data-original-day');
        const originalTimeSlot = el.getAttribute('data-original-timeslot');
        const originalDoctorId = parseInt(el.getAttribute('data-doctor-id'));
        const lectureType = el.getAttribute('data-lecture-type');
        const durationSlots = parseInt(el.getAttribute('data-duration-slots'));
        const lectureIndex = parseInt(el.getAttribute('data-lecture-index'));

        const targetDay = target.getAttribute('data-day');
        const targetTimeSlot = target.getAttribute('data-timeslot');
        const targetDoctorId = parseInt(target.getAttribute('data-doctorid'));

        const sectionId = parseInt(el.getAttribute('data-section-id'));
        const courseId = parseInt(el.getAttribute('data-course-id'));
        const roomId = parseInt(el.getAttribute('data-room-id'));

        const lectureLengthMinutes = lectureDurations[lectureType];

        // 1. إزالة المحاضرة من مكانها الأصلي وتحديث ساعات الدكتور الأصلي وتوفر القاعة
        const oldDoctor = doctors.find(d => d.id === originalDoctorId);
        if (oldDoctor) {
            oldDoctor.assignedHours -= lectureLengthMinutes;
        }
        for (let i = 0; i < durationSlots; i++) {
            const currentOriginalSlot = timeSlots[timeSlots.indexOf(originalTimeSlot) + i];
            if (currentOriginalSlot) {
                // Ensure to clear the actual schedule entry, not just doctorSchedules
                if (schedule[originalDay] && schedule[originalDay][currentOriginalSlot] && schedule[originalDay][currentOriginalSlot][roomId]) {
                    delete schedule[originalDay][currentOriginalSlot][roomId];
                }
                if (roomAvailability[roomId] && roomAvailability[roomId][originalDay]) {
                    roomAvailability[roomId][originalDay][currentOriginalSlot] = true;
                }
                if (doctorSchedules[originalDoctorId] && doctorSchedules[originalDoctorId][originalDay]) {
                    doctorSchedules[originalDoctorId][originalDay][currentOriginalSlot] = null;
                }
            }
        }

        // 2. إضافة المحاضرة إلى مكانها الجديد وتحديث ساعات الدكتور الجديد وتوفر القاعة
        const newLectureData = {
            sectionId: sectionId,
            doctorId: targetDoctorId,
            courseId: courseId,
            roomName: rooms.find(r => r.id === roomId)?.name || 'غير معروف',
            courseName: courses.find(c => c.id === courseId)?.name || 'غير معروف',
            sectionName: sections.find(s => s.id === sectionId)?.name || 'غير معروف',
            doctorName: doctors.find(d => d.id === targetDoctorId)?.name || 'غير معروف',
            type: lectureType,
            startTime: targetTimeSlot,
            durationSlots: durationSlots,
            lectureIndex: lectureIndex // الحفاظ على مؤشر المحاضرة الفرعية
        };

        const newDoctor = doctors.find(d => d.id === targetDoctorId);
        if (newDoctor) {
            newDoctor.assignedHours += lectureLengthMinutes;
        }
        for (let i = 0; i < durationSlots; i++) {
            const currentTargetSlot = timeSlots[timeSlots.indexOf(targetTimeSlot) + i];
            if (currentTargetSlot) {
                if (!schedule[targetDay]) schedule[targetDay] = {};
                if (!schedule[targetDay][currentTargetSlot]) schedule[targetDay][currentTargetSlot] = {};
                schedule[targetDay][currentTargetSlot][roomId] = newLectureData;

                if (!roomAvailability[roomId]) roomAvailability[roomId] = {};
                if (!roomAvailability[roomId][targetDay]) roomAvailability[roomId][targetDay] = {};
                roomAvailability[roomId][targetDay][currentTargetSlot] = false;

                if (!doctorSchedules[targetDoctorId]) doctorSchedules[targetDoctorId] = {};
                if (!doctorSchedules[targetDoctorId][targetDay]) doctorSchedules[targetDoctorId][targetDay] = {};
                doctorSchedules[targetDoctorId][targetDay][currentTargetSlot] = newLectureData;
            }
        }

        // تحديث خصائص المحاضرة في DOM لتناسب الموقع الجديد
        el.setAttribute('data-doctor-id', targetDoctorId);
        el.setAttribute('data-original-day', targetDay);
        el.setAttribute('data-original-timeslot', targetTimeSlot);

        // إعادة عرض الجداول لتحديث الـ rowspan وأي تأثيرات بصرية
        displayGeneratedSchedules();

        // حفظ الجداول المحدثة بعد التعديل اليدوي
        saveData('generatedSchedule', schedule);
        saveData('doctorSchedules', doctorSchedules);
        saveData('doctors', doctors);
        saveData('sections', sections); // تحديث إذا كانت حالة isScheduled تغيرت (ليست مرتبطة بالنقل المباشر عادة)

        showMessage('تم تعديل الجدول بالسحب والإفلات بنجاح!', 'success');
        console.log('Schedule updated via drag and drop.');
    });

    drake.on('cancel', (el, container, source) => {
        showMessage('تم إلغاء السحب.', 'info');
    });
};

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

// زر "بدء فصل جديد / مسح الجداول الحالية"
document.getElementById('clear-schedules-btn').addEventListener('click', () => {
    if (confirm('هل أنت متأكد من بدء فصل جديد؟ سيتم مسح جميع الجداول المجدولة حالياً! لن يتم مسح بيانات الدكاترة والمقررات والشعب والقاعات.')) {
        clearData('generatedSchedule');
        clearData('doctorSchedules');
        // Optionally reset assigned hours for doctors
        doctors.forEach(doc => doc.assignedHours = 0);
        saveData('doctors', doctors);
        // Optionally reset isScheduled for sections
        sections.forEach(sec => sec.isScheduled = false);
        saveData('sections', sections);

        displayGeneratedSchedules(); // Refresh display
        showMessage('تم مسح الجداول بنجاح. يمكنك الآن البدء بجدولة فصل جديد.', 'info');
        document.getElementById('generation-status').innerHTML = '<i class="fas fa-exclamation-triangle"></i> تم مسح الجداول. يمكنك الآن توليد جداول جديدة.';
        document.getElementById('generation-status').className = 'status-message info';
        document.getElementById('generation-status').style.display = 'flex';
    }
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
