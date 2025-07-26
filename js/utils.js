// js/utils.js

/**
 * وظيفة لحفظ البيانات في LocalStorage.
 * @param {string} key - المفتاح الذي سيتم تخزين البيانات تحته.
 * @param {Array<Object>} data - البيانات التي سيتم تخزينها (يجب أن تكون قابلة للتحويل إلى JSON).
 */
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Data for ${key} saved successfully.`);
    } catch (e) {
        console.error(`Error saving data for ${key}:`, e);
        // رسالة تنبيه للمستخدم في حالة وجود مشكلة في التخزين
        alert('حدث خطأ أثناء حفظ البيانات. قد يكون التخزين ممتلئًا أو المتصفح لا يدعم LocalStorage.');
    }
}

/**
 * وظيفة لجلب البيانات من LocalStorage.
 * @param {string} key - المفتاح الذي تم تخزين البيانات تحته.
 * @returns {Array<Object>} البيانات المحفوظة، أو مصفوفة فارغة إذا لم توجد بيانات أو حدث خطأ.
 */
function getData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error loading data for ${key}:`, e);
        return [];
    }
}

/**
 * وظيفة لمسح البيانات من LocalStorage.
 * @param {string} key - المفتاح الذي سيتم مسح البيانات تحته.
 */
function clearData(key) {
    try {
        localStorage.removeItem(key);
        console.log(`Data for ${key} cleared successfully.`);
    } catch (e) {
        console.error(`Error clearing data for ${key}:`, e);
    }
}

// ملاحظة: هذه الوظائف ستكون متاحة عالمياً بمجرد تضمين ملف utils.js في صفحات HTML قبل ملفات JS الأخرى التي تستخدمها.