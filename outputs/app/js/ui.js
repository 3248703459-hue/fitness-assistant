/* UI 渲染：纯字符串构建，由 app.js 注入数据 */
(function (g) {
  var L = g.Logic, R = g.RECIPES || [], ZH = g.EXERCISE_ZH || {}, EX = g.EXERCISES || [];
  var CAT_CN = { chest:'胸', back:'背', shoulders:'肩', 'upper arms':'手臂', 'upper legs':'大腿', 'lower legs':'小腿', 'lower arms':'前臂', waist:'腰腹', cardio:'有氧', neck:'颈' };
  var MEAL_CN = { breakfast:'早餐', lunch:'午餐', dinner:'晚餐', snack:'加餐' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function byId(id) { return L.byId(id); }
  function catCn(c) { return CAT_CN[c] || c; }
  function mealStateCn(s) { return s === 'eaten' ? '吃了' : s === 'skipped' ? '没吃' : s === 'replaced' ? '替换' : '打卡'; }

  function todayView(data, todayKey) {
    var p = data.profile, plan = data.plan;
    var streak = L.calcStreak(data.checkins, todayKey);
    var wd = L.weekdayOf(todayKey);
    var day = plan ? plan.days[wd] : null;
    var c = data.checkins[todayKey] || {};
    var menu = data.menus[todayKey];
    var html = '';
    /* 坚持条 */
    html += '<div class="streakbar"><span style="font-size:20px">🔥</span><span class="big num">' + streak + '</span><span class="txt">天连续坚持！今天也要完成训练打卡</span></div>';
    /* 训练卡 */
    if (day && day.exercises.length) {
      var rows = day.exercises.map(function (e, i) {
        return '<div class="exrow" onclick="App.openExercise(\'' + e.id + '\',false)"><span class="idx">' + (i + 1) + '</span><span class="name">' + esc(e.name) + '</span><span class="meta num">' + e.sets + '组 × ' + e.reps + (e.rest ? ' · 休息' + e.rest + 's' : '') + '</span><span class="chev">›</span></div>';
      }).join('');
      html += '<div class="card"><div class="cardhead"><h2>今日训练</h2><button class="link" onclick="App.go(\'plan\')">查看本周 ›</button></div>' +
        '<div style="font-size:13px;color:var(--color-primary);background:var(--color-primary-soft);border-radius:10px;padding:8px 12px;margin-bottom:6px">🏋️ 主题：' + esc(day.title) + '</div>' + rows +
        '<div style="height:12px"></div><button class="btn primary" onclick="App.toggleWorkout(\'' + todayKey + '\')">' + (c.workoutDone ? '✅ 已打卡，点击取消' : '完成训练打卡') + '</button></div>';
    } else {
      html += '<div class="card"><div class="cardhead"><h2>今日训练</h2></div><div class="empty" style="padding:12px">今天是休息日 💤 好好恢复</div></div>';
    }
    /* 菜单卡 */
    if (menu) {
      var meals = Object.keys(menu.meals).map(function (k) {
        var m = menu.meals[k], r = byId(m.main);
        if (!r) return '';
        var st = (c.meals || {})[k] || null;
        var alts = (m.alts || []).map(function (a) { var ar = byId(a); return ar ? '<button class="chip small" onclick="App.replaceMeal(\'' + todayKey + '\',\'' + k + '\',\'' + a + '\')">' + esc(ar.name) + '</button>' : ''; }).join(' ');
        return '<div class="mealrow"><div class="meal">' + MEAL_CN[k] + '</div><div class="info">' +
          '<div class="dname" style="cursor:pointer" onclick="if(event.target.closest(\'.chip\'))return;App.openRecipe(\'' + r.id + '\')">' + esc(r.name) + ' <span style="font-size:11px;color:var(--color-text-muted)">[换: ' + alts + ']</span></div>' +
          '<div class="kcal num">约 ' + r.kcal + ' kcal · ' + (r.diff === 1 ? '简单' : r.diff === 2 ? '中等' : '熟练') + '</div></div>' +
          '<button class="chip ' + (st || '') + '" onclick="App.toggleMeal(\'' + todayKey + '\',\'' + k + '\')">' + mealStateCn(st) + '</button></div>';
      }).join('');
      html += '<div class="card"><div class="cardhead"><h2>今日菜单</h2><span class="num" style="font-size:12px;color:var(--color-text-muted)">' + menu.total + '/' + menu.target + ' kcal</span></div>' + meals +
        '<div style="font-size:12px;color:var(--color-text-muted);margin-top:8px">点菜名看做法 · 点「换」候选换菜 · 点右侧状态打卡</div></div>';
    }
    /* 体重卡 */
    html += '<div class="card"><div class="cardhead"><h2>体重记录</h2></div><div style="display:flex;gap:10px;align-items:center">' +
      '<input class="input" id="winput" type="number" placeholder="今天体重 (kg)" value="' + (c.weight || '') + '" style="flex:1">' +
      '<button class="btn primary sm" onclick="App.saveWeight(\'' + todayKey + '\')">记录</button></div></div>';
    return html;
  }

  function planView(data, selDay, edit) {
    var plan = data.plan;
    if (!plan) return '<div class="empty">暂无计划</div>';
    var strip = plan.days.map(function (d, i) {
      var has = d.exercises.length > 0;
      var done = data.checkins[d.date] && data.checkins[d.date].workoutDone;
      return '<div class="daycard ' + (i === selDay ? 'active' : '') + (done ? ' done' : '') + '" onclick="App.selDay(' + i + ')">' +
        '<div class="wd">周' + '日一二三四五六' [L.weekdayOf(d.date)] + '</div><div class="dd num">' + (+d.date.slice(8)) + '</div>' +
        '<div class="tag">' + (has ? esc(d.title) : '休息') + '</div></div>';
    }).join('');
    var d = plan.days[selDay];
    var rows = '';
    if (d.exercises.length) {
      rows = d.exercises.map(function (e, i) {
        var meta = edit
          ? '<span class="meta">组 <input class="rep-input" data-k="sets" data-id="' + e.id + '" value="' + e.sets + '"> · 次 <input class="rep-input" data-k="reps" data-id="' + e.id + '" value="' + e.reps + '">' + (e.rest ? ' · <input class="rep-input" data-k="rest" data-id="' + e.id + '" value="' + e.rest + '" style="width:52px">s' : '') + '</span>'
          : '<span class="meta num">' + e.sets + '组 × ' + e.reps + (e.rest ? ' · 休息' + e.rest + 's' : '') + '</span>';
        return '<div class="exrow" onclick="App.openExercise(\'' + e.id + '\',' + (edit ? 'false' : 'true') + ')"><span class="idx">' + (i + 1) + '</span><span class="name">' + esc(e.name) + '</span>' + meta +
          (edit ? '<button class="del" data-del="' + e.id + '" title="删除">✕</button>' : '<span class="chev">›</span>') + '</div>';
      }).join('');
    } else {
      rows = '<div class="empty" style="padding:12px">休息日，好好恢复 💤</div>';
    }
    var editbar = edit
      ? '<div class="editbar"><button class="btn secondary sm" id="plan-add-ex">＋ 添加动作</button><button class="btn secondary sm" id="plan-done-edit">完成</button></div>'
      : '';
    return '<div class="daystrip">' + strip + '</div><div class="card"><div class="cardhead"><h2>' + esc(d.title) + '</h2>' +
      (d.exercises.length ? '<span class="num" style="font-size:12px;color:var(--color-text-muted)">' + d.exercises.length + ' 个动作</span>' : '') + '</div>' + rows + editbar + '</div>';
  }

  function dietView(data) {
    var target = data.calorieTarget;
    var html = '';
    for (var i = 0; i < 7; i++) {
      var key = L.addDays(L.todayKey(), i);
      var menu = data.menus[key];
      if (!menu) continue;
      var label = i === 0 ? '今天' : '周' + '日一二三四五六' [L.weekdayOf(key)];
      var rows = Object.keys(menu.meals).map(function (k) {
        var r = byId(menu.meals[k].main);
        return r ? '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed var(--color-border)"><span style="font-size:13px">' + MEAL_CN[k] + ' · ' + esc(r.name) + '</span><span class="num" style="font-size:12px;color:var(--color-text-muted)">' + r.kcal + ' kcal</span></div>' : '';
      }).join('');
      html += '<div class="card"><div class="cardhead"><h2>' + label + ' ' + key.slice(5) + '</h2><span class="num" style="font-size:12px;color:var(--color-text-muted)">' + menu.total + '/' + menu.target + '</span></div>' + rows + '</div>';
    }
    return html;
  }

  function statsView(data, year, month) {
    var streak = L.calcStreak(data.checkins);
    var rate = L.weeklyRate(data.checkins, data.plan);
    var monthArr = L.monthData(data.checkins, data.plan, year, month);
    var start = L.weekdayOf(year + '-' + (month < 10 ? '0' + month : month) + '-01');
    var cells = '';
    for (var i = 0; i < start; i++) cells += '<div class="c off"></div>';
    var todayK = L.todayKey();
    monthArr.forEach(function (m) {
      cells += '<div class="c ' + (m.done ? 'done' : (m.planned ? 'planned' : '')) + (m.date === todayK ? ' today' : '') + '" onclick="App.openHistory(\'' + m.date + '\')" title="' + m.date + (m.done ? ' 已打卡' : (m.planned ? ' 计划训练' : '')) + '">' + m.day + '</div>';
    });
    var ws = L.weightSeries(data.checkins);
    var chart = '';
    if (ws.length >= 2) {
      var w = 420, h = 120, px = 20, py = 12;
      var xs = function (i) { return px + i * (w - px * 2) / (ws.length - 1); };
      var min = Math.min.apply(null, ws.map(function (x) { return x.weight; })), max = Math.max.apply(null, ws.map(function (x) { return x.weight; }));
      var ys = function (v) { return h - py - (v - min) / (max - min || 1) * (h - py * 2); };
      var path = ws.map(function (x, i) { return (i ? 'L' : 'M') + xs(i).toFixed(1) + ',' + ys(x.weight).toFixed(1); }).join(' ');
      var dots = ws.map(function (x, i) { return '<circle cx="' + xs(i).toFixed(1) + '" cy="' + ys(x.weight).toFixed(1) + '" r="3.5" fill="#157A40"/>'; }).join('');
      chart = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%"><path d="' + path + '" fill="none" stroke="#157A40" stroke-width="2.5" stroke-linecap="round"/><path d="' + path + ' L' + (w - px) + ',' + h + ' L' + px + ',' + h + ' Z" fill="#E7F6EC" opacity=".6"/>' + dots + '</svg>';
    } else {
      chart = '<div class="empty" style="padding:8px">记录 2 次以上体重后显示趋势</div>';
    }
    return '<div class="stathero">' +
      '<div class="statbox"><div class="v num">' + streak + '</div><div class="l">连续坚持（天）</div></div>' +
      '<div class="statbox"><div class="v" style="color:var(--color-primary)">' + rate.done + '/' + rate.planned + '</div><div class="l">本周完成率 ' + rate.rate + '%</div></div>' +
      '</div>' +
      '<div class="card"><div class="calhead"><button onclick="App.month(-1)">‹</button><h2 class="num">' + year + '年' + month + '月</h2><button onclick="App.month(1)">›</button></div><div class="cal">' + cells + '</div>' +
      '<div style="font-size:11px;color:var(--color-text-muted);margin-top:8px"><span style="color:var(--color-primary)">■</span> 已打卡 · <span>■</span> 计划训练 · 点击日期回看</div></div>' +
      '<div class="card"><div class="cardhead"><h2>体重趋势</h2></div>' + chart + '</div>';
  }

  function settingsView(data) {
    var p = data.profile;
    return '<div class="card">' +
      '<div class="setrow" onclick="App.editProfile()"><div class="l">健身档案</div><div class="r">' + esc(p.heightCm) + 'cm · ' + p.weightKg + 'kg · ' + (p.goal === 'gain_muscle' ? '增肌' : p.goal === 'lose_fat' ? '减脂' : '保持') + ' ›</div></div>' +
      '<div class="setrow" onclick="App.overrideCal()"><div class="l">每日热量目标</div><div class="r num">' + data.calorieTarget + ' kcal' + (data.calorieOverride ? '（手动）' : '') + ' ›</div></div>' +
      '<div class="setrow"><div class="l">浏览器提醒</div><div class="switch ' + (data.notify ? 'on' : '') + '" id="notify-switch"></div></div>' +
      '<div class="setrow" onclick="App.exportData()"><div class="l">导出数据（JSON）</div><div class="r">下载 ›</div></div>' +
      '<div class="setrow" onclick="App.importData()"><div class="l">导入数据（JSON）</div><div class="r">选择文件 ›</div></div>' +
      '<div class="setrow" onclick="App.about()"><div class="l">关于与数据来源</div><div class="r">›</div></div>' +
      '</div>' +
      '<p style="font-size:12px;color:var(--color-text-muted);text-align:center;margin-top:16px">数据仅保存在本机 · 动作库：Exercises dataset（1,324 动作）© Gym visual</p>';
  }

  function onbSteps() {
    return [
      { t: '你的身体数据', html: function (p) { return '<div class="field"><label>身高 (cm)</label><input class="input" id="o-h" type="number" value="' + p.heightCm + '"></div><div class="field"><label>体重 (kg)</label><input class="input" id="o-w" type="number" value="' + p.weightKg + '"></div><div class="field"><label>年龄</label><input class="input" id="o-a" type="number" value="' + p.age + '"></div><div class="field"><label>性别</label><div class="optgrid"><button class="opt ' + (p.gender === 'male' ? 'sel' : '') + '" data-g="male">男</button><button class="opt ' + (p.gender === 'female' ? 'sel' : '') + '" data-g="female">女</button></div></div>'; } },
      { t: '你的目标', html: function (p) { return '<div class="optgrid"><button class="opt ' + (p.goal === 'lose_fat' ? 'sel' : '') + '" data-goal="lose_fat">减脂</button><button class="opt ' + (p.goal === 'gain_muscle' ? 'sel' : '') + '" data-goal="gain_muscle">增肌</button><button class="opt ' + (p.goal === 'maintain' ? 'sel' : '') + '" data-goal="maintain">保持</button></div><p class="hint">目标影响训练安排与每日热量</p>'; } },
      { t: '每周能练几天？', html: function (p) { return '<div class="optgrid">' + [3, 4, 5].map(function (n) { return '<button class="opt ' + (p.weeklyDays === n ? 'sel' : '') + '" data-wd="' + n + '">每周 ' + n + ' 天</button>'; }).join('') + '</div>'; } },
      { t: '训练条件', html: function (p) { return '<div class="optgrid"><button class="opt ' + (p.condition === 'gym' ? 'sel' : '') + '" data-c="gym">健身房</button><button class="opt ' + (p.condition === 'dumbbell' ? 'sel' : '') + '" data-c="dumbbell">哑铃/居家</button><button class="opt ' + (p.condition === 'bodyweight' ? 'sel' : '') + '" data-c="bodyweight">纯徒手</button></div>'; } },
      { t: '忌口（可多选）', html: function (p) { return '<div class="optgrid">' + ['香菜', '海鲜', '牛肉', '辣椒', '乳制品', '花生'].map(function (x) { return '<button class="opt ' + (p.avoidances.indexOf(x) >= 0 ? 'sel' : '') + '" data-av="' + x + '">' + x + '</button>'; }).join('') + '</div>'; } },
      { t: '做饭条件', html: function (p) { return '<div class="optgrid"><button class="opt ' + (p.cooking === 'beginner' ? 'sel' : '') + '" data-cook="beginner">不太会做</button><button class="opt ' + (p.cooking === 'easy' ? 'sel' : '') + '" data-cook="easy">会做简单的</button><button class="opt ' + (p.cooking === 'skilled' ? 'sel' : '') + '" data-cook="skilled">熟练</button></div>'; } }
    ];
  }

  function exDetail(ex, opts) {
    var zh = ZH[ex.id] || ex.name;
    var gif = '<div class="gymgif"><img src="assets/gifs/' + ex.id + '.gif" alt="' + esc(zh) + ' 演示" onerror="this.parentNode.innerHTML=\'🎬 演示动图（本地未打包）\'"></div>';
    var tags = '<span class="tag">' + catCn(ex.category) + '</span><span class="tag">' + esc(ex.equipment) + '</span><span class="tag">' + esc(ex.target) + '</span>';
    var steps = (ex.instr || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    return { zh: zh, gif: gif, tags: tags, steps: steps };
  }

  function libView(query, cat, cats) {
    var q = (query || '').trim().toLowerCase();
    var list = EX.filter(function (e) {
      if (cat && e.category !== cat) return false;
      if (!q) return true;
      var zh = ZH[e.id] || '';
      return e.name.toLowerCase().indexOf(q) >= 0 || zh.toLowerCase().indexOf(q) >= 0 || (CAT_CN[e.category] || '').indexOf(q) >= 0 || e.equipment.toLowerCase().indexOf(q) >= 0;
    }).slice(0, 200);
    if (!list.length) return '<div class="empty">没有匹配的动作，换个关键词试试</div>';
    return list.map(function (e) {
      return '<div class="libcard" onclick="App.libOpen(\'' + e.id + '\')"><div class="nm">' + esc(ZH[e.id] || e.name) + '</div><div class="mt">' + catCn(e.category) + ' · ' + esc(e.equipment) + '</div></div>';
    }).join('');
  }

  var UI = { todayView: todayView, planView: planView, dietView: dietView, statsView: statsView, settingsView: settingsView, onbSteps: onbSteps, exDetail: exDetail, libView: libView, catCn: catCn, MEAL_CN: MEAL_CN, esc: esc };
  g.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
