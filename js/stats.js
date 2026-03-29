/**
 * Frutiger Focus v1.3.5 - 统计模块
 * 热力图 · 累计指标 · Chart.js趋势图(Aero风格) · 时段分布 · 连续打卡
 */

const Stats = (() => {
  // ===== 状态 =====
  let weekOffset = 0;
  let monthOffset = 0;       // 趋势折线图的月份偏移
  let heatmapYear, heatmapMonth; // 热力图当前年月
  let weekBarChart = null;   // Chart.js 实例
  let monthLineChart = null;
  let hoursPolarChart = null;
  let els = {};

  // ===== 初始化 =====
  function cacheElements() {
    els = {
      // 今日概览（专注页内）
      todayTime: document.getElementById('stat-today-time'),
      todaySessions: document.getElementById('stat-today-sessions'),
      todayTasks: document.getElementById('stat-today-tasks'),
      // 旧版专注页侧边栏图表 (保留兼容)
      oldChart: document.getElementById('stats-chart'),
      oldWeekLabel: document.getElementById('chart-week-label'),
      oldWeekTotal: document.getElementById('stat-week-total'),
      oldPrevBtn: document.getElementById('chart-prev'),
      oldNextBtn: document.getElementById('chart-next'),
      // 累计指标
      metricSessions: document.getElementById('metric-total-sessions'),
      metricTime: document.getElementById('metric-total-time'),
      metricStreak: document.getElementById('metric-streak'),
      metricStreakBadge: document.getElementById('metric-streak-badge'),
      metricDailyAvg: document.getElementById('metric-daily-avg'),
      // 热力图
      heatmapGrid: document.getElementById('heatmap-grid'),
      heatmapLabel: document.getElementById('heatmap-month-label'),
      heatmapPrev: document.getElementById('heatmap-prev'),
      heatmapNext: document.getElementById('heatmap-next'),
      heatmapDetail: document.getElementById('heatmap-detail'),
      detailDate: document.getElementById('detail-date'),
      detailStats: document.getElementById('detail-stats'),
      // 子标签
      statsTabs: document.querySelectorAll('.stats-tab'),
      statsPanes: document.querySelectorAll('.stats-pane'),
      // 趋势图表
      weekChartCanvas: document.getElementById('week-bar-chart'),
      weekChartLabel: document.getElementById('week-chart-label'),
      weekChartTotal: document.getElementById('week-chart-total'),
      weekChartPrev: document.getElementById('week-chart-prev'),
      weekChartNext: document.getElementById('week-chart-next'),
      monthChartCanvas: document.getElementById('month-line-chart'),
      monthChartLabel: document.getElementById('month-chart-label'),
      monthChartPrev: document.getElementById('month-chart-prev'),
      monthChartNext: document.getElementById('month-chart-next'),
      // 时段
      hoursChartCanvas: document.getElementById('hours-polar-chart'),
      hoursHint: document.getElementById('hours-hint')
    };
  }

  function init() {
    cacheElements();
    const now = new Date();
    heatmapYear = now.getFullYear();
    heatmapMonth = now.getMonth(); // 0-indexed

    setupEventListeners();
    setupChartDefaults();
    refresh();
  }

  function setupEventListeners() {
    // 旧版侧边栏周图表导航
    if (els.oldPrevBtn) {
      els.oldPrevBtn.addEventListener('click', () => { weekOffset--; renderOldWeekChart(); });
    }
    if (els.oldNextBtn) {
      els.oldNextBtn.addEventListener('click', () => { if (weekOffset >= 0) return; weekOffset++; renderOldWeekChart(); });
    }

    // 子标签切换
    els.statsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.statsTab;
        els.statsTabs.forEach(t => t.classList.remove('active'));
        els.statsPanes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = document.getElementById(`pane-${target}`);
        if (pane) pane.classList.add('active');
        // 切换到趋势时刷新图表（Chart.js 需要可见时渲染）
        if (target === 'trends') { renderWeekBarChart(); renderMonthLineChart(); }
        if (target === 'hours') renderHoursChart();
      });
    });

    // 热力图导航
    if (els.heatmapPrev) els.heatmapPrev.addEventListener('click', () => { changeHeatmapMonth(-1); });
    if (els.heatmapNext) els.heatmapNext.addEventListener('click', () => { changeHeatmapMonth(1); });

    // 趋势图表导航
    if (els.weekChartPrev) els.weekChartPrev.addEventListener('click', () => { weekOffset--; renderWeekBarChart(); });
    if (els.weekChartNext) els.weekChartNext.addEventListener('click', () => { if (weekOffset >= 0) return; weekOffset++; renderWeekBarChart(); });
    if (els.monthChartPrev) els.monthChartPrev.addEventListener('click', () => { monthOffset--; renderMonthLineChart(); });
    if (els.monthChartNext) els.monthChartNext.addEventListener('click', () => { if (monthOffset >= 0) return; monthOffset++; renderMonthLineChart(); });

    // 监听事件
    document.addEventListener('sessionSaved', () => refresh());
    document.addEventListener('taskCompleted', () => refreshTodayStats());
  }

  // ===== Chart.js Aero 全局配置 =====
  function setupChartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Nunito', 'Segoe UI', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = getTextMuted();
    Chart.defaults.animation.duration = 800;
    Chart.defaults.animation.easing = 'easeOutQuart';
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10, 28, 60, 0.85)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(80, 200, 255, 0.3)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 12;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 13 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.tooltip.displayColors = false;
  }

  function getTextMuted() {
    return getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#7a9ab0';
  }

  function getAccent() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00cec9';
  }

  function getAccentLight() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent-light').trim() || '#55efc4';
  }

  function getGridColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(60,140,200,0.15)';
  }

  // ===== 刷新所有 =====
  async function refresh() {
    await refreshTodayStats();
    await refreshMetrics();
    await renderHeatmap();
    await renderOldWeekChart(); // 专注页侧边栏旧图表
    // 如果当前子标签正在显示，才渲染 Chart.js
    const activePane = document.querySelector('.stats-pane.active');
    if (activePane) {
      if (activePane.id === 'pane-trends') { renderWeekBarChart(); renderMonthLineChart(); }
      if (activePane.id === 'pane-hours') renderHoursChart();
    }
  }

  // ===== 今日统计 (专注页概览条) =====
  async function refreshTodayStats() {
    try {
      const today = DB.getToday();
      const sessions = await DB.getSessionsByDate(today);
      const tasks = await DB.getTasksByDate(today);
      const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const completeSessions = sessions.filter(s => !s.incomplete).length;
      const incompleteSessions = sessions.filter(s => s.incomplete).length;
      const completedTasks = tasks.filter(t => t.completed).length;
      if (els.todayTime) els.todayTime.textContent = totalMinutes;
      if (els.todaySessions) {
        els.todaySessions.textContent = incompleteSessions > 0
          ? `${completeSessions}+${incompleteSessions}`
          : completeSessions;
      }
      if (els.todayTasks) els.todayTasks.textContent = completedTasks;
    } catch (e) {
      console.error('刷新今日统计失败:', e);
    }
  }

  // ===== 累计指标面板 =====
  async function refreshMetrics() {
    try {
      const allSessions = await DB.getAllSessions();
      if (!els.metricSessions) return;

      // 总专注次数（只计完整的）
      const completeSessions = allSessions.filter(s => !s.incomplete);
      els.metricSessions.textContent = completeSessions.length;

      // 总时长
      const totalMinutes = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      if (totalMinutes >= 60) {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        els.metricTime.textContent = m > 0 ? `${h}h${m}m` : `${h}h`;
      } else {
        els.metricTime.textContent = `${totalMinutes}m`;
      }

      // 连续打卡 & 日均
      const dateSet = new Set();
      allSessions.forEach(s => { if (s.date) dateSet.add(s.date); });
      const sortedDates = [...dateSet].sort();

      // 日均时长（有记录的天数为基准）
      const activeDays = sortedDates.length || 1;
      const avgMin = Math.round(totalMinutes / activeDays);
      if (avgMin >= 60) {
        const h = Math.floor(avgMin / 60);
        const m = avgMin % 60;
        els.metricDailyAvg.textContent = m > 0 ? `${h}h${m}m` : `${h}h`;
      } else {
        els.metricDailyAvg.textContent = `${avgMin}m`;
      }

      // 连续打卡天数
      const { current, longest } = calcStreak(sortedDates);
      els.metricStreak.textContent = current;
      if (current > 0 && current >= longest) {
        els.metricStreakBadge.style.display = '';
      } else {
        els.metricStreakBadge.style.display = 'none';
      }
    } catch (e) {
      console.error('刷新累计指标失败:', e);
    }
  }

  // 计算连续打卡
  function calcStreak(sortedDates) {
    if (sortedDates.length === 0) return { current: 0, longest: 0 };

    const today = DB.getToday();
    let current = 0;
    let longest = 0;
    let streak = 1;

    // 从最新日期向前回溯
    for (let i = sortedDates.length - 1; i > 0; i--) {
      const diff = dayDiff(sortedDates[i - 1], sortedDates[i]);
      if (diff === 1) {
        streak++;
      } else {
        if (i === sortedDates.length - streak) {
          // 这是最近的连续段
        }
        longest = Math.max(longest, streak);
        streak = 1;
      }
    }
    longest = Math.max(longest, streak);

    // 计算当前连续天数（必须包含今天或昨天）
    current = 0;
    const todayDate = new Date(today);
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const d = sortedDates[i];
      const diff = dayDiff(d, today);
      if (i === sortedDates.length - 1) {
        // 最新记录必须是今天或昨天
        if (diff > 1) { current = 0; break; }
        current = 1;
      } else {
        const prevDiff = dayDiff(sortedDates[i], sortedDates[i + 1]);
        if (prevDiff === 1) {
          current++;
        } else {
          break;
        }
      }
    }

    return { current, longest };
  }

  function dayDiff(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  // ===== 热力图 =====
  function changeHeatmapMonth(delta) {
    heatmapMonth += delta;
    if (heatmapMonth < 0) { heatmapMonth = 11; heatmapYear--; }
    if (heatmapMonth > 11) { heatmapMonth = 0; heatmapYear++; }
    // 不允许超过当前月
    const now = new Date();
    if (heatmapYear > now.getFullYear() || (heatmapYear === now.getFullYear() && heatmapMonth > now.getMonth())) {
      heatmapMonth = now.getMonth();
      heatmapYear = now.getFullYear();
      return;
    }
    renderHeatmap();
  }

  async function renderHeatmap() {
    if (!els.heatmapGrid) return;
    const year = heatmapYear;
    const month = heatmapMonth;

    // 更新标题
    // 热力图月份标题
    if (I18n.getLang() === 'en') {
      els.heatmapLabel.textContent = I18n.t('heatmap.month_format').replace('{month}', I18n.getMonthName(month)).replace('{year}', year);
    } else {
      els.heatmapLabel.textContent = `${year}年${month + 1}月`;
    }

    // 隐藏详情
    els.heatmapDetail.style.display = 'none';

    // 获取本月所有数据
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startStr = formatDate(firstDay);
    const endStr = formatDate(lastDay);
    const sessions = await DB.getSessionsByDateRange(startStr, endStr);

    // 按日期汇总
    const dailyMap = {};
    sessions.forEach(s => {
      if (!dailyMap[s.date]) dailyMap[s.date] = { minutes: 0, count: 0, sessions: [] };
      dailyMap[s.date].minutes += (s.duration || 0);
      dailyMap[s.date].count++;
      dailyMap[s.date].sessions.push(s);
    });

    // 计算最大值用于分级
    const values = Object.values(dailyMap).map(d => d.minutes);
    const maxMinutes = Math.max(...values, 1);

    // 渲染格子
    els.heatmapGrid.innerHTML = '';

    // 填充月初前的空格（周一开始）
    let startWeekday = firstDay.getDay(); // 0=周日
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1; // 转为周一=0
    for (let i = 0; i < startWeekday; i++) {
      const empty = document.createElement('div');
      empty.className = 'heatmap-cell empty';
      els.heatmapGrid.appendChild(empty);
    }

    const today = DB.getToday();
    const daysInMonth = lastDay.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dailyMap[dateStr];
      const minutes = data ? data.minutes : 0;
      const level = getHeatLevel(minutes, maxMinutes);

      const cell = document.createElement('div');
      cell.className = `heatmap-cell`;
      cell.dataset.level = level;
      cell.dataset.date = dateStr;
      if (dateStr === today) cell.classList.add('today');

      const dayNum = document.createElement('span');
      dayNum.className = 'heatmap-day';
      dayNum.textContent = d;
      cell.appendChild(dayNum);

      if (minutes > 0) {
        const badge = document.createElement('span');
        badge.className = 'heatmap-minutes';
        badge.textContent = `${minutes}m`;
        cell.appendChild(badge);
      }

      // 点击事件
      cell.addEventListener('click', () => showDayDetail(dateStr, data));
      els.heatmapGrid.appendChild(cell);
    }
  }

  function getHeatLevel(minutes, max) {
    if (minutes === 0) return 0;
    const ratio = minutes / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  function showDayDetail(dateStr, data) {
    els.heatmapDetail.style.display = '';
    const d = new Date(dateStr);
    const weekdayNames = I18n.t('heatmap.weekday_names');
    const wdName = Array.isArray(weekdayNames) ? weekdayNames[d.getDay()] : '';
    if (I18n.getLang() === 'en') {
      els.detailDate.textContent = `${wdName}, ${I18n.getMonthName(d.getMonth())} ${d.getDate()}`;
    } else {
      els.detailDate.textContent = `${d.getMonth() + 1}月${d.getDate()}日 ${wdName}`;
    }

    if (!data || data.count === 0) {
      els.detailStats.innerHTML = `<span class="detail-empty">${I18n.t('heatmap.no_record')}</span>`;
      return;
    }

    const complete = data.sessions.filter(s => !s.incomplete).length;
    const incomplete = data.sessions.filter(s => s.incomplete).length;
    let html = `<div class="detail-row">${I18n.t('heatmap.pomodoro_count', `<strong>${complete}</strong>`)}`;
    if (incomplete > 0) html += ` <span class="detail-dim">${I18n.t('heatmap.incomplete_count', incomplete)}</span>`;
    html += `</div>`;
    html += `<div class="detail-row">${I18n.t('heatmap.duration', `<strong>${data.minutes}</strong>`)}</div>`;

    // 按小时分布小条
    const hourBuckets = new Array(24).fill(0);
    data.sessions.forEach(s => {
      if (s.startTime) {
        const h = new Date(s.startTime).getHours();
        hourBuckets[h] += (s.duration || 0);
      }
    });
    const hasHours = hourBuckets.some(v => v > 0);
    if (hasHours) {
      const maxH = Math.max(...hourBuckets);
      html += '<div class="detail-hours">';
      hourBuckets.forEach((v, i) => {
        if (v > 0) {
          html += `<span class="detail-hour-chip">${i}:00 <strong>${v}m</strong></span>`;
        }
      });
      html += '</div>';
    }
    els.detailStats.innerHTML = html;
  }

  // ===== 专注页侧边栏旧版周图表 (Canvas手绘，保持兼容) =====
  async function renderOldWeekChart() {
    if (!els.oldChart) return;
    try {
      const { startDate, endDate, dates, labels } = getWeekRange(weekOffset);
      if (els.oldWeekLabel) {
        if (weekOffset === 0) els.oldWeekLabel.textContent = I18n.t('sidebar.this_week');
        else if (weekOffset === -1) els.oldWeekLabel.textContent = I18n.t('sidebar.last_week');
        else {
          const start = new Date(startDate);
          els.oldWeekLabel.textContent = `${start.getMonth() + 1}/${start.getDate()}`;
        }
      }
      const sessions = await DB.getSessionsByDateRange(startDate, endDate);
      const dailyData = dates.map(date => {
        return sessions.filter(s => s.date === date).reduce((sum, s) => sum + (s.duration || 0), 0);
      });
      const weekTotal = dailyData.reduce((a, b) => a + b, 0);
      if (els.oldWeekTotal) els.oldWeekTotal.textContent = weekTotal;
      drawOldChart(labels, dailyData, dates);
    } catch (e) { console.error('渲染旧版周图表失败:', e); }
  }

  function drawOldChart(labels, data, dates) {
    const canvas = els.oldChart;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    const padding = { top: 20, bottom: 30, left: 10, right: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    ctx.clearRect(0, 0, w, h);
    const maxVal = Math.max(...data, 30);
    const barWidth = chartW / labels.length * 0.5;
    const gap = chartW / labels.length;
    const style = getComputedStyle(document.documentElement);
    const accentColor = style.getPropertyValue('--accent').trim() || '#00cec9';
    const textColor = style.getPropertyValue('--text-muted').trim() || '#555577';
    const borderColor = style.getPropertyValue('--border').trim() || '#2a2a4a';
    ctx.strokeStyle = borderColor; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + chartH * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
      if (i > 0) {
        ctx.fillStyle = textColor; ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(maxVal * i / 4)}m`, padding.left + 2, y - 3);
      }
    }
    const today = DB.getToday();
    labels.forEach((label, i) => {
      const x = padding.left + gap * i + (gap - barWidth) / 2;
      const barH = maxVal > 0 ? (data[i] / maxVal) * chartH : 0;
      const y = padding.top + chartH - barH;
      const isToday = dates[i] === today;
      ctx.fillStyle = isToday ? accentColor : accentColor + '80';
      ctx.beginPath();
      const radius = 4;
      if (barH > radius * 2) {
        ctx.moveTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius);
        ctx.lineTo(x + barWidth, padding.top + chartH);
        ctx.lineTo(x, padding.top + chartH);
      } else if (barH > 0) { ctx.rect(x, y, barWidth, barH); }
      ctx.fill();
      if (data[i] > 0) {
        ctx.fillStyle = textColor; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${data[i]}`, x + barWidth / 2, y - 5);
      }
      ctx.fillStyle = isToday ? accentColor : textColor;
      ctx.font = isToday ? 'bold 11px sans-serif' : '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barWidth / 2, h - 8);
    });
  }

  // ===== Chart.js 趋势图表 =====

  // -- 周柱状图（Aero 渐变胶囊柱）
  async function renderWeekBarChart() {
    if (!els.weekChartCanvas || typeof Chart === 'undefined') return;
    try {
      const { startDate, endDate, dates, labels } = getWeekRange(weekOffset);
      // 标签
      if (weekOffset === 0) els.weekChartLabel.textContent = I18n.t('chart.this_week');
      else if (weekOffset === -1) els.weekChartLabel.textContent = I18n.t('chart.last_week');
      else {
        const s = new Date(startDate);
        els.weekChartLabel.textContent = I18n.t('chart.week_from', `${s.getMonth() + 1}/${s.getDate()}`);
      }

      const sessions = await DB.getSessionsByDateRange(startDate, endDate);
      const dailyData = dates.map(date =>
        sessions.filter(s => s.date === date).reduce((sum, s) => sum + (s.duration || 0), 0)
      );
      const weekTotal = dailyData.reduce((a, b) => a + b, 0);
      els.weekChartTotal.textContent = weekTotal;

      // 创建渐变
      const ctx = els.weekChartCanvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, getAccent());
      grad.addColorStop(1, getAccentLight());

      const gradHover = ctx.createLinearGradient(0, 0, 0, 300);
      gradHover.addColorStop(0, getAccentLight());
      gradHover.addColorStop(1, getAccent());

      const today = DB.getToday();
      const bgColors = dates.map(d => d === today ? grad : grad);
      const borderColors = dates.map(d => d === today ? getAccent() : 'transparent');

      if (weekBarChart) weekBarChart.destroy();
      weekBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: dailyData,
            backgroundColor: grad,
            hoverBackgroundColor: gradHover,
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: getGridColor(), lineWidth: 0.5 },
              ticks: {
                color: getTextMuted(),
                callback: v => `${v}m`,
                maxTicksLimit: 5
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                color: (ctx) => {
                  const idx = ctx.index;
                  return dates[idx] === today ? getAccent() : getTextMuted();
                },
                font: (ctx) => {
                  const idx = ctx.index;
                  return { weight: dates[idx] === today ? 'bold' : 'normal' };
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                title: (items) => {
                  const idx = items[0].dataIndex;
                  return dates[idx] === today ? labels[idx] + I18n.t('chart.today_suffix') : labels[idx];
                },
                label: (item) => I18n.t('chart.focus_minutes', item.raw)
              }
            }
          }
        }
      });
    } catch (e) { console.error('渲染周柱状图失败:', e); }
  }

  // -- 月趋势折线图（Aero 面积渐变）
  async function renderMonthLineChart() {
    if (!els.monthChartCanvas || typeof Chart === 'undefined') return;
    try {
      const now = new Date();
      const targetMonth = now.getMonth() + monthOffset;
      const targetDate = new Date(now.getFullYear(), targetMonth, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      if (I18n.getLang() === 'en') {
        const prefix = year === now.getFullYear() ? '' : year + ' ';
        els.monthChartLabel.textContent = prefix + I18n.getMonthName(month);
      } else {
        els.monthChartLabel.textContent = `${year === now.getFullYear() ? '' : year + '年'}${month + 1}月`;
      }

      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const sessions = await DB.getSessionsByDateRange(startStr, endStr);

      const labels = [];
      const data = [];
      const daySuffix = I18n.t('chart.day_suffix');
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        labels.push(`${d}${daySuffix}`);
        data.push(sessions.filter(s => s.date === dateStr).reduce((sum, s) => sum + (s.duration || 0), 0));
      }

      const ctx = els.monthChartCanvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 250);
      grad.addColorStop(0, hexToRGBA(getAccent(), 0.4));
      grad.addColorStop(1, hexToRGBA(getAccent(), 0.02));

      if (monthLineChart) monthLineChart.destroy();
      monthLineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data,
            borderColor: getAccent(),
            backgroundColor: grad,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: getAccent(),
            pointHoverBackgroundColor: getAccentLight(),
            pointBorderWidth: 0,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: getGridColor(), lineWidth: 0.5 },
              ticks: { color: getTextMuted(), callback: v => `${v}m`, maxTicksLimit: 5 }
            },
            x: {
              grid: { display: false },
              ticks: {
                color: getTextMuted(),
                maxTicksLimit: 10,
                maxRotation: 0
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: item => I18n.t('chart.focus_minutes', item.raw)
              }
            }
          }
        }
      });
    } catch (e) { console.error('渲染月趋势图失败:', e); }
  }

  // ===== 时段分布（24小时极坐标/雷达图）=====
  async function renderHoursChart() {
    if (!els.hoursChartCanvas || typeof Chart === 'undefined') return;
    try {
      const allSessions = await DB.getAllSessions();
      const hourBuckets = new Array(24).fill(0);
      allSessions.forEach(s => {
        if (s.startTime) {
          const h = new Date(s.startTime).getHours();
          hourBuckets[h] += (s.duration || 0);
        }
      });

      const labels = hourBuckets.map((_, i) => `${i}:00`);
      const hasData = hourBuckets.some(v => v > 0);
      els.hoursHint.textContent = hasData ? '' : I18n.t('hours.no_data');

      const ctx = els.hoursChartCanvas.getContext('2d');

      // 为每个小时生成渐变色
      const bgColors = hourBuckets.map((_, i) => {
        const ratio = i / 24;
        return hexToRGBA(getAccent(), 0.15 + 0.55 * (hourBuckets[i] / (Math.max(...hourBuckets) || 1)));
      });
      const borderColors = hourBuckets.map(() => hexToRGBA(getAccent(), 0.6));

      if (hoursPolarChart) hoursPolarChart.destroy();
      hoursPolarChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
          labels,
          datasets: [{
            data: hourBuckets,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            r: {
              beginAtZero: true,
              grid: { color: getGridColor() },
              ticks: { display: false },
              pointLabels: { color: getTextMuted(), font: { size: 10 } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: item => I18n.t('hours.tooltip', item.label, item.raw)
              }
            }
          }
        }
      });
    } catch (e) { console.error('渲染时段分布失败:', e); }
  }

  // ===== 工具函数 =====
  function getWeekRange(offset) {
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1 + offset * 7);
    const dates = [];
    const labels = I18n.t('chart.weekday_labels');
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(formatDate(d));
    }
    return { startDate: dates[0], endDate: dates[6], dates, labels };
  }

  function formatDate(d) {
    return d.toISOString().split('T')[0];
  }

  function hexToRGBA(hex, alpha) {
    // 支持 #rgb, #rrggbb, rgb(), 以及直接返回
    if (hex.startsWith('rgba')) return hex;
    if (hex.startsWith('rgb(')) {
      return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return {
    init,
    refresh,
    refreshTodayStats
  };
})();