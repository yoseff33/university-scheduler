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
const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"]; // الأيام الدراسية في السعودية

// مدة المحاضرة بالدقائق
const lectureDurations = {
    short: 50,
    long: 100 // 1 ساعة و40 دقيقة
};

// وظيفة لتحويل الوقت HH:MM إلى دقائق من منتصف الليل
const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// وظيفة لتحويل دقائق إلى وقت HH:MM
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
            schedule[day][slot] = {}; // كل slot في كل يوم فارغ في البداية
        });
    });

    // تهيئة جداول الدكاترة الفردية وتصفير الساعات المجدولة
    doctors.forEach(doctor => {
        doctorSchedules[doctor.id] = {};
        days.forEach(day => {
            doctorSchedules[doctor.id][day] = {};
            timeSlots.forEach(slot => {
                doctorSchedules[doctor.id][day][slot] = null; // لا توجد محاضرة مجدولة بعد
            });
        });
        doctor.assignedHours = 0; // إعادة تعيين الساعات المجدولة للدكتور
    });

    // تهيئة توافر القاعات
    rooms.forEach(room => {
        roomAvailability[room.id] = {};
        days.forEach(day => {
            roomAvailability[room.id][day] = {};
            timeSlots.forEach(slot => {
                roomAvailability[room.id][day][slot] = true; // القاعة متاحة افتراضيًا
            });
        });
    });

    // إعادة تعيين حالة الجدولة للشعب
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
    if (!availableDaySlot || !availableDaySlot.start || !availableDaySlot.end) {
        return false; // الدكتور غير متاح في هذا اليوم أو لم يتم تحديد أوقات متاحة
    }

    const doctorAvailableStartMinutes = timeToMinutes(availableDaySlot.start);
    const doctorAvailableEndMinutes = timeToMinutes(availableDaySlot.end);

    // المحاضرة يجب أن تبدأ وتنتهي ضمن الأوقات المتاحة للدكتور
    if (startLectureMinutes < doctorAvailableStartMinutes || endLectureMinutes > doctorAvailableEndMinutes) {
        return false;
    }

    // 2. تحقق من الأوقات غير المناسبة للدكتور
    for (const forbiddenTimeRange of doctor.unavailableTimes) {
        const parts = forbiddenTimeRange.split(/[\s-]/).filter(Boolean);
        if (parts.length >= 3) {
            const forbiddenDay = parts[0].toLowerCase();
            const forbiddenStartStr = parts[1];
            const forbiddenEndStr = parts[2];

            // تحويل اسم اليوم العربي إلى الإنجليزي للمقارنة
            const arabicDayMap = {
                'الأحد': 'sunday', 'الإثنين': 'monday', 'الثلاثاء': 'tuesday',
                'الأربعاء': 'wednesday', 'الخميس': 'thursday', 'الجمعة': 'friday', 'السبت': 'saturday'
            };
            const mappedForbiddenDay = arabicDayMap[forbiddenDay] || forbiddenDay; // استخدم الماب أو الاسم كما هو

            if (mappedForbiddenDay === day) {
                const forbiddenStartMinutes = timeToMinutes(forbiddenStartStr);
                const forbiddenEndMinutes = timeToMinutes(forbiddenEndStr);

                // تحقق من التداخل بين المحاضرة والوقت الممنوع
                if (!(endLectureMinutes <= forbiddenStartMinutes || startLectureMinutes >= forbiddenEndMinutes)) {
                    return false; // يوجد تداخل مع وقت غير مناسب للدكتور
                }
            }
        }
    }

    // 3. تحقق من عدم وجود تعارض في جدول الدكتور (المحاضرات المجدولة بالفعل)
    const timeSlotIndex = timeSlots.indexOf(startTime);
    const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short); // عدد فترات الـ 50 دقيقة المطلوبة

    for (let i = 0; i < slotsNeeded; i++) {
        const currentSlot = timeSlots[timeSlotIndex + i];
        if (!currentSlot || doctorSchedules[doctor.id][day][currentSlot]) {
            return false; // يوجد تعارض في جدول الدكتور (محاضرة مجدولة بالفعل في إحدى الفترات المطلوبة)
        }
    }

    // 4. احترام أوقات الراحة بين المحاضرات (مثلاً 10 دقائق على الأقل بين المحاضرات)
    // هذا الشرط يمكن أن يكون معقدًا ويعتمد على الفترات الزمنية المحددة.
    // لتبسيط، سنتأكد من عدم وجود محاضرات متتالية مباشرة دون فترة زمنية فاصلة إذا كانت المحاضرة لا تملأ الفترة بالكامل
    // أو إذا كانت فترة الـ 50 دقيقة لا تسمح بوجود فاصل طبيعي.
    // في هذا النموذج، كل فترة 50 دقيقة مفصولة عن التي تليها بـ 10 دقائق (من 8:00 إلى 8:50، ثم 8:50 إلى 9:40، إلخ).
    // هذا يعني أن هناك فاصل 10 دقائق ضمن النظام.
    // إذا أردت فاصلًا إضافيًا، يجب التفكير في تعديل timeSlots أو إضافة منطق للتحقق من الفترات المجاورة.
    // حالياً، النظام الافتراضي يسمح بالمحاضرات المتتالية طالما لا يوجد تداخل.

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
        for (const forbiddenTimeRange of room.forbiddenTimes) {
            const parts = forbiddenTimeRange.split(/[\s-]/).filter(Boolean);
            if (parts.length >= 3) {
                const forbiddenDay = parts[0].toLowerCase();
                const forbiddenStartStr = parts[1];
                const forbiddenEndStr = parts[2];

                const arabicDayMap = {
                    'الأحد': 'sunday', 'الإثنين': 'monday', 'الثلاثاء': 'tuesday',
                    'الأربعاء': 'wednesday', 'الخميس': 'thursday', 'الجمعة': 'friday', 'السبت': 'saturday'
                };
                const mappedForbiddenDay = arabicDayMap[forbiddenDay] || forbiddenDay;

                if (mappedForbiddenDay === day) {
                    const forbiddenStartMinutes = timeToMinutes(forbiddenStartStr);
                    const forbiddenEndMinutes = timeToMinutes(forbiddenEndStr);

                    if (!(endLectureMinutes <= forbiddenStartMinutes || startLectureMinutes >= forbiddenEndMinutes)) {
                        return false; // تداخل مع وقت ممنوع للمعمل
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
        if (!currentSlot || !roomAvailability[room.id][day][currentSlot]) {
            return false; // القاعة غير متاحة في هذا الوقت (محجوزة)
        }
    }
    return true;
};

/**
 * وظيفة لتوليد الجداول تلقائيًا باستخدام خوارزمية بسيطة.
 * هذه الخوارزمية تحاول إيجاد أول مكان متاح لكل محاضرة.
 * يمكن تحسينها بخوارزميات أكثر تعقيداً (مثل Backtracking أو Genetic Algorithms)
 * لتحقيق جداول مثالية.
 */
const generateSchedules = () => {
    document.getElementById('generation-status').textContent = 'جاري توليد الجداول... قد يستغرق الأمر بعض الوقت.';

    // إعادة تهيئة الجداول في كل مرة يتم فيها التوليد
    initializeScheduleStructures();

    // فرز الشعب لزيادة فرص الجدولة: مثلاً، المقررات ذات الساعات الأكبر أو الشعب ذات العدد الأكبر من الطلاب أولاً.
    // هذا يمكن أن يساعد في العثور على أماكن للشعب الصعبة أولاً.
    const sortedSections = [...sections].sort((a, b) => {
        const courseA = courses.find(c => c.id === a.courseId);
        const courseB = courses.find(c => c.id === b.courseId);
        // الأولوية للشعب ذات المقررات الأطول أو الشعب الأكبر
        return ((courseB ? courseB.hours : 0) * 1000 + b.students) - ((courseA ? courseA.hours : 0) * 1000 + a.students);
    });

    for (const section of sortedSections) {
        // إذا كانت الشعبة مجدولة بالفعل، تخطاها (مهم في حالة التعديل اليدوي أو إعادة التوليد الجزئي)
        if (section.isScheduled) continue;

        const course = courses.find(c => c.id === section.courseId);
        const doctor = doctors.find(d => d.id === section.doctorId);

        if (!course || !doctor) {
            console.warn(`Skipping section ${section.name}: missing linked course or doctor data.`);
            continue;
        }

        const lectureLengthMinutes = lectureDurations[course.type];
        // عدد المحاضرات المطلوبة يعتمد على عدد ساعات المقرر ونوع المحاضرة
        // نفترض أن كل ساعة مقرر تعني 50 دقيقة تدريس فعلي (إذا كانت قصيرة) أو 100 دقيقة (إذا كانت طويلة)
        // هذا قد يتطلب تعديل بناءً على سياسات جامعية محددة
        const numLecturesNeeded = course.hours; // نفترض أن 1 ساعة في المقرر تعني 1 "slot" في الجدول

        // محاولة جدولة كل المحاضرات المطلوبة للشعبة
        for (let i = 0; i < numLecturesNeeded; i++) {
            let lectureScheduled = false; // flag to track if current lecture is scheduled
            // خلط الأيام والأوقات لإضفاء بعض العشوائية وتحقيق توزيع أفضل
            const shuffledDays = [...days].sort(() => 0.5 - Math.random());
            const shuffledTimeSlots = [...timeSlots].sort(() => 0.5 - Math.random());

            for (const day of shuffledDays) {
                if (lectureScheduled) break; // إذا تم جدولة المحاضرة، انتقل للمحاضرة التالية

                // تصفية القاعات حسب متطلبات المقرر (معمل أو قاعة دراسية) وحسب سعة الطلاب
                const suitableRooms = rooms.filter(r => {
                    return r.capacity >= section.students &&
                           (course.requiresLab ? r.type === 'lab' : r.type !== 'lab');
                }).sort(() => 0.5 - Math.random()); // خلط القاعات أيضًا

                for (const timeSlot of shuffledTimeSlots) {
                    if (lectureScheduled) break;

                    // التحقق من أن الدكتور لم يصل إلى الحد الأقصى لساعاته الأسبوعية
                    // doctor.assignedHours هنا تمثل إجمالي الدقائق المجدولة
                    const remainingHours = (doctor.weeklyHours * 60) - doctor.assignedHours;
                    if (remainingHours < lectureLengthMinutes) {
                        continue; // الدكتور لا يملك ساعات كافية لجدولة هذه المحاضرة
                    }

                    if (isDoctorAvailable(doctor, day, timeSlot, lectureLengthMinutes)) {
                        for (const room of suitableRooms) {
                            if (isRoomAvailable(room, day, timeSlot, lectureLengthMinutes)) {
                                // هنا يتم التحقق النهائي قبل الجدولة
                                const slotsNeeded = Math.ceil(lectureLengthMinutes / lectureDurations.short);
                                let canScheduleInSlots = true;
                                const startIndex = timeSlots.indexOf(timeSlot);

                                for (let j = 0; j < slotsNeeded; j++) {
                                    const currentSlot = timeSlots[startIndex + j];
                                    if (!currentSlot || schedule[day][currentSlot][room.id]) {
                                        canScheduleInSlots = false;
                                        break;
                                    }
                                }

                                if (canScheduleInSlots) {
                                    // جدولة المحاضرة في جميع الفترات الزمنية التي تشغلها
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
                                            type: course.type, // نوع المحاضرة (قصيرة/طويلة)
                                            startTime: timeSlot, // وقت بداية المحاضرة الأساسي
                                            durationSlots: slotsNeeded // عدد الفترات التي تشغلها
                                        };
                                        roomAvailability[room.id][day][currentSlot] = false; // حجز القاعة
                                        doctorSchedules[doctor.id][day][currentSlot] = {
                                            sectionId: section.id,
                                            roomId: room.id,
                                            courseId: course.id,
                                            roomName: room.name,
                                            courseName: course.name,
                                            sectionName: section.name,
                                            type: course.type,
                                            startTime: timeSlot,
                                            durationSlots: slotsNeeded
                                        };
                                    }
                                    doctor.assignedHours += lectureLengthMinutes; // إضافة مدة المحاضرة للدكتور (بالدقائق)
                                    section.isScheduled = true; // تم جدولة الشعبة
                                    lectureScheduled = true; // تم جدولة المحاضرة الحالية
                                    break; // انتقل للمحاضرة التالية لهذه الشعبة
                                }
                            }
                        }
                    }
                }
            }
            if (!lectureScheduled) {
                console.warn(`Could not schedule one lecture slot for section "${section.name}" (Course: ${course.name}). It might be impossible with current constraints.`);
                // يمكن إضافة إشعار للمستخدم هنا بوجود مشاكل في الجدولة
                // مثال: alert(`لم يتمكن النظام من جدولة كل ساعات المقرر ${course.name} للشعبة ${section.name}. قد تحتاج إلى تعديل البيانات.`);
            }
        }
    }

    // حفظ الجداول النهائية في LocalStorage
    saveData('generatedSchedule', schedule);
    saveData('doctorSchedules', doctorSchedules);
    saveData('doctors', doctors); // حفظ تحديث assignedHours
    saveData('sections', sections); // حفظ تحديث isScheduled

    document.getElementById('generation-status').textContent = 'تم توليد الجداول بنجاح.';
    displayGeneratedSchedules(); // عرض الجداول بعد التوليد
};

/**
 * وظيفة لعرض الجداول المجدولة لكل دكتور.
 * تتضمن دعم السحب والإفلات.
 */
const displayGeneratedSchedules = () => {
    const scheduleOutput = document.getElementById('schedule-output');
    scheduleOutput.innerHTML = ''; // مسح المحتوى القديم

    const daysArabic = {
        sunday: "الأحد",
        monday: "الإثنين",
        tuesday: "الثلاثاء",
        wednesday: "الأربعاء",
        thursday: "الخميس"
    };

    // عرض جدول لكل دكتور
    for (const doctorId in doctorSchedules) {
        const doctor = doctors.find(d => d.id === parseInt(doctorId));
        if (!doctor) continue;

        const doctorScheduleDiv = document.createElement('div');
        doctorScheduleDiv.className = 'doctor-schedule-card';
        doctorScheduleDiv.id = `doctor-schedule-${doctor.id}`; // لجعله قابلاً للتحديد عند التصدير كصورة

        doctorScheduleDiv.innerHTML = `
            <h2>جدول الدكتور: ${doctor.name}</h2>
            <p>الساعات المجدولة: ${Math.round(doctor.assignedHours / 60)} ساعة من ${doctor.weeklyHours} ساعة أسبوعيًا</p>
            <div class="schedule-table-container">
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
        `;
        scheduleOutput.appendChild(doctorScheduleDiv);

        const tbody = document.getElementById(`doctor-${doctor.id}-schedule-body`);
        const occupiedCells = new Set(); // لتتبع الخلايا المدمجة (المشغولة بواسطة محاضرات طويلة)

        timeSlots.forEach(timeSlot => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="time-slot-header">${timeSlot}</td>`;

            days.forEach(day => {
                const cellId = `${doctor.id}-${day}-${timeSlot}`;
                // إذا كانت هذه الخلية جزءًا من محاضرة طويلة تم التعامل معها بالفعل، لا تنشئها
                if (occupiedCells.has(cellId)) {
                    return; // لا نضيف TD إذا كانت الخلية مدمجة بالفعل
                }

                const td = document.createElement('td');
                td.className = `time-slot-cell`;
                td.setAttribute('data-day', day);
                td.setAttribute('data-timeslot', timeSlot);
                td.setAttribute('data-doctorid', doctor.id);
                // هذا الـ div سيصبح حاوية Dragula
                const dropZone = document.createElement('div');
                dropZone.className = 'drop-zone'; // Dragula container
                td.appendChild(dropZone);


                const lecture = doctorSchedules[doctor.id][day][timeSlot];
                if (lecture) {
                    const lectureLengthMinutes = lectureDurations[lecture.type];
                    const slotsOccupied = Math.ceil(lectureLengthMinutes / lectureDurations.short);

                    // إذا كانت محاضرة طويلة، قم بتعيين rowspan وقم بوضع علامة على الخلايا التالية كـ "مشغولة"
                    if (lecture.type === 'long' && slotsOccupied > 1) {
                        td.rowSpan = slotsOccupied;
                        for (let i = 1; i < slotsOccupied; i++) {
                            const nextTimeSlotIndex = timeSlots.indexOf(timeSlot) + i;
                            if (nextTimeSlotIndex < timeSlots.length) {
                                occupiedCells.add(`${doctor.id}-${day}-${timeSlots[nextTimeSlotIndex]}`);
                            }
                        }
                    }

                    // إنشاء عنصر المحاضرة القابل للسحب
                    const lectureCard = document.createElement('div');
                    lectureCard.className = `draggable-lecture`;
                    lectureCard.setAttribute('data-lecture-id', `${doctor.id}-${day}-${timeSlot}`);
                    lectureCard.setAttribute('draggable', 'true'); // جعل العنصر قابلاً للسحب
                    // تخزين البيانات الأصلية للمحاضرة
                    lectureCard.setAttribute('data-course-id', lecture.courseId);
                    lectureCard.setAttribute('data-section-id', lecture.sectionId);
                    lectureCard.setAttribute('data-room-id', lecture.roomId);
                    lectureCard.setAttribute('data-lecture-type', lecture.type);
                    lectureCard.setAttribute('data-original-day', day);
                    lectureCard.setAttribute('data-original-timeslot', timeSlot);
                    lectureCard.setAttribute('data-doctor-id', lecture.doctorId); // لإعادة تعيين الدكتور عند السحب
                    lectureCard.setAttribute('data-duration-slots', slotsOccupied); // لحساب الفترات عند السحب

                    lectureCard.innerHTML = `
                        <p class="font-semibold">${lecture.courseName}</p>
                        <p>${lecture.sectionName}</p>
                        <p>${lecture.roomName}</p>
                        <p class="text-xs text-gray-500">${lecture.type === 'short' ? 'قصيرة' : 'طويلة'}</p>
                    `;
                    dropZone.appendChild(lectureCard); // وضع المحاضرة داخل الـ dropZone
                    td.classList.add('has-lecture');
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    // تهيئة Dragula بعد تحميل الجداول
    initDragula();
};

/**
 * وظيفة تهيئة مكتبة Dragula للسحب والإفلات.
 * تسمح للمستخدم بتغيير موقع المحاضرات يدويًا.
 */
const initDragula = () => {
    // جمع جميع العناصر التي يمكن أن تكون حاوية (drop zone)
    const containers = Array.from(document.querySelectorAll('.time-slot-cell .drop-zone'));

    const drake = dragula(containers, {
        // يسمح بسحب العناصر التي تحتوي على الكلاس 'draggable-lecture' فقط
        moves: function (el, source, handle, sibling) {
            return el.classList.contains('draggable-lecture');
        },
        // يمكن إسقاط العناصر في أي حاوية (drop-zone)
        accepts: function (el, target, source, sibling) {
            // هذا هو المكان الذي نتحقق فيه من صحة الإسقاط
            const lectureId = el.getAttribute('data-lecture-id');
            const originalDay = el.getAttribute('data-original-day');
            const originalTimeSlot = el.getAttribute('data-original-timeslot');
            const originalDoctorId = parseInt(el.getAttribute('data-doctor-id'));
            const lectureType = el.getAttribute('data-lecture-type');
            const durationSlots = parseInt(el.getAttribute('data-duration-slots'));

            const targetDay = target.parentElement.getAttribute('data-day');
            const targetTimeSlot = target.parentElement.getAttribute('data-timeslot');
            const targetDoctorId = parseInt(target.parentElement.getAttribute('data-doctorid')); // الدكتور الذي يستقبل المحاضرة

            // إذا كان Target نفسه Source، فلا يوجد تغيير
            if (source === target) {
                return true;
            }

            // منع الإسقاط إذا كانت الخلية الهدف تحتوي بالفعل على محاضرة (مباشرة أو بسبب rowspan)
            if (target.children.length > 0) {
                 // تأكد أن الخلية لا تحتوي على draggable-lecture فعلياً
                 if (target.querySelector('.draggable-lecture')) {
                     return false;
                 }
            }

            // التحقق من توافر الدكتور في الموقع الجديد
            const newDoctor = doctors.find(d => d.id === targetDoctorId);
            const course = courses.find(c => c.id === parseInt(el.getAttribute('data-course-id')));
            if (!newDoctor || !course) {
                console.warn("Missing doctor or course data for drop validation.");
                return false;
            }

            // التحقق من توافر الدكتور في الوقت الجديد (مع الأخذ في الاعتبار المحاضرة التي تم نقلها)
            // لإجراء تحقق صحيح، يجب "إزالة" المحاضرة من موقعها الأصلي مؤقتًا ثم التحقق من الموقع الجديد.
            // هذا يتطلب منطقًا معقدًا. لتبسيط، سنفترض أن الدكتور يمكنه أخذ المحاضرة الجديدة إذا كان الوقت متاحًا له
            // وإذا لم يتجاوز عدد ساعاته الإجمالي.
            // التحقق المبسّط: هل الوقت متاح للدكتور الجديد؟
            if (!isDoctorAvailable(newDoctor, targetDay, targetTimeSlot, lectureDurations[lectureType])) {
                alert(`الدكتور ${newDoctor.name} غير متاح في ${daysArabic[targetDay]} الساعة ${targetTimeSlot}.`);
                return false;
            }

            // التحقق من توافر القاعة في الموقع الجديد
            const targetRoomId = parseInt(el.getAttribute('data-room-id')); // افتراض أن القاعة لا تتغير بالسحب
            const targetRoom = rooms.find(r => r.id === targetRoomId);
            if (!targetRoom) {
                 console.warn("Missing room data for drop validation.");
                 return false;
            }

            if (!isRoomAvailable(targetRoom, targetDay, targetTimeSlot, lectureDurations[lectureType])) {
                alert(`القاعة ${targetRoom.name} غير متاحة في ${daysArabic[targetDay]} الساعة ${targetTimeSlot}.`);
                return false;
            }

            // تحقق من عدم تداخل المحاضرة الطويلة مع خلايا أخرى
            const targetTimeSlotIndex = timeSlots.indexOf(targetTimeSlot);
            for (let i = 0; i < durationSlots; i++) {
                const checkSlot = timeSlots[targetTimeSlotIndex + i];
                if (!checkSlot) { // خارج حدود الوقت
                    alert('لا توجد فترات زمنية كافية في هذا الموقع.');
                    return false;
                }
                // تحقق من أن الخلايا التي ستشغلها المحاضرة الجديدة فارغة
                const targetCell = document.querySelector(`td[data-day="${targetDay}"][data-timeslot="${checkSlot}"][data-doctorid="${targetDoctorId}"] .drop-zone`);
                if (targetCell && targetCell.children.length > 0 && targetCell.querySelector('.draggable-lecture')) {
                    // إذا كانت الخلية تحتوي على محاضرة أخرى غير تلك التي نسحبها (إذا كانت من نفس الدكتور)
                    if (targetCell.querySelector('.draggable-lecture').getAttribute('data-lecture-id') !== lectureId) {
                         alert('يوجد تداخل مع محاضرة أخرى في الموقع الجديد.');
                         return false;
                    }
                }
            }

            return true; // السماح بالإسقاط إذا كانت جميع الشروط متوفرة
        }
    });

    // معالج حدث عند الانتهاء من السحب والإفلات
    drake.on('drop', (el, target, source, sibling) => {
        const lectureId = el.getAttribute('data-lecture-id');
        const originalDay = el.getAttribute('data-original-day');
        const originalTimeSlot = el.getAttribute('data-original-timeslot');
        const originalDoctorId = parseInt(el.getAttribute('data-doctor-id'));
        const lectureType = el.getAttribute('data-lecture-type');
        const durationSlots = parseInt(el.getAttribute('data-duration-slots'));

        const targetDay = target.parentElement.getAttribute('data-day');
        const targetTimeSlot = target.parentElement.getAttribute('data-timeslot');
        const targetDoctorId = parseInt(target.parentElement.getAttribute('data-doctorid'));

        // تحديث هيكل الجداول في الذاكرة (schedule, doctorSchedules, roomAvailability)
        // 1. إزالة المحاضرة من مكانها الأصلي
        for (let i = 0; i < durationSlots; i++) {
            const currentOriginalSlot = timeSlots[timeSlots.indexOf(originalTimeSlot) + i];
            if (currentOriginalSlot) {
                const originalLecture = schedule[originalDay][currentOriginalSlot][parseInt(el.getAttribute('data-room-id'))];
                if (originalLecture && originalLecture.doctorId === originalDoctorId && originalLecture.startTime === originalTimeSlot) {
                     delete schedule[originalDay][currentOriginalSlot][parseInt(el.getAttribute('data-room-id'))];
                     roomAvailability[parseInt(el.getAttribute('data-room-id'))][originalDay][currentOriginalSlot] = true;
                }
                doctorSchedules[originalDoctorId][originalDay][currentOriginalSlot] = null;
            }
        }
        // خصم الساعات من الدكتور الأصلي
        const originalDoctor = doctors.find(d => d.id === originalDoctorId);
        if (originalDoctor) {
            originalDoctor.assignedHours -= lectureDurations[lectureType];
        }


        // 2. إضافة المحاضرة إلى مكانها الجديد
        const sectionId = parseInt(el.getAttribute('data-section-id'));
        const courseId = parseInt(el.getAttribute('data-course-id'));
        const roomId = parseInt(el.getAttribute('data-room-id')); // نفترض أن القاعة لم تتغير
        const newLectureData = {
            sectionId: sectionId,
            doctorId: targetDoctorId, // الدكتور يمكن أن يتغير إذا سحبت المحاضرة إلى جدول دكتور آخر
            courseId: courseId,
            roomName: rooms.find(r => r.id === roomId)?.name || 'غير معروف',
            courseName: courses.find(c => c.id === courseId)?.name || 'غير معروف',
            sectionName: sections.find(s => s.id === sectionId)?.name || 'غير معروف',
            doctorName: doctors.find(d => d.id === targetDoctorId)?.name || 'غير معروف',
            type: lectureType,
            startTime: targetTimeSlot,
            durationSlots: durationSlots
        };

        for (let i = 0; i < durationSlots; i++) {
            const currentTargetSlot = timeSlots[timeSlots.indexOf(targetTimeSlot) + i];
            if (currentTargetSlot) {
                schedule[targetDay][currentTargetSlot][roomId] = newLectureData;
                roomAvailability[roomId][targetDay][currentTargetSlot] = false;
                doctorSchedules[targetDoctorId][targetDay][currentTargetSlot] = newLectureData;
            }
        }
        // إضافة الساعات للدكتور الجديد
        const newDoctor = doctors.find(d => d.id === targetDoctorId);
        if (newDoctor) {
            newDoctor.assignedHours += lectureDurations[lectureType];
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
        saveData('doctors', doctors); // تحديث ساعات الدكاترة بعد النقل
        saveData('sections', sections); // تحديث حالة isScheduled إذا تغيرت
        console.log('Schedule updated via drag and drop.');
    });

    drake.on('cancel', (el, container, source) => {
        // إذا تم إلغاء السحب (مثلاً تم سحب العنصر خارج الحاويات المقبولة)
        console.log('Drag cancelled.');
        // قد تحتاج إلى إعادة العنصر إلى مكانه الأصلي يدويًا إذا كانت Dragula لا تفعل ذلك تلقائيًا
        // في معظم الحالات، Dragula تعيد العنصر إذا لم يكن هناك إسقاط صالح.
    });

};


// معالج حدث لزر توليد الجداول
document.getElementById('generate-schedule-btn').addEventListener('click', generateSchedules);

// معالج حدث لزر تصدير الجداول كصور
document.getElementById('export-schedules-btn').addEventListener('click', () => {
    const doctorScheduleCards = document.querySelectorAll('.doctor-schedule-card');
    if (doctorScheduleCards.length === 0) {
        alert('لا توجد جداول لتصديرها. الرجاء توليد الجداول أولاً.');
        return;
    }

    doctorScheduleCards.forEach((card, index) => {
        // استخدم html2canvas لتصدير كل بطاقة جدول كصورة
        html2canvas(card, {
            scale: 2, // لزيادة جودة الصورة
            logging: true,
            useCORS: true // في حال وجود موارد من أصل مختلف
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            // اسم الملف سيكون بناءً على اسم الدكتور
            const doctorName = card.querySelector('h2').textContent.replace('جدول الدكتور: ', '').trim();
            link.download = `جدول-الدكتور-${doctorName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(error => {
            console.error('Error exporting schedule as image:', error);
            alert('حدث خطأ أثناء تصدير الجداول كصور.');
        });
    });
    alert('بدأ تصدير الجداول. قد تحتاج للموافقة على كل تنزيل.');
});


// عند تحميل الصفحة، عرض الجداول الموجودة في LocalStorage (إذا كانت موجودة)
document.addEventListener('DOMContentLoaded', () => {
    // حاول جلب الجداول المجدولة سابقاً
    const storedSchedule = getData('generatedSchedule');
    const storedDoctorSchedules = getData('doctorSchedules');
    const storedDoctors = getData('doctors');
    const storedSections = getData('sections');

    if (storedSchedule && Object.keys(storedSchedule).length > 0 &&
        storedDoctorSchedules && Object.keys(storedDoctorSchedules).length > 0) {
        // إعادة تعيين المتغيرات العالمية بالبيانات المخزنة
        Object.assign(schedule, storedSchedule);
        Object.assign(doctorSchedules, storedDoctorSchedules);
        doctors = storedDoctors; // تحديث قائمة الدكاترة بساعاتهم المجدولة
        sections = storedSections; // تحديث قائمة الشعب بحالة isScheduled

        // إعادة بناء roomAvailability من schedule لضمان الدقة
        rooms.forEach(room => {
            roomAvailability[room.id] = {};
            days.forEach(day => {
                roomAvailability[room.id][day] = {};
                timeSlots.forEach(slot => {
                    roomAvailability[room.id][day][slot] = true; // افترض أنها متاحة
                    // تحقق مما إذا كانت مشغولة في الجدول المجدول
                    if (schedule[day] && schedule[day][slot] && schedule[day][slot][room.id]) {
                        roomAvailability[room.id][day][slot] = false;
                    }
                });
            });
        });

        document.getElementById('generation-status').textContent = 'تم تحميل الجداول السابقة.';
        displayGeneratedSchedules();
    } else {
        document.getElementById('generation-status').textContent = 'لا توجد جداول سابقة. الرجاء إدخال البيانات وتوليد الجداول.';
    }
});