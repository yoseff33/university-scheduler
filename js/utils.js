// js/utils.js

function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Data for ${key} saved successfully.`);
    } catch (e) {
        console.error(`Error saving data for ${key}:`, e);
        alert('حدث خطأ أثناء حفظ البيانات. قد يكون التخزين ممتلئًا أو المتصفح لا يدعم LocalStorage.');
    }
}

function getData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error loading data for ${key}:`, e);
        return [];
    }
}

function clearData(key) {
    try {
        localStorage.removeItem(key);
        console.log(`Data for ${key} cleared successfully.`);
    } catch (e) {
        console.error(`Error clearing data for ${key}:`, e);
    }
}

/**
 * وظيفة لتحويل الوقت HH:MM إلى دقائق من منتصف الليل.
 * @param {string} timeStr - الوقت بتنسيق HH:MM (مثال: "09:30").
 * @returns {number} عدد الدقائق من منتصف الليل، أو -1 إذا كان المدخل غير صالح.
 */
const timeToMinutes = (timeStr) => {
    if (!timeStr) return -1;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return -1; // Invalid time format or out of range
    }
    return hours * 60 + minutes;
};

/**
 * وظيفة لتحويل الدقائق من منتصف الليل إلى تنسيق HH:MM.
 * تم إضافتها لمعالجة خطأ 'minutesToTime is not defined'.
 * @param {number} totalMinutes - العدد الإجمالي للدقائق من منتصف الليل.
 * @returns {string} الوقت بتنسيق HH:MM (مثال: "09:50").
 */
const minutesToTime = (totalMinutes) => {
    if (totalMinutes < 0 || totalMinutes >= 1440 || isNaN(totalMinutes)) { // 1440 minutes in a day
        return "Invalid Time";
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};
