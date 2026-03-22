/**
 * Frutiger Focus v1.2 - 主应用模块
 * 初始化、导航、设置、全局功能
 */

// 全局 Toast
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

const App = (() => {
  let currentPage = 'timer';

  async function init() {
    try {
      await DB.init();
      const savedSettings = await loadSettings();

      // 各模块独立初始化（容错隔离）
      try { Timer.init(savedSettings.timer); } catch(e) { console.error('Timer init failed:', e); }
      try { Tasks.init(); } catch(e) { console.error('Tasks init failed:', e); }
      try { Stats.init(); } catch(e) { console.error('Stats init failed:', e); }
      try { AmbientAudio.init(); } catch(e) { console.error('Audio init failed:', e); }
      try { Notifications.init(); } catch(e) { console.error('Notifications init failed:', e); }

      setupNavigation();
      setupTheme();
      setupSettingsListeners();
      setupDataManagement();
      setupPanelToggles();
      Notifications.requestPermission();
      registerServiceWorker();
      setupBeforeUnload();
      setupKeyboardShortcuts();
      applySettingsToUI(savedSettings);

      // 监听模块内部的 toast 事件
      document.addEventListener('showToast', (e) => {
        showToast(e.detail.message, e.detail.type);
      });

      // 首次使用引导
      if (!localStorage.getItem('ff_onboarded')) {
        showOnboarding();
      }

      console.log('✅ Frutiger Focus v1.3 初始化完成');
    } catch (e) {
      console.error('❌ 初始化失败:', e);
      showToast('应用初始化失败', 'error');
    }
  }

  function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.page));
    });
  }

  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');

    if (page === 'timer') Stats.refresh();
    if (page === 'stats') Stats.refresh();
  }

  function setupTheme() {
    const saved = localStorage.getItem('fm_theme');
    if (saved === 'light') document.body.setAttribute('data-theme', 'light');

    function toggleTheme() {
      const isLight = document.body.getAttribute('data-theme') === 'light';
      // 添加过渡类实现平滑切换
      document.body.classList.add('theme-transitioning');
      if (isLight) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('fm_theme', 'dark');
      } else {
        document.body.setAttribute('data-theme', 'light');
        localStorage.setItem('fm_theme', 'light');
      }
      setTimeout(() => document.body.classList.remove('theme-transitioning'), 600);
    }

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    // PC侧边栏主题切换
    const sidebarTheme = document.getElementById('sidebar-theme-toggle');
    if (sidebarTheme) sidebarTheme.addEventListener('click', toggleTheme);
  }

  // 可折叠面板
  function setupPanelToggles() {
    // 白噪音面板
    const ambientToggle = document.getElementById('ambient-toggle');
    const ambientContent = document.getElementById('ambient-content');
    const ambientArrow = document.getElementById('ambient-arrow');
    let ambientOpen = true;

    ambientToggle.addEventListener('click', () => {
      ambientOpen = !ambientOpen;
      ambientContent.classList.toggle('collapsed', !ambientOpen);
      ambientArrow.classList.toggle('collapsed', !ambientOpen);
    });

    // 统计面板
    const statsToggle = document.getElementById('stats-toggle');
    const statsContent = document.getElementById('stats-content');
    const statsArrow = document.getElementById('stats-arrow');
    let statsOpen = true;

    statsToggle.addEventListener('click', () => {
      statsOpen = !statsOpen;
      statsContent.classList.toggle('collapsed', !statsOpen);
      statsArrow.classList.toggle('collapsed', !statsOpen);
      if (statsOpen) Stats.refresh();
    });
  }

  function setupSettingsListeners() {
    ['setting-focus', 'setting-rest'].forEach(id => {
      document.getElementById(id).addEventListener('change', saveTimerSettings);
    });

    document.getElementById('setting-notifications').addEventListener('change', (e) => {
      Notifications.updateSettings({ enabled: e.target.checked });
      saveAllSettings();
      showToast(e.target.checked ? '🔔 通知已开启' : '🔕 通知已关闭');
      if (e.target.checked) Notifications.requestPermission();
    });

    document.getElementById('setting-morning-time').addEventListener('change', (e) => {
      Notifications.updateSettings({ morningTime: e.target.value });
      saveAllSettings();
      showToast(`⏰ 早晨提醒设为 ${e.target.value}`);
    });

    document.getElementById('setting-evening-time').addEventListener('change', (e) => {
      Notifications.updateSettings({ eveningTime: e.target.value });
      saveAllSettings();
      showToast(`🌙 晚间回顾设为 ${e.target.value}`);
    });

    document.getElementById('setting-sound').addEventListener('change', () => saveAllSettings());

    // 恢复默认设置
    document.getElementById('btn-reset-settings').addEventListener('click', async () => {
      if (!confirm('确定恢复所有设置为默认值吗？')) return;
      document.getElementById('setting-focus').value = 25;
      document.getElementById('setting-rest').value = 5;
      document.getElementById('setting-sound').checked = true;
      document.getElementById('setting-notifications').checked = true;
      document.getElementById('setting-morning-time').value = '08:00';
      document.getElementById('setting-evening-time').value = '21:00';
      saveTimerSettings();
      Notifications.updateSettings({ enabled: true, morningTime: '08:00', eveningTime: '21:00' });
      await saveAllSettings();
      showToast('↺ 已恢复默认设置');
    });
  }

  function saveTimerSettings() {
    const s = {
      focusMinutes: parseInt(document.getElementById('setting-focus').value) || 25,
      restMinutes: parseInt(document.getElementById('setting-rest').value) || 5,
      soundEnabled: document.getElementById('setting-sound').checked
    };
    Timer.updateSettings(s);
    saveAllSettings();
    showToast('⚙️ 设置已保存');
  }

  async function saveAllSettings() {
    try {
      await DB.setSetting('appSettings', {
        timer: {
          focusMinutes: parseInt(document.getElementById('setting-focus').value) || 25,
          restMinutes: parseInt(document.getElementById('setting-rest').value) || 5,
          soundEnabled: document.getElementById('setting-sound').checked
        },
        notifications: {
          enabled: document.getElementById('setting-notifications').checked,
          morningTime: document.getElementById('setting-morning-time').value,
          eveningTime: document.getElementById('setting-evening-time').value
        }
      });
    } catch (e) { console.error('保存设置失败:', e); }
  }

  async function loadSettings() {
    try {
      return await DB.getSetting('appSettings') || { timer: {}, notifications: {} };
    } catch (e) {
      return { timer: {}, notifications: {} };
    }
  }

  function applySettingsToUI(settings) {
    if (settings.timer) {
      const t = settings.timer;
      if (t.focusMinutes) document.getElementById('setting-focus').value = t.focusMinutes;
      if (t.restMinutes) document.getElementById('setting-rest').value = t.restMinutes;
      if (t.soundEnabled !== undefined) document.getElementById('setting-sound').checked = t.soundEnabled;
    }
    if (settings.notifications) {
      const n = settings.notifications;
      if (n.enabled !== undefined) document.getElementById('setting-notifications').checked = n.enabled;
      if (n.morningTime) document.getElementById('setting-morning-time').value = n.morningTime;
      if (n.eveningTime) document.getElementById('setting-evening-time').value = n.eveningTime;
    }
  }

  function setupDataManagement() {
    document.getElementById('btn-export').addEventListener('click', async () => {
      try {
        const data = await DB.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `focusmate_backup_${DB.getToday()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📤 数据已导出');
      } catch (e) { showToast('❌ 导出失败', 'error'); }
    });

    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const strategy = confirm(
          '请选择导入方式：\n\n' +
          '【确定】= 替换（清除现有数据后导入）\n' +
          '【取消】= 合并（保留现有数据，追加导入）'
        );
        if (strategy) {
          // 替换模式：先清除再导入
          await DB.clearAllData();
        }
        await DB.importData(data);
        Tasks.renderTasks();
        Stats.refresh();
        showToast(strategy ? '📥 数据已替换导入' : '📥 数据已合并导入');
      } catch (err) { showToast('❌ 导入失败', 'error'); }
      e.target.value = '';
    });

    document.getElementById('btn-clear-data').addEventListener('click', async () => {
      if (confirm('确定要清除所有数据吗？此操作不可撤销！')) {
        try {
          await DB.clearAllData();
          Tasks.renderTasks();
          Stats.refresh();
          showToast('🗑️ 所有数据已清除');
        } catch (e) { showToast('❌ 清除失败', 'error'); }
      }
    });
  }

  // PC 快捷键
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 忽略输入框内的按键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const timerState = Timer.getState();

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (timerState.status === 'idle') Timer.startTimer();
          else Timer.togglePause();
          break;
        case 'Escape':
          if (timerState.status !== 'idle') {
            Timer.resetTimer();
            showToast('⏹ 已重置');
          }
          break;
        case 'Digit1': navigateTo('timer'); break;
        case 'Digit2': navigateTo('tasks'); break;
        case 'Digit3': navigateTo('stats'); break;
        case 'Digit4': navigateTo('settings'); break;
      }
    });
  }

  // 离开保护：专注中离开时提示
  function setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
      const timerState = Timer.getState();
      if (timerState.status === 'running' || timerState.status === 'paused') {
        e.preventDefault();
        e.returnValue = '计时器正在运行中，确定要离开吗？';
        return e.returnValue;
      }
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker 注册成功'))
        .catch(err => console.warn('Service Worker 注册失败:', err));
    }
  }

  // 首次使用引导
  function showOnboarding() {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = '🎯 欢迎使用 Frutiger Focus';
    body.innerHTML = `
      <div style="text-align:center; line-height:1.8; color:var(--text-secondary);">
        <p style="font-size:1.1rem; color:var(--text-primary); margin-bottom:12px;">
          一个极简、轻量的专注工具
        </p>
        <div style="text-align:left; max-width:280px; margin:0 auto; font-size:0.9rem;">
          <p>🍅 <strong>番茄钟</strong> — 专注→休息→下一轮</p>
          <p>📋 <strong>任务</strong> — 管理待办，关联专注</p>
          <p>🎵 <strong>环境音</strong> — 多种场景音可叠加</p>
          <p>📊 <strong>统计</strong> — 记录每日专注数据</p>
        </div>
        <p style="margin-top:16px; font-size:0.82rem; color:var(--text-muted);">
          快捷键：空格 开始/暂停 · Esc 重置 · 1/2/3 切换页面
        </p>
      </div>
    `;
    footer.innerHTML = `
      <button class="modal-btn primary" onclick="
        localStorage.setItem('ff_onboarded', '1');
        document.getElementById('modal-overlay').style.display='none';
      ">开始使用 →</button>
    `;
    overlay.style.display = 'flex';
  }

  return { init, navigateTo };
})();

document.addEventListener('DOMContentLoaded', () => App.init());