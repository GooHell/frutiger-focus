/**
 * Frutiger Focus v1.2 - 计时器模块
 * 独立循环制：专注 → 休息 → 完成(+1) → 下一轮
 */

const Timer = (() => {
  // ===== 状态 =====
  let state = {
    mode: 'pomodoro',     // pomodoro | custom
    phase: 'focus',       // focus | rest
    status: 'idle',       // idle | running | paused
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    intervalId: null,
    currentTaskId: null,
    sessionStartTime: null
  };

  // 设置
  let settings = {
    focusMinutes: 25,
    restMinutes: 5,
    customMinutes: 30,
    soundEnabled: true
  };

  // DOM 缓存
  let els = {};

  function cacheElements() {
    els = {
      time: document.getElementById('timer-time'),
      label: document.getElementById('timer-label'),
      progress: document.getElementById('timer-progress'),
      roundCount: document.getElementById('round-count'),
      controlsIdle: document.getElementById('controls-idle'),
      controlsActive: document.getElementById('controls-active'),
      btnStart: document.getElementById('btn-start'),
      btnPause: document.getElementById('btn-pause'),
      btnReset: document.getElementById('btn-reset'),
      btnSkip: document.getElementById('btn-skip'),
      pauseIcon: document.getElementById('pause-icon'),
      customArea: document.getElementById('custom-input-area'),
      customMinutes: document.getElementById('custom-minutes'),
      currentTask: document.getElementById('current-task'),
      currentTaskName: document.getElementById('current-task-name')
    };
  }

  // ===== 初始化 =====

  function init(userSettings) {
    cacheElements();
    if (userSettings) Object.assign(settings, userSettings);
    setupEventListeners();

    if (!restoreTimerState()) {
      resetTimer();
    }
    updateRoundCounter();
  }

  // ===== 持久化 =====

  function saveTimerState() {
    const data = {
      mode: state.mode,
      phase: state.phase,
      status: state.status,
      totalSeconds: state.totalSeconds,
      remainingSeconds: state.remainingSeconds,
      currentTaskId: state.currentTaskId,
      sessionStartTime: state.sessionStartTime,
      expectedEndTime: state.status === 'running'
        ? Date.now() + state.remainingSeconds * 1000 : null,
      savedAt: Date.now()
    };
    localStorage.setItem('fm_timerState', JSON.stringify(data));
  }

  function clearTimerState() {
    localStorage.removeItem('fm_timerState');
  }

  function restoreTimerState() {
    try {
      const saved = localStorage.getItem('fm_timerState');
      if (!saved) return false;

      const data = JSON.parse(saved);
      if (Date.now() - data.savedAt > 4 * 60 * 60 * 1000) {
        clearTimerState();
        return false;
      }

      state.mode = data.mode;
      state.phase = data.phase;
      state.totalSeconds = data.totalSeconds;
      state.currentTaskId = data.currentTaskId;
      state.sessionStartTime = data.sessionStartTime;

      // 恢复模式 UI
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      const modeTab = document.querySelector(`[data-mode="${data.mode}"]`);
      if (modeTab) modeTab.classList.add('active');
      if (data.mode === 'custom') {
        els.customArea.style.display = 'block';
      }

      if (data.status === 'running' && data.expectedEndTime) {
        const remaining = Math.floor((data.expectedEndTime - Date.now()) / 1000);
        if (remaining <= 0) {
          state.remainingSeconds = 0;
          state.status = 'idle';
          clearTimerState();
          onTimerComplete();
          return true;
        }
        state.remainingSeconds = remaining;
        updateDisplay();
        startTimer();
        showToast(I18n.t('toast.timer_restored'));
        return true;
      } else if (data.status === 'paused') {
        state.remainingSeconds = data.remainingSeconds;
        state.status = 'paused';
        showActiveControls();
        els.pauseIcon.textContent = '▶';
        els.label.textContent = I18n.t('timer.paused');
        updateDisplay();
        showToast(I18n.t('toast.timer_restored_paused'));
        return true;
      }

      clearTimerState();
      return false;
    } catch (e) {
      console.warn('恢复计时器状态失败:', e);
      clearTimerState();
      return false;
    }
  }

  // ===== 事件 =====

  function setupEventListeners() {
    els.btnStart.addEventListener('click', startTimer);
    els.btnPause.addEventListener('click', togglePause);
    els.btnReset.addEventListener('click', resetTimer);
    els.btnSkip.addEventListener('click', skipPhase);

    // 模式切换
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (state.status === 'running' || state.status === 'paused') {
          showToast(I18n.t('toast.mode_locked'), 'error');
          return;
        }
        setMode(tab.dataset.mode);
      });
    });

    // 自定义时长
    document.getElementById('time-minus').addEventListener('click', () => {
      const val = Math.max(1, parseInt(els.customMinutes.value) - 5);
      els.customMinutes.value = val;
      settings.customMinutes = val;
      if (state.status === 'idle') resetTimer();
    });
    document.getElementById('time-plus').addEventListener('click', () => {
      const val = Math.min(180, parseInt(els.customMinutes.value) + 5);
      els.customMinutes.value = val;
      settings.customMinutes = val;
      if (state.status === 'idle') resetTimer();
    });
    els.customMinutes.addEventListener('change', () => {
      const val = Math.max(1, Math.min(180, parseInt(els.customMinutes.value) || 30));
      els.customMinutes.value = val;
      settings.customMinutes = val;
      if (state.status === 'idle') resetTimer();
    });

    // 取消关联任务
    document.getElementById('clear-current-task').addEventListener('click', () => {
      setCurrentTask(null, null);
    });

    // 页面可见性：校正计时
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && state.status === 'running') {
        try {
          const saved = JSON.parse(localStorage.getItem('fm_timerState') || '{}');
          if (saved.expectedEndTime) {
            const remaining = Math.max(0, Math.floor((saved.expectedEndTime - Date.now()) / 1000));
            if (remaining <= 0) {
              onTimerComplete();
            } else {
              state.remainingSeconds = remaining;
              updateDisplay();
            }
          }
        } catch (e) { /* ignore */ }
      }
    });
  }

  // ===== 模式切换 =====

  function setMode(mode) {
    state.mode = mode;
    state.phase = 'focus';

    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    els.customArea.style.display = mode === 'custom' ? 'block' : 'none';
    resetTimer();
  }

  // ===== 计时核心 =====

  function startTimer() {
    if (state.status === 'idle') {
      state.sessionStartTime = Date.now();
    }

    state.status = 'running';
    showActiveControls();
    els.pauseIcon.textContent = '⏸';
    els.label.textContent = state.phase === 'focus' ? I18n.t('timer.focusing') : I18n.t('timer.resting');
    saveTimerState();

    state.intervalId = setInterval(() => {
      state.remainingSeconds--;

      if (state.remainingSeconds <= 0) {
        onTimerComplete();
        return;
      }

      updateDisplay();
      if (state.remainingSeconds % 10 === 0) saveTimerState();
    }, 1000);
  }

  function togglePause() {
    if (state.status === 'running') {
      state.status = 'paused';
      clearInterval(state.intervalId);
      els.pauseIcon.textContent = '▶';
      els.label.textContent = I18n.t('timer.paused');
      saveTimerState();
    } else if (state.status === 'paused') {
      startTimer();
    }
  }

  function resetTimer() {
    clearInterval(state.intervalId);

    // 重置时不记录任何数据（重置 = 放弃）
    state.status = 'idle';
    state.phase = 'focus';
    state.sessionStartTime = null;
    clearTimerState();

    const minutes = state.mode === 'custom' ? settings.customMinutes : settings.focusMinutes;
    state.totalSeconds = minutes * 60;
    state.remainingSeconds = state.totalSeconds;

    showIdleControls();
    updateDisplay();
    els.label.textContent = I18n.t('timer.ready');

    // 重置开始按钮文案
    const startLabel = els.btnStart.querySelector('label');
    if (startLabel) startLabel.textContent = I18n.t('timer.start_focus');
  }

  // ===== 跳过 =====

  function skipPhase() {
    if (state.phase === 'focus') {
      // 跳过专注 → 记录为"不完全专注"
      skipAndSaveIncomplete();
    } else {
      // 跳过休息 → 直接结束，进入 idle
      clearInterval(state.intervalId);
      clearTimerState();
      enterIdleForNextRound();
      showToast(I18n.t('toast.skipped_rest'));
    }
  }

  async function skipAndSaveIncomplete() {
    clearInterval(state.intervalId);
    clearTimerState();

    // 计算实际专注时长
    const actualMinutes = state.sessionStartTime
      ? Math.round((Date.now() - state.sessionStartTime) / 1000 / 60)
      : 0;

    if (actualMinutes >= 1) {
      // 保存为"不完全专注"
      await saveSession(true);
      showToast(I18n.t('toast.incomplete_focus', actualMinutes));
    } else {
      showToast(I18n.t('toast.skip_too_short'));
    }

    // 自动进入休息
    if (settings.soundEnabled) playNotificationSound();
    enterRestPhase();
  }

  // ===== 计时完成 =====

  async function onTimerComplete() {
    clearInterval(state.intervalId);
    state.remainingSeconds = 0;
    clearTimerState();
    updateDisplay();

    if (settings.soundEnabled) playNotificationSound();

    if (state.phase === 'focus') {
      // 专注完成 → 保存记录
      await saveSession(false);

      if (state.mode === 'custom') {
        // 自定义模式：不自动休息，直接回 idle
        showToast(I18n.t('toast.focus_complete'));
        enterIdleForNextRound();
      } else {
        // 番茄钟模式：自动进入休息
        showToast(I18n.t('toast.focus_complete_rest'));
        enterRestPhase();
      }
    } else {
      // 休息完成 → 回到 idle，等待用户手动开始下一轮
      showToast(I18n.t('toast.rest_complete'));
      enterIdleForNextRound();
    }

    // 更新计数器
    updateRoundCounter();

    // 触发事件
    document.dispatchEvent(new CustomEvent('timerComplete', {
      detail: { phase: state.phase }
    }));
  }

  // ===== 阶段过渡 =====

  function enterRestPhase() {
    state.phase = 'rest';
    state.sessionStartTime = null;
    state.totalSeconds = settings.restMinutes * 60;
    state.remainingSeconds = state.totalSeconds;
    state.status = 'idle';

    // 休息阶段视觉区分
    document.getElementById('round-counter')?.classList.add('rest-phase');

    showIdleControls();
    updateDisplay();
    els.label.textContent = I18n.t('timer.rest_time');
    const restLabel = els.btnStart.querySelector('label');
    if (restLabel) restLabel.textContent = I18n.t('timer.start_rest');

    // 添加"跳过休息"链接
    const skipLink = document.createElement('button');
    skipLink.className = 'skip-rest-link';
    skipLink.textContent = I18n.t('timer.skip_rest');
    skipLink.onclick = () => {
      skipLink.remove();
      enterIdleForNextRound();
      showToast(I18n.t('toast.skipped_rest'));
    };
    els.controlsIdle.appendChild(skipLink);

    // 自动开始休息计时
    setTimeout(() => {
      if (state.status === 'idle' && state.phase === 'rest') {
        startTimer();
        skipLink.remove(); // 开始后移除跳过链接
      }
    }, 2000); // 给用户2秒时间决定是否跳过
  }

  function enterIdleForNextRound() {
    state.phase = 'focus';
    state.status = 'idle';
    state.sessionStartTime = null;
    document.getElementById('round-counter')?.classList.remove('rest-phase');
    // 清理可能残留的跳过按钮
    document.querySelector('.skip-rest-link')?.remove();

    const minutes = state.mode === 'custom' ? settings.customMinutes : settings.focusMinutes;
    state.totalSeconds = minutes * 60;
    state.remainingSeconds = state.totalSeconds;

    showIdleControls();
    updateDisplay();
    els.label.textContent = I18n.t('timer.next_round');
    const nextLabel = els.btnStart.querySelector('label');
    if (nextLabel) nextLabel.textContent = I18n.t('timer.start_next');
  }

  // ===== 保存专注记录 =====

  async function saveSession(incomplete = false) {
    if (!state.sessionStartTime) return;

    const duration = Math.round((Date.now() - state.sessionStartTime) / 1000 / 60);
    if (duration < 1) return;

    const session = {
      id: DB.generateId(),
      date: DB.getToday(),
      startTime: new Date(state.sessionStartTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: duration,
      mode: state.mode,
      taskId: state.currentTaskId,
      completed: !incomplete,
      incomplete: incomplete
    };

    try {
      await DB.addSession(session);
      document.dispatchEvent(new CustomEvent('sessionSaved', { detail: session }));
    } catch (e) {
      console.error('保存专注记录失败:', e);
    }
  }

  // ===== 今日计数器 =====

  async function updateRoundCounter() {
    try {
      const today = DB.getToday();
      const sessions = await DB.getSessionsByDate(today);
      const completedCount = sessions.filter(s => !s.incomplete).length;
      const incompleteCount = sessions.filter(s => s.incomplete).length;

      let text = `×${completedCount}`;
      if (incompleteCount > 0) {
        text += ` (+${incompleteCount}⚠️)`;
      }
      if (els.roundCount) {
        els.roundCount.textContent = text;
        // 弹跳动画
        const counter = document.getElementById('round-counter');
        if (counter) {
          counter.classList.remove('pop-anim');
          void counter.offsetWidth; // 强制回流触发动画重播
          counter.classList.add('pop-anim');
        }
      }
    } catch (e) { /* ignore */ }
  }

  // ===== UI 辅助 =====

  function showIdleControls() {
    els.controlsIdle.style.display = 'flex';
    els.controlsActive.style.display = 'none';
  }

  function showActiveControls() {
    els.controlsIdle.style.display = 'none';
    els.controlsActive.style.display = 'flex';
  }

  function updateDisplay() {
    const mins = Math.floor(state.remainingSeconds / 60);
    const secs = state.remainingSeconds % 60;
    els.time.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // 圆环进度
    const circumference = 2 * Math.PI * 90;
    const progress = state.totalSeconds > 0
      ? (state.totalSeconds - state.remainingSeconds) / state.totalSeconds : 0;
    els.progress.style.strokeDashoffset = circumference * (1 - progress);

    // SVG 渐变颜色：专注蓝绿 / 休息绿
    const stops = document.querySelectorAll('#aero-gradient stop');
    if (stops.length >= 3) {
      if (state.phase === 'rest') {
        stops[0].style.stopColor = '#00b894';
        stops[1].style.stopColor = '#55efc4';
        stops[2].style.stopColor = '#a8e6cf';
      } else {
        stops[0].style.stopColor = '#00b4d8';
        stops[1].style.stopColor = '#00cec9';
        stops[2].style.stopColor = '#55efc4';
      }
    }

    // 页面标题
    document.title = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} - Frutiger Focus`;
  }

  // ===== 关联任务 =====

  function setCurrentTask(taskId, taskName) {
    state.currentTaskId = taskId;
    if (taskId && taskName) {
      els.currentTask.style.display = 'flex';
      els.currentTaskName.textContent = taskName;
    } else {
      els.currentTask.style.display = 'none';
      els.currentTaskName.textContent = '';
    }
  }

  // ===== 提示音 =====
  let sharedAudioCtx = null;

  function playNotificationSound() {
    try {
      if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = sharedAudioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const frequencies = [523.25, 659.25, 783.99];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.5);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.5);
      });
    } catch (e) {
      console.warn('提示音播放失败:', e);
    }
  }

  // ===== Toast =====
  function showToast(msg, type = 'success') {
    document.dispatchEvent(new CustomEvent('showToast', {
      detail: { message: msg, type: type }
    }));
  }

  // ===== 公共 API =====
  return {
    init,
    getState: () => ({ ...state }),
    startTimer,
    togglePause,
    resetTimer,
    setCurrentTask,
    updateSettings: (s) => Object.assign(settings, s),
    updateRoundCounter
  };
})();