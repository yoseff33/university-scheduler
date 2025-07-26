// js/generate.js

// جلب البيانات من LocalStorage
let doctors = getData('doctors');
let courses = getData('courses');
let sections = getData('sections');
let rooms = getData('rooms');

// هيكل لتمثيل جدول زمني (يوم -> وقت -> roomId: { sectionId, doctorId, courseId })
const schedule = {};
// هيكل لتمثيل جدول كل دكتور (doctorId -> يوم -> وقت -> { sectionId, roomId, courseId })
const doctorSchedules = {};
// هيكل لتتبع توافر القاعات (roomId -> يوم -> وقت -> true/false)
const roomAvailability = {};

// تعريف فترات زمنية ثابتة (كل 50 دقيقة)
const timeSlots = [
    "08:00", "08:50", "09:40", "10:30", "11:20", "12:10", "13:00", "13:50", "14:40", "15:30", "16:20", "17:10"
];
// أيام الأسبوع الدراسية
const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];

// مدة المحاضرة بالدقائق
const lectureDurations = {
    short: 50,
    long: 100 // 1 ساعة و40 دقيقة
};

// وظيفة لتحويل الوقت HH:MM إلى دقائق من منتصف الليل
const timeToMinutes = (timeStr) => {
    if (!timeStr) return -1; // Handle empty time string
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// وظيفة لتحويل دقائق إلى وقت HH:MM (غير مستخدمة هنا حاليًا ولكن مفيدة)
const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * وظيفة تهيئة الهياكل الزمنية قبل بدء عملية التوليد.
 * تُعاد تهيئتها في كل مرة يتم فيها النقر على زر "توليد الجداول".
 */
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

/**
 * وظيفة للتحقق من توافر وقت للدكتور.
 * @param {Object} doctor - كائن الدكتور.
 * @param {string} day - اليوم (مثلاً "sunday").
 * @param {string} startTime - وقت بدء المحاضرة (HH:MM).
 * @param {number} lectureLengthMinutes - مدة المحاضرة بالدقائق.
 * @returns {boolean} True إذا كان الدكتور متاحًا، False خلاف ذلك.
 */
const isDoctorAvailable = (doctor, day, startTime, lectureLengthMinutes) => {
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

    // 1. تحقق من الأوقات المتاحة للدكتور بشكل عام لهذا اليوم
    const availableDaySlot = doctor.availableTimes[day];
    if (!availableDaySlot || timeToMinutes(availableDaySlot.start) === -1 || timeToMinutes(availableDaySlot.end) === -1) {
        return false;
    }

    const doctorAvailableStartMinutes = timeToMinutes(availableDaySlot.start);
    const doctorAvailableEndMinutes = timeToMinutes(availableDaySlot.end);

    if (startLectureMinutes < doctorAvailableStartMinutes || endLectureMinutes > doctorAvailableEndMinutes) {
        return false;
    }

    // 2. تحقق من الأوقات غير المناسبة للدكتور
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

    // 3. تحقق من عدم وجود تعارض في جدول الدكتور (المحاضرات المجدولة بالفعل)
    const timeSlotIndex = timeSlots.indexOf(startTime);
    const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short);

    for (let i = 0; i < slotsNeeded; i++) {
        const currentSlot = timeSlots[timeSlotIndex + i];
        if (!currentSlot || doctorSchedules[doctor.id][day][currentSlot]) {
            return false;
        }
    }

    // 4. التحقق من أوقات الراحة (مثلاً، عدم وجود محاضرتين متتاليتين مباشرة)
    // هذا المنطق يمكن أن يكون معقدًا. حالياً، يعتمد على أن timeSlots توفر فاصلاً طبيعياً.
    // إذا كانت هناك حاجة لفاصل إضافي (مثلاً 5 دقائق بين نهاية محاضرة وبداية التالية)، فيجب تطبيقها هنا.
    // كمثال بسيط: إذا كانت المحاضرة القصيرة 50 دقيقة، والفترة الزمنية 50 دقيقة، فهي تملأ الفترة تمامًا.
    // إذا أردت فاصل 10 دقائق بعد كل محاضرة:
    /*
    const prevSlot = timeSlots[timeSlotIndex - 1];
    if (prevSlot && doctorSchedules[doctor.id][day][prevSlot]) {
        const prevLecture = doctorSchedules[doctor.id][day][prevSlot];
        const prevLectureEndMinutes = timeToMinutes(prevSlot) + lectureDurations[prevLecture.type];
        if (startLectureMinutes - prevLectureEndMinutes < 10) { // أقل من 10 دقائق راحة
            return false;
        }
    }
    */

    return true;
};

/**
 * وظيفة للتحقق من توافر قاعة.
 * @param {Object} room - كائن القاعة.
 * @param {string} day - اليوم.
 * @param {string} startTime - وقت بدء المحاضرة.
 * @param {number} lectureLengthMinutes - مدة المحاضرة بالدقائق.
 * @returns {boolean} True إذا كانت القاعة متاحة، False خلاف ذلك.
 */
const isRoomAvailable = (room, day, startTime, lectureLengthMinutes) => {
    const startLectureMinutes = timeToMinutes(startTime);
    const endLectureMinutes = startLectureMinutes + lectureLengthMinutes;

    // 1. تحقق من الأوقات ممنوعة لاستخدام المعامل (فقط للمعامل)
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

    // 2. تحقق من توافر القاعة في الجدول الكلي (عدم وجود حجز آخر)
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

/**
 * وظيفة لتوليد الجداول تلقائيًا باستخدام خوارزمية بسيطة.
 */
const generateSchedules = () => {
    const statusMessageElem = document.getElementById('generation-status');
    statusMessageElem.textContent = 'جاري توليد الجداول... قد يستغرق الأمر بعض الوقت.';
    statusMessageElem.className = 'status-message info';
    statusMessageElem.style.display = 'block';

    initializeScheduleStructures();

    const sortedSections = [...sections].sort((a, b) => {
        const courseA = courses.find(c => c.id === a.courseId);
        const courseB = courses.find(c => c.id === b.courseId);
        return ((courseB ? courseB.hours : 0) * 1000 + b.students) - ((courseA ? courseA.hours : 0) * 1000 + a.students);
    });

    let successfullyScheduledCount = 0;
    let failedToScheduleCount = 0;

    for (const section of sortedSections) {
        if (section.isScheduled) continue;

        const course = courses.find(c => c.id === section.courseId);
        const doctor = doctors.find(d => d.id === section.doctorId);

        if (!course || !doctor) {
            console.warn(`Skipping section ${section.name}: missing linked course or doctor data.`);
            failedToScheduleCount++;
            continue;
        }

        const lectureLengthMinutes = lectureDurations[course.type];
        const numLecturesNeeded = course.hours;

        for (let i = 0; i < numLecturesNeeded; i++) {
            let lectureScheduled = false;
            const shuffledDays = [...days].sort(() => 0.5 - Math.random());
            const shuffledTimeSlots = [...timeSlots].sort(() => 0.5 - Math.random());

            for (const day of shuffledDays) {
                if (lectureScheduled) break;

                const suitableRooms = rooms.filter(r => {
                    return r.capacity >= section.students &&
                           (course.requiresLab ? r.type === 'lab' : r.type !== 'lab');
                }).sort(() => 0.5 - Math.random());

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
                                        schedule[day][currentSlot][room.id] = {
                                            sectionId: section.id,
                                            doctorId: doctor.id,
                                            courseId: course.id,
                                            roomName: room.name,
                                            courseName: course.name,
                                            sectionName: section.name,
                                            doctorName: doctor.name,
                                            type: course.type,
                                            startTime: timeSlot,
                                            durationSlots: slotsNeeded,
                                            lectureIndex: i // للإشارة إلى أي جزء من المقرر
                                        };
                                        roomAvailability[room.id][day][currentSlot] = false;
                                        doctorSchedules[doctor.id][day][currentSlot] = {
                                            sectionId: section.id,
                                            roomId: room.id,
                                            courseId: course.id,
                                            roomName: room.name,
                                            courseName: course.name,
                                            sectionName: section.name,
                                            type: course.type,
                                            startTime: timeSlot,
                                            durationSlots: slotsNeeded,
                                            lectureIndex: i
                                        };
                                    }
                                    doctor.assignedHours += lectureLengthMinutes;
                                    section.isScheduled = true;
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
                console.warn(`Could not schedule lecture slot for section "${section.name}" (Course: ${course.name}).`);
                failedToScheduleCount++;
            }
        }
    }

    saveData('generatedSchedule', schedule);
    saveData('doctorSchedules', doctorSchedules);
    saveData('doctors', doctors);
    saveData('sections', sections);

    if (failedToScheduleCount > 0) {
        statusMessageElem.textContent = `تم توليد الجداول مع بعض القيود. فشل جدولة ${failedToScheduleCount} محاضرة.`;
        statusMessageElem.className = 'status-message warning';
        showMessage(`تم توليد الجداول مع بعض القيود. فشل جدولة ${failedToScheduleCount} محاضرة.`, 'warning');
    } else {
        statusMessageElem.textContent = 'تم توليد الجداول بنجاح!';
        statusMessageElem.className = 'status-message success';
        showMessage('تم توليد الجداول بنجاح!', 'success');
    }

    displayGeneratedSchedules();
};

/**
 * وظيفة لعرض الجداول المجدولة لكل دكتور.
 * تتضمن دعم السحب والإفلات.
 */
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

    if (Object.keys(doctorSchedules).length === 0) {
        noSchedulesMessage.classList.remove('hidden');
        return;
    }

    for (const doctorId in doctorSchedules) {
        const doctor = doctors.find(d => d.id === parseInt(doctorId));
        if (!doctor) continue;

        const doctorScheduleDiv = document.createElement('div');
        doctorScheduleDiv.className = 'card doctor-schedule-card'; // استخدم كلاس card
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
            tr.innerHTML = `<td class="schedule-table-time-header">${timeSlot}</td>`; // كلاس جديد لوقت الرأس

            days.forEach(day => {
                const cellId = `${doctorId}-${day}-${timeSlot}`;
                if (occupiedCells.has(cellId)) {
                    return;
                }

                const td = document.createElement('td');
                td.className = `schedule-table-cell`; // كلاس جديد لخلية الجدول
                td.setAttribute('data-day', day);
                td.setAttribute('data-timeslot', timeSlot);
                td.setAttribute('data-doctorid', doctor.id);

                const lecture = doctorSchedules[doctorId][day][timeSlot];
                if (lecture && lecture.startTime === timeSlot) { // تأكد أنه بداية المحاضرة وليس جزء منها
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
                    lectureCard.className = `schedule-slot draggable-lecture`;
                    lectureCard.setAttribute('data-lecture-id', `${doctor.id}-${day}-${timeSlot}-${lecture.sectionId}-${lecture.courseId}`);
                    lectureCard.setAttribute('draggable', 'true');
                    lectureCard.setAttribute('data-course-id', lecture.courseId);
                    lectureCard.setAttribute('data-section-id', lecture.sectionId);
                    lectureCard.setAttribute('data-room-id', lecture.roomId);
                    lectureCard.setAttribute('data-lecture-type', lecture.type);
                    lectureCard.setAttribute('data-original-day', day);
                    lectureCard.setAttribute('data-original-timeslot', timeSlot);
                    lectureCard.setAttribute('data-doctor-id', lecture.doctorId);
                    lectureCard.setAttribute('data-duration-slots', slotsOccupied);

                    lectureCard.innerHTML = `
                        <div class="schedule-slot-subject">${lecture.courseName}</div>
                        <div class="schedule-slot-info">${lecture.sectionName}</div>
                        <div class="schedule-slot-info">${lecture.roomName}</div>
                        <div class="schedule-slot-info">(${lecture.type === 'short' ? 'قصيرة' : 'طويلة'})</div>
                    `;
                    td.appendChild(lectureCard);
                    td.classList.add('has-lecture');
                } else if (!lecture && !occupiedCells.has(cellId)) {
                    td.textContent = ''; // خلية فارغة
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    initDragula();
};

/**
 * وظيفة تهيئة مكتبة Dragula للسحب والإفلات.
 */
const initDragula = () => {
    // يجب أن تكون الحاويات هي خلايا الجدول التي يمكن إسقاط المحاضرات فيها.
    const containers = Array.from(document.querySelectorAll('.schedule-table-cell'));

    const drake = dragula(containers, {
        moves: function (el, source, handle, sibling) {
            return el.classList.contains('draggable-lecture');
        },
        accepts: function (el, target, source, sibling) {
            // لا تسمح بالإسقاط في نفس الخلية التي جاء منها العنصر
            if (source === target) {
                return true;
            }

            const lectureType = el.getAttribute('data-lecture-type');
            const durationSlots = parseInt(el.getAttribute('data-duration-slots'));

            const targetDay = target.getAttribute('data-day');
            const targetTimeSlot = target.getAttribute('data-timeslot');
            const targetDoctorId = parseInt(target.getAttribute('data-doctorid'));

            // التحقق من أن الخلية الهدف ليست جزءًا من محاضرة طويلة موجودة بالفعل
            // أو أنها تحتوي على محاضرة أخرى غير التي نسحبها
            if (target.querySelector('.draggable-lecture') && target.querySelector('.draggable-lecture') !== el) {
                showMessage('الخلية الهدف مشغولة بمحاضرة أخرى.', 'error');
                return false;
            }

            const newDoctor = doctors.find(d => d.id === targetDoctorId);
            const courseId = parseInt(el.getAttribute('data-course-id'));
            const course = courses.find(c => c.id === courseId);
            const roomId = parseInt(el.getAttribute('data-room-id'));
            const room = rooms.find(r => r.id === roomId);

            if (!newDoctor || !course || !room) {
                showMessage('بيانات غير مكتملة للمحاضرة أو الدكتور أو القاعة.', 'error');
                return false;
            }

            // تحقق من توافر الدكتور في الموقع الجديد (مراعاة الساعات المتبقية)
            const oldDoctorId = parseInt(el.getAttribute('data-doctor-id'));
            const oldDoctor = doctors.find(d => d.id === oldDoctorId);
            const lectureLengthMinutes = lectureDurations[lectureType];

            // مؤقتاً نفترض أن المحاضرة قد أزيلت من الدكتور القديم
            if (oldDoctor && oldDoctorId !== targetDoctorId) {
                 oldDoctor.assignedHours -= lectureLengthMinutes;
            }
            // ونضيفها مؤقتاً للدكتور الجديد للتحقق
            newDoctor.assignedHours += lectureLengthMinutes;

            let doctorAvailable = isDoctorAvailable(newDoctor, targetDay, targetTimeSlot, lectureLengthMinutes);

            // إعادة الساعات بعد التحقق
            if (oldDoctor && oldDoctorId !== targetDoctorId) {
                oldDoctor.assignedHours += lectureLengthMinutes;
            }
            newDoctor.assignedHours -= lectureLengthMinutes;

            if (!doctorAvailable) {
                showMessage(`الدكتور ${newDoctor.name} غير متاح في ${daysArabic[targetDay]} الساعة ${targetTimeSlot} أو سيتجاوز ساعاته.`, 'warning');
                return false;
            }

            // التحقق من توافر القاعة في الموقع الجديد
            if (!isRoomAvailable(room, targetDay, targetTimeSlot, lectureLengthMinutes)) {
                showMessage(`القاعة ${room.name} غير متاحة في ${daysArabic[targetDay]} الساعة ${targetTimeSlot}.`, 'warning');
                return false;
            }

            // تحقق من عدم تداخل المحاضرة الطويلة مع خلايا أخرى
            const targetTimeSlotIndex = timeSlots.indexOf(targetTimeSlot);
            for (let i = 0; i < durationSlots; i++) {
                const checkSlot = timeSlots[targetTimeSlotIndex + i];
                if (!checkSlot) {
                    showMessage('لا توجد فترات زمنية كافية في هذا الموقع.', 'warning');
                    return false;
                }
                const targetCellElement = document.querySelector(`.schedule-table-cell[data-day="${targetDay}"][data-timeslot="${checkSlot}"][data-doctorid="${targetDoctorId}"]`);
                if (targetCellElement && targetCellElement.querySelector('.draggable-lecture') && targetCellElement.querySelector('.draggable-lecture') !== el) {
                    showMessage('يوجد تداخل مع محاضرة أخرى في الموقع الجديد.', 'warning');
                    return false;
                }
            }

            return true;
        }
    });

    drake.on('drop', (el, target, source, sibling) => {
        const lectureId = el.getAttribute('data-lecture-id');
        const originalDay = el.getAttribute('data-original-day');
        const originalTimeSlot = el.getAttribute('data-original-timeslot');
        const originalDoctorId = parseInt(el.getAttribute('data-doctor-id'));
        const lectureType = el.getAttribute('data-lecture-type');
        const durationSlots = parseInt(el.getAttribute('data-duration-slots'));

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
                delete schedule[originalDay][currentOriginalSlot][roomId]; // حذف الحجز من الجدول العام
                roomAvailability[roomId][originalDay][currentOriginalSlot] = true; // تحرير القاعة
                doctorSchedules[originalDoctorId][originalDay][currentOriginalSlot] = null; // إزالة من جدول الدكتور القديم
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
            durationSlots: durationSlots
        };

        const newDoctor = doctors.find(d => d.id === targetDoctorId);
        if (newDoctor) {
            newDoctor.assignedHours += lectureLengthMinutes;
        }
        for (let i = 0; i < durationSlots; i++) {
            const currentTargetSlot = timeSlots[timeSlots.indexOf(targetTimeSlot) + i];
            if (currentTargetSlot) {
                schedule[targetDay][currentTargetSlot][roomId] = newLectureData;
                roomAvailability[roomId][targetDay][currentTargetSlot] = false;
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
        saveData('sections', sections);

        showMessage('تم تعديل الجدول بنجاح!', 'success');
        console.log('Schedule updated via drag and drop.');
    });

    drake.on('cancel', (el, container, source) => {
        showMessage('تم إلغاء السحب.', 'info');
    });
};

// معالج حدث لزر توليد الجداول
document.getElementById('generate-schedule-btn').addEventListener('click', generateSchedules);

// معالج حدث لزر تصدير الجداول كصور
document.getElementById('export-schedules-btn').addEventListener('click', () => {
    const doctorScheduleCards = document.querySelectorAll('.doctor-schedule-card');
    if (doctorScheduleCards.length === 0) {
        showMessage('لا توجد جداول لتصديرها. الرجاء توليد الجداول أولاً.', 'warning');
        return;
    }

    showMessage('جاري تصدير الجداول كصور...', 'info', 5000); // إظهار رسالة مؤقتة

    doctorScheduleCards.forEach((card, index) => {
        html2canvas(card, {
            scale: 2,
            logging: false, // يمكن إيقاف التسجيل في الكونسول للإنتاج
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

// عند تحميل الصفحة، عرض الجداول الموجودة في LocalStorage (إذا كانت موجودة)
document.addEventListener('DOMContentLoaded', () => {
    const statusMessageElem = document.getElementById('generation-status');
    const noSchedulesMessage = document.getElementById('no-schedules-message');

    const storedSchedule = getData('generatedSchedule');
    const storedDoctorSchedules = getData('doctorSchedules');
    const storedDoctors = getData('doctors');
    const storedSections = getData('sections');

    if (storedSchedule && Object.keys(storedSchedule).length > 0 &&
        storedDoctorSchedules && Object.keys(storedDoctorSchedules).length > 0 &&
        storedDoctors && storedDoctors.length > 0) { // تأكد من وجود دكاترة
        
        Object.assign(schedule, storedSchedule);
        Object.assign(doctorSchedules, storedDoctorSchedules);
        // تحديث المراجع للمتغيرات العالمية بأحدث البيانات من localStorage
        doctors = storedDoctors;
        sections = storedSections;

        // إعادة بناء roomAvailability من schedule لضمان الدقة
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

        statusMessageElem.textContent = 'تم تحميل الجداول السابقة.';
        statusMessageElem.className = 'status-message info';
        statusMessageElem.style.display = 'block';
        displayGeneratedSchedules();
    } else {
        statusMessageElem.textContent = 'لا توجد جداول سابقة. الرجاء إدخال البيانات وتوليد الجداول.';
        statusMessageElem.className = 'status-message warning';
        statusMessageElem.style.display = 'block';
        noSchedulesMessage.classList.remove('hidden'); // إظهار رسالة لا توجد جداول
    }
});
