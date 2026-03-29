/**
 * Frutiger Focus v1.3.5 - 数据库模块 (IndexedDB)
 * 管理所有本地数据的持久化存储
 */

const DB = (() => {
  const DB_NAME = 'FocusMateDB'; // 保持旧名以兼容已有数据
  const DB_VERSION = 1;
  let db = null;

  // 初始化数据库
  function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // 任务表
        if (!database.objectStoreNames.contains('tasks')) {
          const taskStore = database.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('date', 'date', { unique: false });
          taskStore.createIndex('completed', 'completed', { unique: false });
        }

        // 专注记录表
        if (!database.objectStoreNames.contains('sessions')) {
          const sessionStore = database.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('date', 'date', { unique: false });
          sessionStore.createIndex('taskId', 'taskId', { unique: false });
        }

        // 设置表
        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };
    });
  }

  // 通用事务操作
  function getStore(storeName, mode = 'readonly') {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== 任务操作 =====

  function addTask(task) {
    const store = getStore('tasks', 'readwrite');
    return promisifyRequest(store.put(task));
  }

  function getTask(id) {
    const store = getStore('tasks');
    return promisifyRequest(store.get(id));
  }

  function getAllTasks() {
    const store = getStore('tasks');
    return promisifyRequest(store.getAll());
  }

  function getTasksByDate(date) {
    return new Promise((resolve, reject) => {
      const store = getStore('tasks');
      const index = store.index('date');
      const request = index.getAll(IDBKeyRange.only(date));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function updateTask(task) {
    const store = getStore('tasks', 'readwrite');
    return promisifyRequest(store.put(task));
  }

  function deleteTask(id) {
    const store = getStore('tasks', 'readwrite');
    return promisifyRequest(store.delete(id));
  }

  // ===== 专注记录操作 =====

  function addSession(session) {
    const store = getStore('sessions', 'readwrite');
    return promisifyRequest(store.put(session));
  }

  function getAllSessions() {
    const store = getStore('sessions');
    return promisifyRequest(store.getAll());
  }

  function getSessionsByDate(date) {
    return new Promise((resolve, reject) => {
      const store = getStore('sessions');
      const index = store.index('date');
      const request = index.getAll(IDBKeyRange.only(date));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function getSessionsByDateRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const store = getStore('sessions');
      const index = store.index('date');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ===== 设置操作 =====

  function getSetting(key) {
    const store = getStore('settings');
    return promisifyRequest(store.get(key)).then(result =>
      result ? result.value : null
    );
  }

  function setSetting(key, value) {
    const store = getStore('settings', 'readwrite');
    return promisifyRequest(store.put({ key, value }));
  }

  function getAllSettings() {
    const store = getStore('settings');
    return promisifyRequest(store.getAll()).then(results => {
      const settings = {};
      results.forEach(r => { settings[r.key] = r.value; });
      return settings;
    });
  }

  // ===== 数据导入导出 =====

  async function exportData() {
    const tasks = await getAllTasks();
    const sessions = await getAllSessions();
    const settings = await getAllSettings();
    return { tasks, sessions, settings, exportDate: new Date().toISOString() };
  }

  async function importData(data) {
    if (data.tasks) {
      const store = getStore('tasks', 'readwrite');
      for (const task of data.tasks) {
        store.put(task);
      }
    }
    if (data.sessions) {
      const store = getStore('sessions', 'readwrite');
      for (const session of data.sessions) {
        store.put(session);
      }
    }
    if (data.settings) {
      const store = getStore('settings', 'readwrite');
      for (const [key, value] of Object.entries(data.settings)) {
        store.put({ key, value });
      }
    }
  }

  async function clearAllData() {
    const tx = db.transaction(['tasks', 'sessions', 'settings'], 'readwrite');
    tx.objectStore('tasks').clear();
    tx.objectStore('sessions').clear();
    tx.objectStore('settings').clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  // ===== 工具函数 =====

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function getToday() {
    return new Date().toISOString().split('T')[0];
  }

  return {
    init,
    addTask, getTask, getAllTasks, getTasksByDate, updateTask, deleteTask,
    addSession, getAllSessions, getSessionsByDate, getSessionsByDateRange,
    getSetting, setSetting, getAllSettings,
    exportData, importData, clearAllData,
    generateId, getToday
  };
})();