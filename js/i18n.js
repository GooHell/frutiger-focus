/**
 * Frutiger Focus v1.3.5 - 国际化模块 (i18n)
 * 支持中文 / English 双语切换
 * 架构：data-i18n 属性 + t() 函数
 */

const I18n = (() => {
  // 当前语言
  let currentLang = 'zh';

  // ===== 语言包 =====
  const messages = {
    // ==================== 中文 ====================
    zh: {
      // -- 顶部栏 --
      'topbar.theme_toggle': '切换主题',

      // -- 底部导航 --
      'nav.focus': '专注',
      'nav.stats': '统计',
      'nav.settings': '设置',
      'nav.theme': '切换主题',

      // -- 专注页：今日统计 --
      'focus.minutes': '分钟',
      'focus.sessions': '次',
      'focus.done': '完成',

      // -- 专注页：计时器 --
      'timer.ready': '准备开始',
      'timer.focusing': '专注中...',
      'timer.resting': '休息中...',
      'timer.paused': '已暂停',
      'timer.rest_time': '☕ 休息时间',
      'timer.next_round': '准备下一轮',
      'timer.start_focus': '开始专注',
      'timer.start_rest': '开始休息',
      'timer.start_next': '开始下一轮',
      'timer.skip_rest': '跳过休息 →',

      // -- 专注页：模式 --
      'mode.pomodoro': '⏱️ 专注计时',
      'mode.custom': '⏱ 自定义',
      'mode.minutes_suffix': '分钟',

      // -- 专注页：白噪音 --
      'ambient.title': '🎵 白噪音',
      'ambient.future': '未来',
      'ambient.rain': '雨声',
      'ambient.forest': '森林',
      'ambient.waves': '海浪',
      'ambient.river': '河流',
      'ambient.fire': '壁炉',
      'ambient.wind': '微风',
      'ambient.piano': '轻音乐',

      // -- 专注页：本周趋势 --
      'sidebar.weekly_trend': '📊 本周趋势',
      'sidebar.this_week': '本周',
      'sidebar.last_week': '上周',
      'sidebar.week_total': '本周共专注 {0} 分钟',
      'sidebar.week_total_prefix': '本周共专注 ',
      'sidebar.week_total_suffix': ' 分钟',

      // -- 任务页 --
      'tasks.add_new': '＋ 新建任务',
      'tasks.in_progress': '📌 进行中',
      'tasks.completed': '✅ 已完成',
      'tasks.empty_mobile': '暂无任务，点击右下角 + 添加',
      'tasks.empty_pc': '暂无任务，点击上方按钮添加',
      'tasks.new_task': '新建任务',
      'tasks.task_name': '任务名称',
      'tasks.add': '添加',
      'tasks.past_incomplete': '📅 过往未完成',
      'tasks.yesterday': '昨天',
      'tasks.day_before': '前天',
      'tasks.mark_done': '标记完成',
      'tasks.mark_undone': '标记未完成',
      'tasks.focus_on': '专注此任务',
      'tasks.delete': '删除任务',

      // -- 统计页：指标 --
      'stats.total_pomodoros': '总专注',
      'stats.total_time': '总时长',
      'stats.streak_days': '连续天数',
      'stats.daily_avg': '日均时长',
      'stats.longest_badge': '👑 最长',

      // -- 统计页：子标签 --
      'stats.tab_heatmap': '📅 热力图',
      'stats.tab_trends': '📈 趋势',
      'stats.tab_hours': '⏰ 时段',

      // -- 统计页：热力图 --
      'heatmap.weekdays': ['一', '二', '三', '四', '五', '六', '日'],
      'heatmap.less': '少',
      'heatmap.more': '多',
      'heatmap.month_format': '{year}年{month}月',
      'heatmap.weekday_names': ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      'heatmap.day_detail': '{month}月{day}日 {weekday}',
      'heatmap.no_record': '这一天没有专注记录',
      'heatmap.pomodoro_count': '� 专注 {0}',
      'heatmap.incomplete_count': '(+{0}未完成)',
      'heatmap.duration': '⏱ 时长 {0} 分钟',

      // -- 统计页：趋势图表 --
      'chart.weekly_focus': '📊 周专注时长',
      'chart.this_week': '本周',
      'chart.last_week': '上周',
      'chart.week_from': '{0}起',
      'chart.week_total_prefix': '本周共专注 ',
      'chart.week_total_suffix': ' 分钟',
      'chart.monthly_trend': '📈 月度趋势',
      'chart.month_format': '{month}月',
      'chart.year_month_format': '{year}年{month}月',
      'chart.day_suffix': '日',
      'chart.today_suffix': '（今天）',
      'chart.focus_minutes': '专注 {0} 分钟',
      'chart.weekday_labels': ['一', '二', '三', '四', '五', '六', '日'],

      // -- 统计页：时段分布 --
      'hours.title': '⏰ 24小时专注分布',
      'hours.no_data': '暂无足够数据',
      'hours.tooltip': '{0} — {1} 分钟',

      // -- 设置页：专注计时 --
      'settings.pomodoro': '⏱️ 专注计时',
      'settings.focus_duration': '专注时长',
      'settings.rest_duration': '休息时长',
      'settings.end_sound': '计时结束提示音',
      'settings.minutes': '分钟',

      // -- 设置页：提醒 --
      'settings.reminders': '🔔 提醒',
      'settings.enable_notifications': '启用通知提醒',
      'settings.morning_reminder': '早晨提醒',
      'settings.evening_review': '晚间回顾',

      // -- 设置页：数据便携 --
      'settings.data_portability': '💾 数据便携',
      'settings.data_hint': '一键复制你的数据文本，粘贴到新设备即可恢复。',
      'settings.export_clipboard': '📤 导出数据到剪贴板',
      'settings.copy': '📋 复制',
      'settings.restore_from_text': '📥 从文本恢复数据',
      'settings.import_replace': '替换导入',
      'settings.import_merge': '合并导入',
      'settings.file_import_export': '📁 文件导入/导出（高级）',
      'settings.export_json': '导出 JSON 文件',
      'settings.export': '📤 导出',
      'settings.import_json': '导入 JSON 文件',
      'settings.import': '📥 导入',
      'settings.clear_all': '清除所有数据',
      'settings.clear': '🗑️ 清除',

      // -- 设置页：云同步 --
      'settings.cloud_sync': '☁️ 云同步',
      'settings.cloud_hint': '通过 GitHub Gist 在多设备间同步数据（需要 GitHub 账号）。',
      'settings.github_token': 'GitHub Token',
      'settings.token_placeholder': '粘贴你的 Token',
      'settings.how_to_token': '🔑 如何获取 Token？',
      'settings.token_step1': '打开 <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener">GitHub Token 创建页面</a>',
      'settings.token_step2': 'Note 填写 <code>Frutiger Focus</code>',
      'settings.token_step3': 'Expiration 选择 <code>No expiration</code>',
      'settings.token_step4': '勾选 <code>gist</code> 权限',
      'settings.token_step5': '点击 <code>Generate token</code>',
      'settings.token_step6': '复制生成的 Token，粘贴到上方输入框',
      'settings.push_cloud': '📤 推送到云端',
      'settings.pull_cloud': '📥 从云端恢复',

      // -- 设置页：其他 --
      'settings.other': '🔧 其他',
      'settings.reset_default': '恢复默认设置',
      'settings.reset_btn': '↺ 恢复默认',
      'settings.language': '🌐 语言',

      // -- 设置页：版本信息 --
      'settings.version': 'Frutiger Focus v1.3.5',
      'settings.slogan': 'That future once promised · PWA',

      // -- Toast 消息 --
      'toast.settings_saved': '⚙️ 设置已保存',
      'toast.notifications_on': '🔔 通知已开启',
      'toast.notifications_off': '🔕 通知已关闭',
      'toast.morning_set': '⏰ 早晨提醒设为 {0}',
      'toast.evening_set': '🌙 晚间回顾设为 {0}',
      'toast.reset_settings': '↺ 已恢复默认设置',
      'toast.reset_confirm': '确定恢复所有设置为默认值吗？',
      'toast.exported_copied': '📤 数据已导出并复制到剪贴板',
      'toast.exported_manual': '📤 数据已导出，请手动复制',
      'toast.export_failed': '❌ 导出失败',
      'toast.copied': '📋 已复制到剪贴板',
      'toast.copied_short': '📋 已复制',
      'toast.paste_data': '❌ 请粘贴数据文本',
      'toast.unrecognized': '❌ 无法识别的数据格式',
      'toast.import_replaced': '📥 数据已替换导入',
      'toast.import_merged': '📥 数据已合并导入',
      'toast.import_failed': '❌ 导入失败：数据格式错误',
      'toast.json_exported': '📤 JSON 文件已导出',
      'toast.import_strategy': '请选择导入方式：\n\n【确定】= 替换（清除现有数据后导入）\n【取消】= 合并（保留现有数据，追加导入）',
      'toast.clear_confirm': '确定要清除所有数据吗？此操作不可撤销！',
      'toast.data_cleared': '🗑️ 所有数据已清除',
      'toast.clear_failed': '❌ 清除失败',
      'toast.no_token': '❌ 请先输入 GitHub Token',
      'toast.pushing': '正在推送...',
      'toast.push_ok': '推送成功',
      'toast.push_cloud_ok': '☁️ 数据已推送到云端',
      'toast.push_fail': '推送失败',
      'toast.pulling': '正在拉取...',
      'toast.no_cloud_data': '云端没有找到数据',
      'toast.pull_no_data': '⚠️ 云端没有数据，请先推送',
      'toast.pull_confirm': '从云端恢复将替换本地所有数据，确定继续吗？',
      'toast.pull_ok': '恢复成功',
      'toast.pull_cloud_ok': '☁️ 数据已从云端恢复',
      'toast.pull_cancelled': '已取消',
      'toast.pull_fail': '拉取失败',
      'toast.task_added': '✅ 任务已添加',
      'toast.task_add_failed': '❌ 添加失败',
      'toast.task_done': '🎉 任务完成！',
      'toast.task_deleted': '🗑️ 任务已删除',
      'toast.focus_on': '🎯 开始专注：{0}',
      'toast.timer_restored': '⏱️ 计时器已恢复',
      'toast.timer_restored_paused': '⏸ 计时器已恢复（暂停中）',
      'toast.mode_locked': '⏱️ 计时中无法切换模式',
      'toast.focus_complete': '✅ 专注完成！',
      'toast.focus_complete_rest': '✅ 专注完成！进入休息',
      'toast.rest_complete': '☕ 休息结束！准备下一轮',
      'toast.skipped_rest': '⏭ 已跳过休息',
      'toast.incomplete_focus': '⚠️ 不完全专注 · {0}分钟已记录',
      'toast.skip_too_short': '⏭ 已跳过（不足1分钟，不记录）',
      'toast.timer_reset': '⏹ 已重置',
      'toast.app_init_fail': '应用初始化失败',
      'toast.init_ok': '✅ Frutiger Focus v1.3.5 初始化完成',

      // -- Sync 状态 --
      'sync.syncing': '同步中...',

      // -- 引导弹窗 --
      'onboard.title': '🎯 欢迎使用 Frutiger Focus',
      'onboard.subtitle': '一个极简、轻量的专注工具',
      'onboard.feature_timer': '⏱️ <strong>专注计时</strong> — 专注→休息→下一轮',
      'onboard.feature_tasks': '📋 <strong>任务</strong> — 管理待办，关联专注',
      'onboard.feature_ambient': '🎵 <strong>环境音</strong> — 多种场景音可叠加',
      'onboard.feature_stats': '📊 <strong>统计</strong> — 记录每日专注数据',
      'onboard.shortcuts': '快捷键：空格 开始/暂停 · Esc 重置 · 1/2/3 切换页面',
      'onboard.start': '开始使用 →',

      // -- 通知 --
      'notif.morning_title': '早安！',
      'notif.morning_body': '新的一天开始了！来规划今天的任务吧 🌅',
      'notif.morning_modal_title': '🌅 早安！新的一天',
      'notif.morning_prompt': '今天想要完成什么？添加今天的任务吧：',
      'notif.task_placeholder': '任务 {0}...',
      'notif.later': '稍后',
      'notif.add_tasks': '添加任务',
      'notif.tasks_added': '✅ 已添加 {0} 个任务，加油！',
      'notif.evening_title': '晚间回顾',
      'notif.evening_body': '是时候回顾一下今天的成果了 🌙',
      'notif.evening_modal_title': '🌙 今日回顾',
      'notif.today_focused': '今天你专注了',
      'notif.minutes_unit': '分钟',
      'notif.tasks_progress': '完成 {0}/{1} 个任务',
      'notif.check_done': '勾选今天完成的任务：',
      'notif.no_tasks_today': '今天没有设定任务',
      'notif.goodnight': '好的，晚安 🌙',

      // -- 离开提示 --
      'beforeunload': '计时器正在运行中，确定要离开吗？'
    },

    // ==================== English ====================
    en: {
      // -- Top Bar --
      'topbar.theme_toggle': 'Toggle Theme',

      // -- Bottom Nav --
      'nav.focus': 'Focus',
      'nav.stats': 'Stats',
      'nav.settings': 'Settings',
      'nav.theme': 'Toggle Theme',

      // -- Focus Page: Today Stats --
      'focus.minutes': 'min',
      'focus.sessions': 'sessions',
      'focus.done': 'done',

      // -- Focus Page: Timer --
      'timer.ready': 'Ready',
      'timer.focusing': 'Focusing...',
      'timer.resting': 'Resting...',
      'timer.paused': 'Paused',
      'timer.rest_time': '☕ Rest Time',
      'timer.next_round': 'Ready for Next',
      'timer.start_focus': 'Start Focus',
      'timer.start_rest': 'Start Rest',
      'timer.start_next': 'Start Next Round',
      'timer.skip_rest': 'Skip Rest →',

      // -- Focus Page: Mode --
      'mode.pomodoro': '⏱️ Focus Timer',
      'mode.custom': '⏱ Custom',
      'mode.minutes_suffix': 'min',

      // -- Focus Page: Ambient --
      'ambient.title': '🎵 Ambient',
      'ambient.future': 'Future',
      'ambient.rain': 'Rain',
      'ambient.forest': 'Forest',
      'ambient.waves': 'Waves',
      'ambient.river': 'River',
      'ambient.fire': 'Fireplace',
      'ambient.wind': 'Breeze',
      'ambient.piano': 'Piano',

      // -- Focus Page: Weekly Trend --
      'sidebar.weekly_trend': '📊 Weekly Trend',
      'sidebar.this_week': 'This Week',
      'sidebar.last_week': 'Last Week',
      'sidebar.week_total': 'Total focus this week: {0} min',
      'sidebar.week_total_prefix': 'Total focus this week: ',
      'sidebar.week_total_suffix': ' min',

      // -- Tasks Page --
      'tasks.add_new': '＋ New Task',
      'tasks.in_progress': '📌 In Progress',
      'tasks.completed': '✅ Completed',
      'tasks.empty_mobile': 'No tasks yet. Tap + to add.',
      'tasks.empty_pc': 'No tasks yet. Click the button above to add.',
      'tasks.new_task': 'New Task',
      'tasks.task_name': 'Task name',
      'tasks.add': 'Add',
      'tasks.past_incomplete': '📅 Past Incomplete',
      'tasks.yesterday': 'Yesterday',
      'tasks.day_before': '2 days ago',
      'tasks.mark_done': 'Mark as done',
      'tasks.mark_undone': 'Mark as undone',
      'tasks.focus_on': 'Focus on this task',
      'tasks.delete': 'Delete task',

      // -- Stats Page: Metrics --
      'stats.total_pomodoros': 'Sessions',
      'stats.total_time': 'Total Time',
      'stats.streak_days': 'Streak',
      'stats.daily_avg': 'Daily Avg',
      'stats.longest_badge': '👑 Best',

      // -- Stats Page: Tabs --
      'stats.tab_heatmap': '📅 Heatmap',
      'stats.tab_trends': '📈 Trends',
      'stats.tab_hours': '⏰ Hours',

      // -- Stats Page: Heatmap --
      'heatmap.weekdays': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      'heatmap.less': 'Less',
      'heatmap.more': 'More',
      'heatmap.month_format': '{month}/{year}',
      'heatmap.weekday_names': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      'heatmap.day_detail': '{weekday}, {month}/{day}',
      'heatmap.no_record': 'No focus records on this day',
      'heatmap.pomodoro_count': '� Sessions: {0}',
      'heatmap.incomplete_count': '(+{0} incomplete)',
      'heatmap.duration': '⏱ Duration: {0} min',

      // -- Stats Page: Trend Charts --
      'chart.weekly_focus': '📊 Weekly Focus Time',
      'chart.this_week': 'This Week',
      'chart.last_week': 'Last Week',
      'chart.week_from': 'From {0}',
      'chart.week_total_prefix': 'Total focus this week: ',
      'chart.week_total_suffix': ' min',
      'chart.monthly_trend': '📈 Monthly Trend',
      'chart.month_format': '{month}',
      'chart.year_month_format': '{month} {year}',
      'chart.day_suffix': '',
      'chart.today_suffix': ' (Today)',
      'chart.focus_minutes': 'Focus: {0} min',
      'chart.weekday_labels': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],

      // -- Stats Page: Hours Distribution --
      'hours.title': '⏰ 24-Hour Focus Distribution',
      'hours.no_data': 'Not enough data yet',
      'hours.tooltip': '{0} — {1} min',

      // -- Settings: Focus Timer --
      'settings.pomodoro': '⏱️ Focus Timer',
      'settings.focus_duration': 'Focus Duration',
      'settings.rest_duration': 'Rest Duration',
      'settings.end_sound': 'Timer End Sound',
      'settings.minutes': 'min',

      // -- Settings: Reminders --
      'settings.reminders': '🔔 Reminders',
      'settings.enable_notifications': 'Enable Notifications',
      'settings.morning_reminder': 'Morning Reminder',
      'settings.evening_review': 'Evening Review',

      // -- Settings: Data Portability --
      'settings.data_portability': '💾 Data Portability',
      'settings.data_hint': 'Copy your data text and paste it on a new device to restore.',
      'settings.export_clipboard': '📤 Export to Clipboard',
      'settings.copy': '📋 Copy',
      'settings.restore_from_text': '📥 Restore from Text',
      'settings.import_replace': 'Replace',
      'settings.import_merge': 'Merge',
      'settings.file_import_export': '📁 File Import/Export (Advanced)',
      'settings.export_json': 'Export JSON File',
      'settings.export': '📤 Export',
      'settings.import_json': 'Import JSON File',
      'settings.import': '📥 Import',
      'settings.clear_all': 'Clear All Data',
      'settings.clear': '🗑️ Clear',

      // -- Settings: Cloud Sync --
      'settings.cloud_sync': '☁️ Cloud Sync',
      'settings.cloud_hint': 'Sync data across devices via GitHub Gist (requires GitHub account).',
      'settings.github_token': 'GitHub Token',
      'settings.token_placeholder': 'Paste your Token',
      'settings.how_to_token': '🔑 How to get a Token?',
      'settings.token_step1': 'Open <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener">GitHub Token page</a>',
      'settings.token_step2': 'Set Note to <code>Frutiger Focus</code>',
      'settings.token_step3': 'Set Expiration to <code>No expiration</code>',
      'settings.token_step4': 'Check <code>gist</code> scope',
      'settings.token_step5': 'Click <code>Generate token</code>',
      'settings.token_step6': 'Copy the token and paste it above',
      'settings.push_cloud': '📤 Push to Cloud',
      'settings.pull_cloud': '📥 Pull from Cloud',

      // -- Settings: Other --
      'settings.other': '🔧 Other',
      'settings.reset_default': 'Reset to Default',
      'settings.reset_btn': '↺ Reset',
      'settings.language': '🌐 Language',

      // -- Settings: Version --
      'settings.version': 'Frutiger Focus v1.3.5',
      'settings.slogan': 'That future once promised · PWA',

      // -- Toast Messages --
      'toast.settings_saved': '⚙️ Settings saved',
      'toast.notifications_on': '🔔 Notifications enabled',
      'toast.notifications_off': '🔕 Notifications disabled',
      'toast.morning_set': '⏰ Morning reminder set to {0}',
      'toast.evening_set': '🌙 Evening review set to {0}',
      'toast.reset_settings': '↺ Settings reset to default',
      'toast.reset_confirm': 'Reset all settings to default?',
      'toast.exported_copied': '📤 Data exported & copied to clipboard',
      'toast.exported_manual': '📤 Data exported, please copy manually',
      'toast.export_failed': '❌ Export failed',
      'toast.copied': '📋 Copied to clipboard',
      'toast.copied_short': '📋 Copied',
      'toast.paste_data': '❌ Please paste data text',
      'toast.unrecognized': '❌ Unrecognized data format',
      'toast.import_replaced': '📥 Data replaced',
      'toast.import_merged': '📥 Data merged',
      'toast.import_failed': '❌ Import failed: invalid format',
      'toast.json_exported': '📤 JSON file exported',
      'toast.import_strategy': 'Choose import method:\n\n[OK] = Replace (clear existing data)\n[Cancel] = Merge (keep existing data)',
      'toast.clear_confirm': 'Clear ALL data? This cannot be undone!',
      'toast.data_cleared': '🗑️ All data cleared',
      'toast.clear_failed': '❌ Clear failed',
      'toast.no_token': '❌ Please enter your GitHub Token first',
      'toast.pushing': 'Pushing...',
      'toast.push_ok': 'Push successful',
      'toast.push_cloud_ok': '☁️ Data pushed to cloud',
      'toast.push_fail': 'Push failed',
      'toast.pulling': 'Pulling...',
      'toast.no_cloud_data': 'No data found in cloud',
      'toast.pull_no_data': '⚠️ No cloud data, push first',
      'toast.pull_confirm': 'Restoring from cloud will replace all local data. Continue?',
      'toast.pull_ok': 'Restore successful',
      'toast.pull_cloud_ok': '☁️ Data restored from cloud',
      'toast.pull_cancelled': 'Cancelled',
      'toast.pull_fail': 'Pull failed',
      'toast.task_added': '✅ Task added',
      'toast.task_add_failed': '❌ Failed to add',
      'toast.task_done': '🎉 Task completed!',
      'toast.task_deleted': '🗑️ Task deleted',
      'toast.focus_on': '🎯 Focusing: {0}',
      'toast.timer_restored': '⏱️ Timer restored',
      'toast.timer_restored_paused': '⏸ Timer restored (paused)',
      'toast.mode_locked': '⏱️ Cannot switch mode while running',
      'toast.focus_complete': '✅ Focus complete!',
      'toast.focus_complete_rest': '✅ Focus complete! Rest time.',
      'toast.rest_complete': '☕ Rest over! Ready for next round.',
      'toast.skipped_rest': '⏭ Rest skipped',
      'toast.incomplete_focus': '⚠️ Incomplete focus · {0} min recorded',
      'toast.skip_too_short': '⏭ Skipped (< 1 min, not recorded)',
      'toast.timer_reset': '⏹ Reset',
      'toast.app_init_fail': 'App initialization failed',
      'toast.init_ok': '✅ Frutiger Focus v1.3.5 initialized',

      // -- Sync Status --
      'sync.syncing': 'Syncing...',

      // -- Onboarding --
      'onboard.title': '🎯 Welcome to Frutiger Focus',
      'onboard.subtitle': 'A minimal, lightweight focus tool',
      'onboard.feature_timer': '⏱️ <strong>Focus Timer</strong> — Focus → Rest → Repeat',
      'onboard.feature_tasks': '📋 <strong>Tasks</strong> — Manage to-dos, link with focus',
      'onboard.feature_ambient': '🎵 <strong>Ambient</strong> — Mix layered soundscapes',
      'onboard.feature_stats': '📊 <strong>Stats</strong> — Track daily focus data',
      'onboard.shortcuts': 'Shortcuts: Space Start/Pause · Esc Reset · 1/2/3 Switch page',
      'onboard.start': 'Get Started →',

      // -- Notifications --
      'notif.morning_title': 'Good morning!',
      'notif.morning_body': 'A new day begins! Plan your tasks 🌅',
      'notif.morning_modal_title': '🌅 Good Morning!',
      'notif.morning_prompt': 'What do you want to accomplish today?',
      'notif.task_placeholder': 'Task {0}...',
      'notif.later': 'Later',
      'notif.add_tasks': 'Add Tasks',
      'notif.tasks_added': '✅ Added {0} tasks. Let\'s go!',
      'notif.evening_title': 'Evening Review',
      'notif.evening_body': 'Time to review today\'s progress 🌙',
      'notif.evening_modal_title': '🌙 Today\'s Review',
      'notif.today_focused': 'Today you focused for',
      'notif.minutes_unit': 'minutes',
      'notif.tasks_progress': 'Completed {0}/{1} tasks',
      'notif.check_done': 'Check off completed tasks:',
      'notif.no_tasks_today': 'No tasks set today',
      'notif.goodnight': 'OK, Good night 🌙',

      // -- Before Unload --
      'beforeunload': 'Timer is running. Are you sure you want to leave?'
    }
  };

  // 英文月份名
  const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ===== 核心函数 =====

  /**
   * 翻译函数
   * @param {string} key - 翻译键
   * @param  {...any} args - 替换参数 {0}, {1}...
   * @returns {string|Array}
   */
  function t(key, ...args) {
    const pack = messages[currentLang] || messages.zh;
    let val = pack[key];
    if (val === undefined) {
      // fallback to Chinese
      val = messages.zh[key];
    }
    if (val === undefined) return key; // 找不到则返回 key 本身

    if (Array.isArray(val)) return val; // 数组直接返回

    // 替换占位符
    if (args.length > 0 && typeof val === 'string') {
      args.forEach((arg, i) => {
        val = val.replace(`{${i}}`, arg);
      });
    }
    return val;
  }

  /**
   * 获取英文月份名
   */
  function getMonthName(monthIndex) {
    return EN_MONTHS[monthIndex] || '';
  }

  /**
   * 应用 i18n 到所有 data-i18n 元素
   */
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (typeof val === 'string') {
        // 检查是否含 HTML（如 <a> <strong> 等）
        if (val.includes('<')) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });

    // 处理 data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (typeof val === 'string') el.placeholder = val;
    });

    // 处理 data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (typeof val === 'string') el.title = val;
    });

    // 处理热力图星期标签 data-i18n-weekday
    const weekdays = t('heatmap.weekdays');
    if (Array.isArray(weekdays)) {
      document.querySelectorAll('[data-i18n-weekday]').forEach(el => {
        const idx = parseInt(el.getAttribute('data-i18n-weekday'));
        if (weekdays[idx] !== undefined) el.textContent = weekdays[idx];
      });
    }

    // 同步语言选择器
    const langSelect = document.getElementById('setting-language');
    if (langSelect) langSelect.value = currentLang;

    // 更新 <html lang="">
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  }

  /**
   * 切换语言
   */
  function setLang(lang) {
    if (!messages[lang]) lang = 'zh';
    currentLang = lang;
    localStorage.setItem('ff_lang', lang);
    applyI18n();

    // 触发自定义事件，让各模块可以响应
    document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));
  }

  /**
   * 获取当前语言
   */
  function getLang() {
    return currentLang;
  }

  /**
   * 初始化：读取持久化偏好，否则检测浏览器语言
   */
  function init() {
    const saved = localStorage.getItem('ff_lang');
    if (saved && messages[saved]) {
      currentLang = saved;
    } else {
      // 检测浏览器语言
      const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (browserLang.startsWith('zh')) {
        currentLang = 'zh';
      } else {
        currentLang = 'en';
      }
    }
    // 首次应用不触发事件（各模块尚未初始化）
    applyI18n();
  }

  return { init, t, setLang, getLang, getMonthName, applyI18n };
})();
