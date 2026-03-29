/**
 * Frutiger Focus v1.3.5 - 主应用模块
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
      // i18n 先于其他模块初始化
      I18n.init();

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
      setupLanguageSwitcher();
      Notifications.requestPermission();
      registerServiceWorker();
      setupBeforeUnload();
      setupKeyboardShortcuts();
      applySettingsToUI(savedSettings);

      // 监听模块内部的 toast 事件
      document.addEventListener('showToast', (e) => {
        showToast(e.detail.message, e.detail.type);
      });

      // 语言变更时刷新动态内容
      document.addEventListener('langChanged', () => {
        Tasks.renderTasks();
        Stats.refresh();
      });

      // 首次使用引导
      if (!localStorage.getItem('ff_onboarded')) {
        showOnboarding();
      }

      console.log(I18n.t('toast.init_ok'));
    } catch (e) {
      console.error('❌ 初始化失败:', e);
      showToast(I18n.t('toast.app_init_fail'), 'error');
    }
  }

  function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.page));
    });
  }

  function navigateTo(page) {
    // tasks 页已合并到 timer，兼容旧调用
    if (page === 'tasks') page = 'timer';
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

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

    // 任务面板
    const tasksToggle = document.getElementById('tasks-toggle');
    const tasksContent = document.getElementById('tasks-content');
    const tasksArrow = document.getElementById('tasks-arrow');
    let tasksOpen = true;

    if (tasksToggle) {
      tasksToggle.addEventListener('click', () => {
        tasksOpen = !tasksOpen;
        tasksContent.classList.toggle('collapsed', !tasksOpen);
        tasksArrow.classList.toggle('collapsed', !tasksOpen);
      });
    }
  }

  function setupSettingsListeners() {
    ['setting-focus', 'setting-rest'].forEach(id => {
      document.getElementById(id).addEventListener('change', saveTimerSettings);
    });

    document.getElementById('setting-notifications').addEventListener('change', (e) => {
      Notifications.updateSettings({ enabled: e.target.checked });
      saveAllSettings();
      showToast(e.target.checked ? I18n.t('toast.notifications_on') : I18n.t('toast.notifications_off'));
      if (e.target.checked) Notifications.requestPermission();
    });

    document.getElementById('setting-morning-time').addEventListener('change', (e) => {
      Notifications.updateSettings({ morningTime: e.target.value });
      saveAllSettings();
      showToast(I18n.t('toast.morning_set', e.target.value));
    });

    document.getElementById('setting-evening-time').addEventListener('change', (e) => {
      Notifications.updateSettings({ eveningTime: e.target.value });
      saveAllSettings();
      showToast(I18n.t('toast.evening_set', e.target.value));
    });

    document.getElementById('setting-sound').addEventListener('change', () => saveAllSettings());

    // 恢复默认设置
    document.getElementById('btn-reset-settings').addEventListener('click', async () => {
      if (!confirm(I18n.t('toast.reset_confirm'))) return;
      document.getElementById('setting-focus').value = 25;
      document.getElementById('setting-rest').value = 5;
      document.getElementById('setting-sound').checked = true;
      document.getElementById('setting-notifications').checked = true;
      document.getElementById('setting-morning-time').value = '08:00';
      document.getElementById('setting-evening-time').value = '21:00';
      saveTimerSettings();
      Notifications.updateSettings({ enabled: true, morningTime: '08:00', eveningTime: '21:00' });
      await saveAllSettings();
      showToast(I18n.t('toast.reset_settings'));
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
    showToast(I18n.t('toast.settings_saved'));
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
    // ===== 压缩文本导出 =====
    document.getElementById('btn-export-text').addEventListener('click', async () => {
      try {
        const data = await DB.exportData();
        const json = JSON.stringify(data);
        const compressed = btoa(unescape(encodeURIComponent(json)));
        const wrapped = `FF1:${compressed}`; // FF1 = Frutiger Focus v1 格式标识
        const textarea = document.getElementById('export-text-output');
        textarea.value = wrapped;
        document.getElementById('export-text-area').style.display = '';
        // 自动复制到剪贴板
        try {
          await navigator.clipboard.writeText(wrapped);
          showToast(I18n.t('toast.exported_copied'));
        } catch (clipErr) {
          showToast(I18n.t('toast.exported_manual'));
        }
      } catch (e) { showToast(I18n.t('toast.export_failed'), 'error'); }
    });

    document.getElementById('btn-copy-export')?.addEventListener('click', async () => {
      const text = document.getElementById('export-text-output').value;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        showToast(I18n.t('toast.copied'));
      } catch (e) {
        document.getElementById('export-text-output').select();
        document.execCommand('copy');
        showToast(I18n.t('toast.copied_short'));
      }
    });

    // ===== 压缩文本导入 =====
    document.getElementById('btn-show-import').addEventListener('click', () => {
      document.getElementById('import-text-area').style.display = '';
      document.getElementById('import-text-input').focus();
    });

    async function importFromText(replace) {
      const raw = document.getElementById('import-text-input').value.trim();
      if (!raw) { showToast(I18n.t('toast.paste_data'), 'error'); return; }
      try {
        let json;
        if (raw.startsWith('FF1:')) {
          // 压缩文本格式
          const b64 = raw.slice(4);
          json = decodeURIComponent(escape(atob(b64)));
        } else if (raw.startsWith('{')) {
          // 直接粘贴的 JSON
          json = raw;
        } else {
          showToast(I18n.t('toast.unrecognized'), 'error'); return;
        }
        const data = JSON.parse(json);
        if (replace) await DB.clearAllData();
        await DB.importData(data);
        Tasks.renderTasks();
        Stats.refresh();
        document.getElementById('import-text-input').value = '';
        document.getElementById('import-text-area').style.display = 'none';
        showToast(replace ? I18n.t('toast.import_replaced') : I18n.t('toast.import_merged'));
      } catch (err) { showToast(I18n.t('toast.import_failed'), 'error'); }
    }

    document.getElementById('btn-import-replace').addEventListener('click', () => importFromText(true));
    document.getElementById('btn-import-merge').addEventListener('click', () => importFromText(false));

    // ===== 文件导入导出（备选） =====
    document.getElementById('btn-export').addEventListener('click', async () => {
      try {
        const data = await DB.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `frutiger_focus_backup_${DB.getToday()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(I18n.t('toast.json_exported'));
      } catch (e) { showToast(I18n.t('toast.export_failed'), 'error'); }
    });

    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const strategy = confirm(I18n.t('toast.import_strategy'));
        if (strategy) await DB.clearAllData();
        await DB.importData(data);
        Tasks.renderTasks();
        Stats.refresh();
        showToast(strategy ? I18n.t('toast.import_replaced') : I18n.t('toast.import_merged'));
      } catch (err) { showToast(I18n.t('toast.import_failed'), 'error'); }
      e.target.value = '';
    });

    // ===== 清除数据 =====
    document.getElementById('btn-clear-data').addEventListener('click', async () => {
      if (confirm(I18n.t('toast.clear_confirm'))) {
        try {
          await DB.clearAllData();
          Tasks.renderTasks();
          Stats.refresh();
          showToast(I18n.t('toast.data_cleared'));
        } catch (e) { showToast(I18n.t('toast.clear_failed'), 'error'); }
      }
    });

    // ===== GitHub Gist 云同步 =====
    setupGistSync();
  }

  // ===== GitHub Gist 同步模块 =====

  function setupGistSync() {
    const GIST_FILENAME = 'frutiger-focus-sync.json';
    const tokenInput = document.getElementById('setting-gist-token');
    const statusEl = document.getElementById('sync-status');
    const iconEl = document.getElementById('sync-icon');
    const msgEl = document.getElementById('sync-message');

    // 恢复已保存的 Token
    const savedToken = localStorage.getItem('ff_gist_token');
    if (savedToken) tokenInput.value = savedToken;

    // Token 显示/隐藏切换
    document.getElementById('btn-toggle-token')?.addEventListener('click', () => {
      tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
    });

    // 保存 Token（输入时自动保存）
    tokenInput.addEventListener('change', () => {
      localStorage.setItem('ff_gist_token', tokenInput.value.trim());
    });

    function showSyncStatus(icon, message) {
      statusEl.style.display = '';
      iconEl.textContent = icon;
      msgEl.textContent = message;
    }

    function hideSyncStatus() {
      setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    }

    function getToken() {
      const token = tokenInput.value.trim();
      if (!token) {
        showToast(I18n.t('toast.no_token'), 'error');
        return null;
      }
      localStorage.setItem('ff_gist_token', token);
      return token;
    }

    // 查找已存在的 Gist
    async function findGist(token) {
      const res = await fetch('https://api.github.com/gists', {
        headers: { 'Authorization': `token ${token}` }
      });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const gists = await res.json();
      return gists.find(g => g.files && g.files[GIST_FILENAME]);
    }

    // 创建新 Gist
    async function createGist(token, data) {
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: 'Frutiger Focus - Data Sync',
          public: false,
          files: { [GIST_FILENAME]: { content: JSON.stringify(data) } }
        })
      });
      if (!res.ok) throw new Error(`Create Gist failed: ${res.status}`);
      return await res.json();
    }

    // 更新 Gist
    async function updateGist(token, gistId, data) {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: { [GIST_FILENAME]: { content: JSON.stringify(data) } }
        })
      });
      if (!res.ok) throw new Error(`Update Gist failed: ${res.status}`);
      return await res.json();
    }

    // 读取 Gist
    async function readGist(token, gistId) {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (!res.ok) throw new Error(`Read Gist failed: ${res.status}`);
      const gist = await res.json();
      const content = gist.files[GIST_FILENAME]?.content;
      if (!content) throw new Error('No data found in Gist');
      return JSON.parse(content);
    }

    // 推送
    document.getElementById('btn-sync-push')?.addEventListener('click', async () => {
      const token = getToken();
      if (!token) return;
      try {
        showSyncStatus('⏳', I18n.t('toast.pushing'));
        const data = await DB.exportData();
        data.syncTime = new Date().toISOString();

        const existing = await findGist(token);
        if (existing) {
          await updateGist(token, existing.id, data);
        } else {
          await createGist(token, data);
        }
        showSyncStatus('✅', `${I18n.t('toast.push_ok')} · ${new Date().toLocaleTimeString()}`);
        showToast(I18n.t('toast.push_cloud_ok'));
      } catch (e) {
        showSyncStatus('❌', `${I18n.t('toast.push_fail')}: ${e.message}`);
        showToast('❌ ' + I18n.t('toast.push_fail') + ': ' + e.message, 'error');
      }
      hideSyncStatus();
    });

    // 拉取
    document.getElementById('btn-sync-pull')?.addEventListener('click', async () => {
      const token = getToken();
      if (!token) return;
      try {
        showSyncStatus('⏳', I18n.t('toast.pulling'));
        const existing = await findGist(token);
        if (!existing) {
          showSyncStatus('⚠️', I18n.t('toast.no_cloud_data'));
          showToast(I18n.t('toast.pull_no_data'), 'error');
          hideSyncStatus();
          return;
        }
        const data = await readGist(token, existing.id);
        if (confirm(I18n.t('toast.pull_confirm'))) {
          await DB.clearAllData();
          await DB.importData(data);
          Tasks.renderTasks();
          Stats.refresh();
          showSyncStatus('✅', `${I18n.t('toast.pull_ok')} · ${new Date().toLocaleTimeString()}`);
          showToast(I18n.t('toast.pull_cloud_ok'));
        } else {
          showSyncStatus('ℹ️', I18n.t('toast.pull_cancelled'));
        }
      } catch (e) {
        showSyncStatus('❌', `${I18n.t('toast.pull_fail')}: ${e.message}`);
        showToast('❌ ' + I18n.t('toast.pull_fail') + ': ' + e.message, 'error');
      }
      hideSyncStatus();
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
            showToast(I18n.t('toast.timer_reset'));
          }
          break;
        case 'Digit1': navigateTo('timer'); break;
        case 'Digit2': navigateTo('stats'); break;
        case 'Digit3': navigateTo('settings'); break;
      }
    });
  }

  // 离开保护：专注中离开时提示
  function setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
      const timerState = Timer.getState();
      if (timerState.status === 'running' || timerState.status === 'paused') {
        e.preventDefault();
        e.returnValue = I18n.t('beforeunload');
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

  // 语言切换器
  function setupLanguageSwitcher() {
    const select = document.getElementById('setting-language');
    if (!select) return;
    select.value = I18n.getLang();
    select.addEventListener('change', () => {
      I18n.setLang(select.value);
    });
  }

  // 首次使用引导
  function showOnboarding() {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = I18n.t('onboard.title');
    body.innerHTML = `
      <div style="text-align:center; line-height:1.8; color:var(--text-secondary);">
        <p style="font-size:1.1rem; color:var(--text-primary); margin-bottom:12px;">
          ${I18n.t('onboard.subtitle')}
        </p>
        <div style="text-align:left; max-width:280px; margin:0 auto; font-size:0.9rem;">
          <p>${I18n.t('onboard.feature_timer')}</p>
          <p>${I18n.t('onboard.feature_tasks')}</p>
          <p>${I18n.t('onboard.feature_ambient')}</p>
          <p>${I18n.t('onboard.feature_stats')}</p>
        </div>
        <p style="margin-top:16px; font-size:0.82rem; color:var(--text-muted);">
          ${I18n.t('onboard.shortcuts')}
        </p>
      </div>
    `;
    footer.innerHTML = `
      <button class="modal-btn primary" onclick="
        localStorage.setItem('ff_onboarded', '1');
        document.getElementById('modal-overlay').style.display='none';
      ">${I18n.t('onboard.start')}</button>
    `;
    overlay.style.display = 'flex';
  }

  return { init, navigateTo };
})();

document.addEventListener('DOMContentLoaded', () => App.init());