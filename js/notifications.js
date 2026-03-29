/**
 * Frutiger Focus v1.3.5 - 通知模块
 * 早晨规划提醒 & 晚间回顾提醒
 */

const Notifications = (() => {
  let morningTimer = null;
  let eveningTimer = null;
  let checkInterval = null;

  const defaultSettings = {
    enabled: true,
    morningTime: '08:00',
    eveningTime: '21:00'
  };

  let settings = { ...defaultSettings };
  let lastMorningDate = '';
  let lastEveningDate = '';

  function init() {
    loadSettings();
    loadLastNotificationDates();
    startCheckLoop();

    // 监听计时器完成事件
    document.addEventListener('timerComplete', (e) => {
      sendBrowserNotification(e.detail.message);
    });
  }

  // 请求通知权限
  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('此浏览器不支持通知');
      return false;
    }

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  // 发送浏览器通知
  function sendBrowserNotification(message, title = 'Frutiger Focus') {
    if (!settings.enabled) return;

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: 'assets/icons/icon.svg',
          badge: 'assets/icons/icon.svg',
          tag: 'focusmate-' + Date.now()
        });
      } catch (e) {
        console.warn('通知发送失败:', e);
      }
    }
  }

  // 定时检查循环（每分钟检查一次）
  function startCheckLoop() {
    // 立即检查一次
    checkScheduledNotifications();

    // 每60秒检查一次
    checkInterval = setInterval(checkScheduledNotifications, 60000);
  }

  function stopCheckLoop() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  // 检查定时通知
  function checkScheduledNotifications() {
    if (!settings.enabled) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = DB.getToday();

    // 早晨提醒
    if (currentTime === settings.morningTime && lastMorningDate !== today) {
      lastMorningDate = today;
      saveLastNotificationDates();
      showMorningPrompt();
    }

    // 晚间提醒
    if (currentTime === settings.eveningTime && lastEveningDate !== today) {
      lastEveningDate = today;
      saveLastNotificationDates();
      showEveningReview();
    }
  }

  // 早晨提醒弹窗
  async function showMorningPrompt() {
    sendBrowserNotification(I18n.t('notif.morning_body'), I18n.t('notif.morning_title'));

    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = I18n.t('notif.morning_modal_title');
    body.innerHTML = `
      <p style="color: var(--text-secondary); margin-bottom: 16px;">
        ${I18n.t('notif.morning_prompt')}
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div class="morning-task-input" style="display:flex; gap:8px;">
          <input type="text" id="morning-task-1" placeholder="${I18n.t('notif.task_placeholder', 1)}" 
                 style="flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-size:0.9rem;">
        </div>
        <div class="morning-task-input" style="display:flex; gap:8px;">
          <input type="text" id="morning-task-2" placeholder="${I18n.t('notif.task_placeholder', 2)}" 
                 style="flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-size:0.9rem;">
        </div>
        <div class="morning-task-input" style="display:flex; gap:8px;">
          <input type="text" id="morning-task-3" placeholder="${I18n.t('notif.task_placeholder', 3)}" 
                 style="flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-size:0.9rem;">
        </div>
      </div>
    `;

    footer.innerHTML = `
      <button class="modal-btn secondary" onclick="Notifications.closeModal()">${I18n.t('notif.later')}</button>
      <button class="modal-btn primary" onclick="Notifications.saveMorningTasks()">${I18n.t('notif.add_tasks')}</button>
    `;

    overlay.style.display = 'flex';
  }

  // 保存早晨任务
  async function saveMorningTasks() {
    const inputs = [
      document.getElementById('morning-task-1'),
      document.getElementById('morning-task-2'),
      document.getElementById('morning-task-3')
    ];

    let count = 0;
    for (const input of inputs) {
      const name = input?.value?.trim();
      if (name) {
        await DB.addTask({
          id: DB.generateId(),
          name: name,
          completed: false,
          date: DB.getToday(),
          createdAt: new Date().toISOString(),
          focusTime: 0
        });
        count++;
      }
    }

    closeModal();

    if (count > 0) {
      Tasks.renderTasks();
      showToast(I18n.t('notif.tasks_added', count));
    }
  }

  // 晚间回顾弹窗
  async function showEveningReview() {
    sendBrowserNotification(I18n.t('notif.evening_body'), I18n.t('notif.evening_title'));

    const today = DB.getToday();
    const tasks = await DB.getTasksByDate(today);
    const sessions = await DB.getSessionsByDate(today);

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;

    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = I18n.t('notif.evening_modal_title');

    let taskListHtml = '';
    if (tasks.length > 0) {
      taskListHtml = '<ul class="modal-task-list">';
      tasks.forEach(task => {
        taskListHtml += `
          <li class="modal-task-item">
            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="Notifications.toggleReviewTask('${task.id}', this.checked)">
            <span style="${task.completed ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${task.name}</span>
          </li>
        `;
      });
      taskListHtml += '</ul>';
    }

    body.innerHTML = `
      <div style="text-align:center; margin-bottom:16px;">
        <p style="color:var(--text-secondary);">${I18n.t('notif.today_focused')}</p>
        <p style="font-size:2rem; font-weight:700; color:var(--accent);">${totalMinutes} <span style="font-size:1rem;">${I18n.t('notif.minutes_unit')}</span></p>
        <p style="color:var(--text-secondary); font-size:0.85rem;">${I18n.t('notif.tasks_progress', completedCount, totalCount)}</p>
      </div>
      ${tasks.length > 0 ? `
        <p style="color:var(--text-secondary); margin-bottom:8px; font-size:0.9rem;">
          ${I18n.t('notif.check_done')}
        </p>
        ${taskListHtml}
      ` : `<p style="color:var(--text-muted); text-align:center;">${I18n.t('notif.no_tasks_today')}</p>`}
    `;

    footer.innerHTML = `
      <button class="modal-btn primary" onclick="Notifications.closeModal()">${I18n.t('notif.goodnight')}</button>
    `;

    overlay.style.display = 'flex';
  }

  // 在回顾弹窗中切换任务状态（同步更新弹窗 DOM）
  async function toggleReviewTask(taskId, completed) {
    try {
      const task = await DB.getTask(taskId);
      if (task) {
        task.completed = completed;
        task.completedAt = completed ? new Date().toISOString() : null;
        await DB.updateTask(task);
        Tasks.renderTasks();
        Stats.refreshTodayStats();

        // 同步更新弹窗内该任务的样式
        const checkbox = document.querySelector(`input[onchange*="${taskId}"]`);
        if (checkbox) {
          const span = checkbox.nextElementSibling;
          if (span) {
            span.style.textDecoration = completed ? 'line-through' : 'none';
            span.style.color = completed ? 'var(--text-muted)' : '';
          }
        }
      }
    } catch (e) {
      console.error('更新任务失败:', e);
    }
  }

  // 关闭弹窗
  function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  }

  // 更新设置
  function updateSettings(newSettings) {
    Object.assign(settings, newSettings);
    saveSettings();
  }

  // 保存/加载上次通知日期
  function saveLastNotificationDates() {
    localStorage.setItem('fm_lastMorning', lastMorningDate);
    localStorage.setItem('fm_lastEvening', lastEveningDate);
  }

  function loadLastNotificationDates() {
    lastMorningDate = localStorage.getItem('fm_lastMorning') || '';
    lastEveningDate = localStorage.getItem('fm_lastEvening') || '';
  }

  function saveSettings() {
    localStorage.setItem('fm_notifSettings', JSON.stringify(settings));
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('fm_notifSettings');
      if (saved) {
        Object.assign(settings, JSON.parse(saved));
      }
    } catch (e) { /* ignore */ }
  }

  return {
    init,
    requestPermission,
    sendBrowserNotification,
    updateSettings,
    showMorningPrompt,
    showEveningReview,
    saveMorningTasks,
    toggleReviewTask,
    closeModal
  };
})();