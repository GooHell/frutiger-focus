/**
 * Frutiger Focus v1.2 - 通知模块
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
    sendBrowserNotification('新的一天开始了！来规划今天的任务吧 🌅', '早安！');

    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = '🌅 早安！新的一天';
    body.innerHTML = `
      <p style="color: var(--text-secondary); margin-bottom: 16px;">
        今天想要完成什么？添加今天的任务吧：
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div class="morning-task-input" style="display:flex; gap:8px;">
          <input type="text" id="morning-task-1" placeholder="任务 1..." 
                 style="flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-size:0.9rem;">
        </div>
        <div class="morning-task-input" style="display:flex; gap:8px;">
          <input type="text" id="morning-task-2" placeholder="任务 2..." 
                 style="flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-size:0.9rem;">
        </div>
        <div class="morning-task-input" style="display:flex; gap:8px;">
          <input type="text" id="morning-task-3" placeholder="任务 3..." 
                 style="flex:1; padding:8px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font-size:0.9rem;">
        </div>
      </div>
    `;

    footer.innerHTML = `
      <button class="modal-btn secondary" onclick="Notifications.closeModal()">稍后</button>
      <button class="modal-btn primary" onclick="Notifications.saveMorningTasks()">添加任务</button>
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
      showToast(`✅ 已添加 ${count} 个任务，加油！`);
    }
  }

  // 晚间回顾弹窗
  async function showEveningReview() {
    sendBrowserNotification('是时候回顾一下今天的成果了 🌙', '晚间回顾');

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

    title.textContent = '🌙 今日回顾';

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
        <p style="color:var(--text-secondary);">今天你专注了</p>
        <p style="font-size:2rem; font-weight:700; color:var(--accent);">${totalMinutes} <span style="font-size:1rem;">分钟</span></p>
        <p style="color:var(--text-secondary); font-size:0.85rem;">完成 ${completedCount}/${totalCount} 个任务</p>
      </div>
      ${tasks.length > 0 ? `
        <p style="color:var(--text-secondary); margin-bottom:8px; font-size:0.9rem;">
          勾选今天完成的任务：
        </p>
        ${taskListHtml}
      ` : '<p style="color:var(--text-muted); text-align:center;">今天没有设定任务</p>'}
    `;

    footer.innerHTML = `
      <button class="modal-btn primary" onclick="Notifications.closeModal()">好的，晚安 🌙</button>
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