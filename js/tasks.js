/**
 * Frutiger Focus v1.3.5 - 任务模块
 * FAB添加、分组显示、可折叠已完成区
 */

const Tasks = (() => {
  let doneCollapsed = false;
  let els = {};

  function cacheElements() {
    els = {
      input: document.getElementById('task-input'),
      addBtn: document.getElementById('btn-add-task'),
      fab: document.getElementById('fab-add-task'),
      pcAddBtn: document.getElementById('pc-add-task-btn'),
      overlay: document.getElementById('task-add-overlay'),
      closeBtn: document.getElementById('task-add-close'),
      listActive: document.getElementById('task-list-active'),
      listDone: document.getElementById('task-list-done'),
      emptyActive: document.getElementById('tasks-empty-active'),
      activeCount: document.getElementById('active-count'),
      doneCount: document.getElementById('done-count'),
      doneToggle: document.getElementById('done-toggle'),
      doneArrow: document.getElementById('done-arrow')
    };
  }

  function init() {
    cacheElements();
    setupEventListeners();
    renderTasks();
  }

  function setupEventListeners() {
    // FAB 打开添加浮层（手机端）
    els.fab.addEventListener('click', openAddSheet);
    // PC端添加按钮
    els.pcAddBtn.addEventListener('click', openAddSheet);
    els.closeBtn.addEventListener('click', closeAddSheet);
    els.overlay.addEventListener('click', (e) => {
      if (e.target === els.overlay) closeAddSheet();
    });

    // 添加任务
    els.addBtn.addEventListener('click', addTask);
    els.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTask();
    });

    // 已完成折叠
    els.doneToggle.addEventListener('click', () => {
      doneCollapsed = !doneCollapsed;
      els.listDone.style.display = doneCollapsed ? 'none' : 'flex';
      els.doneArrow.classList.toggle('collapsed', doneCollapsed);
    });
  }

  function openAddSheet() {
    els.overlay.style.display = 'flex';
    els.input.value = '';
    setTimeout(() => els.input.focus(), 100);
  }

  function closeAddSheet() {
    els.overlay.style.display = 'none';
  }

  async function addTask() {
    const name = els.input.value.trim();
    if (!name) return;

    const task = {
      id: DB.generateId(),
      name: name,
      completed: false,
      date: DB.getToday(),
      createdAt: new Date().toISOString(),
      focusTime: 0
    };

    try {
      await DB.addTask(task);
      closeAddSheet();
      renderTasks();
      showToast(I18n.t('toast.task_added'));
    } catch (e) {
      console.error('添加任务失败:', e);
      showToast(I18n.t('toast.task_add_failed'), 'error');
    }
  }

  async function toggleTask(id) {
    try {
      const task = await DB.getTask(id);
      if (!task) return;
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      await DB.updateTask(task);
      renderTasks();

      if (task.completed) {
        showToast(I18n.t('toast.task_done'));
        document.dispatchEvent(new CustomEvent('taskCompleted', { detail: task }));
      }
    } catch (e) {
      console.error('更新任务失败:', e);
    }
  }

  async function deleteTask(id) {
    try {
      await DB.deleteTask(id);
      renderTasks();
      showToast(I18n.t('toast.task_deleted'));
    } catch (e) {
      console.error('删除任务失败:', e);
    }
  }

  async function focusOnTask(id) {
    try {
      const task = await DB.getTask(id);
      if (!task || task.completed) return;
      Timer.setCurrentTask(task.id, task.name);
      // 任务已在 Timer 页面内，无需跳转，直接关联即可
      showToast(I18n.t('toast.focus_on', task.name));
    } catch (e) {
      console.error('关联任务失败:', e);
    }
  }

  async function renderTasks() {
    try {
      const today = DB.getToday();
      const allTasks = await DB.getAllTasks();

      // 所有未完成的任务（不限日期）
      const allActive = allTasks
        .filter(t => !t.completed)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // 分为今天的和过去遗留的
      const todayActive = allActive.filter(t => t.date === today);
      const pastActive = allActive.filter(t => t.date !== today);

      // 已完成只显示今天的
      const doneTasks = allTasks
        .filter(t => t.completed && t.date === today)
        .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));

      // 更新计数
      const totalActive = todayActive.length + pastActive.length;
      els.activeCount.textContent = totalActive;
      els.doneCount.textContent = doneTasks.length;

      // 渲染进行中
      els.listActive.innerHTML = '';
      if (totalActive === 0) {
        els.emptyActive.style.display = 'block';
      } else {
        els.emptyActive.style.display = 'none';

        // 今天的任务
        todayActive.forEach(task => {
          els.listActive.appendChild(createTaskItem(task));
        });

        // 过去遗留的任务（带日期标签）
        if (pastActive.length > 0) {
          const divider = document.createElement('li');
          divider.className = 'task-date-divider';
          divider.innerHTML = `<span>${I18n.t('tasks.past_incomplete')}</span>`;
          els.listActive.appendChild(divider);

          pastActive.forEach(task => {
            els.listActive.appendChild(createTaskItem(task, true));
          });
        }
      }

      // 渲染已完成
      els.listDone.innerHTML = '';
      doneTasks.forEach(task => {
        els.listDone.appendChild(createTaskItem(task));
      });

    } catch (e) {
      console.error('渲染任务失败:', e);
    }
  }

  function createTaskItem(task, showDate = false) {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}`;
    li.dataset.id = task.id;

    const dateLabel = showDate && task.date
      ? `<span class="task-date-label">${formatDate(task.date)}</span>`
      : '';

    li.innerHTML = `
      <button class="task-checkbox${task.completed ? ' checked' : ''}"
              onclick="Tasks.toggleTask('${task.id}')"
              title="${task.completed ? I18n.t('tasks.mark_undone') : I18n.t('tasks.mark_done')}">
        ${task.completed ? '✓' : ''}
      </button>
      <div class="task-info">
        <span class="task-name">${escapeHtml(task.name)}</span>
        ${dateLabel}
      </div>
      <div class="task-actions">
        ${!task.completed ? `
          <button class="task-action-btn focus-btn"
                  onclick="Tasks.focusOnTask('${task.id}')"
                  title="${I18n.t('tasks.focus_on')}">🎯</button>
        ` : ''}
        <button class="task-action-btn"
                onclick="Tasks.deleteTask('${task.id}')"
                title="${I18n.t('tasks.delete')}">🗑️</button>
      </div>
    `;
    return li;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const now = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diff === 1) return I18n.t('tasks.yesterday');
    if (diff === 2) return I18n.t('tasks.day_before');
    return `${month}/${day}`;
  }

  async function getTodayTasks() {
    return DB.getTasksByDate(DB.getToday());
  }

  async function getTodayCompletedCount() {
    const tasks = await getTodayTasks();
    return tasks.filter(t => t.completed).length;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init, addTask, toggleTask, deleteTask, focusOnTask,
    renderTasks, getTodayTasks, getTodayCompletedCount
  };
})();