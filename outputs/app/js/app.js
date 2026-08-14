/* 应用编排：状态、路由、事件 */
(function (g) {
  var L = g.Logic, S = g.Store, UI = g.UI;
  var data = S.load();
  var state = { step: 0, selDay: 0, edit: false, libCat: '', libQ: '', view: '', year: 0, month: 0, libAddTarget: null };

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function persist() { S.save(data); }
  function todayK() { return L.todayKey(); }

  /* ---- 初始化与数据保证 ---- */
  function ensurePlan() {
    var monday = L.mondayOf(todayK());
    if (!data.plan || data.plan.monday !== monday) {
      var offset = data.plan ? data.plan.weekOffset + 1 : 0;
      data.plan = L.generateWorkoutPlan(data.profile, offset);
    }
  }
  function ensureMenu(key) {
    if (!data.menus[key]) data.menus[key] = L.generateDailyMenu(data.profile, key);
  }
  function ensureCheckin(key) {
    if (!data.checkins[key]) data.checkins[key] = { workoutDone: false, meals: {}, weight: null };
  }
  function ensureWeek() {
    ensurePlan();
    for (var i = 0; i < 7; i++) {
      var k = L.addDays(todayK(), i);
      ensureMenu(k);
      ensureCheckin(k);
    }
    data.calorieTarget = L.calcCalorieTarget(data.profile);
  }

  /* ---- 路由 ---- */
  function go(v) {
    state.view = v;
    $$('.view').forEach(function (x) { x.classList.remove('active'); });
    var el = $('#view-' + v);
    if (el) el.classList.add('active');
    $$('#nav button').forEach(function (b) { b.classList.toggle('active', b.dataset.v === v); });
    render(v);
    window.scrollTo(0, 0);
  }
  function render(v) {
    if (v === 'today') $('#today-body').innerHTML = UI.todayView(data, todayK());
    if (v === 'plan') $('#plan-body').innerHTML = UI.planView(data, state.selDay, state.edit);
    if (v === 'diet') { $('#diet-target').textContent = '每日约 ' + data.calorieTarget + ' kcal'; $('#diet-body').innerHTML = UI.dietView(data); }
    if (v === 'stats') { state.year = state.year || new Date().getFullYear(); state.month = state.month || new Date().getMonth() + 1; $('#stats-body').innerHTML = UI.statsView(data, state.year, state.month); }
    if (v === 'settings') $('#settings-body').innerHTML = UI.settingsView(data);
  }

  /* ---- 建档 ---- */
  function onbRender() {
    var steps = UI.onbSteps();
    var n = steps.length;
    $('#stepdots').innerHTML = Array.from({ length: n }, function (_, i) { return '<i class="' + (i < state.step ? 'done' : i === state.step ? 'cur' : '') + '"></i>'; }).join('');
    var s = steps[state.step];
    $('#onb-body').innerHTML = '<h2 style="font-size:19px;margin-bottom:14px">' + s.t + '</h2>' + s.html(data.profile || { heightCm: '', weightKg: '', age: '', gender: 'male', goal: '', weeklyDays: 4, condition: 'gym', avoidances: [], cooking: 'easy' });
    $('#onb-next').textContent = state.step === n - 1 ? '完成，开始自律 →' : '下一步';
  }
  function onbNext() {
    var p = data.profile || {};
    if (state.step === 0) {
      p.heightCm = +$('#o-h').value; p.weightKg = +$('#o-w').value; p.age = +$('#o-a').value;
      if (!(p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 200 && p.age >= 10 && p.age <= 80)) { toast('请填写有效的身高/体重/年龄'); return; }
    }
    state.step++;
    if (state.step >= UI.onbSteps().length) {
      data.profile = p;
      data.plan = null; data.menus = {};
      ensureWeek();
      persist();
      go('today');
      toast('🎉 档案已保存，开始你的第一周！');
    } else {
      onbRender();
    }
  }

  /* ---- 今日交互 ---- */
  function toggleWorkout(key) {
    var c = data.checkins[key];
    c.workoutDone = !c.workoutDone;
    persist(); render('today');
    if (c.workoutDone) toast('💪 训练打卡成功！');
  }
  function toggleMeal(key, meal) {
    var c = data.checkins[key];
    c.meals[meal] = c.meals[meal] === 'eaten' ? 'skipped' : c.meals[meal] === 'skipped' ? 'replaced' : c.meals[meal] === 'replaced' ? null : 'eaten';
    persist(); render('today');
  }
  function replaceMeal(key, meal, id) {
    var m = data.menus[key].meals[meal];
    var old = m.main;
    m.main = id;
    m.alts = [old].concat(m.alts.filter(function (a) { return a !== id; })).slice(0, 3);
    var c = data.checkins[key];
    c.meals[meal] = 'replaced';
    data.menus[key].total = Object.keys(data.menus[key].meals).reduce(function (sum, k) { var r = L.byId(data.menus[key].meals[k].main); return sum + (r ? r.kcal : 0); }, 0);
    persist(); render('today'); render('diet');
  }
  function saveWeight(key) {
    var v = parseFloat($('#winput').value);
    if (v && v > 30 && v < 200) {
      data.checkins[key].weight = v;
      persist(); render('today'); toast('体重已记录');
    } else { toast('请输入有效体重 (30-200kg)'); }
  }

  /* ---- 训练 ---- */
  function selDay(i) { state.selDay = i; render('plan'); }
  function regenPlan() {
    if (!confirm('重新生成会替换本周训练安排（不删除打卡记录），继续？')) return;
    data.plan = L.generateWorkoutPlan(data.profile, data.plan.weekOffset + 1);
    persist(); render('plan'); toast('已生成新计划');
  }
  function toggleEdit() { state.edit = !state.edit; render('plan'); }
  function openLib(target) {
    state.libAddTarget = target || null;
    $('#ov-lib').classList.add('open');
    renderLib();
  }
  function renderLib() {
    $('#lib-count').textContent = g.EXERCISES.length;
    var cats = {};
    g.EXERCISES.forEach(function (e) { cats[e.category] = 1; });
    var opts = Object.keys(cats).map(function (c) { return '<option value="' + c + '">' + UI.catCn(c) + '</option>'; }).join('');
    $('#lib-cat').innerHTML = '<option value="">全部分类</option>' + opts;
    $('#lib-cat').value = state.libCat;
    $('#lib-q').value = state.libQ;
    $('#lib-grid').innerHTML = UI.libView(state.libQ, state.libCat);
  }
  function libOpen(id) {
    openExercise(id, !!state.libAddTarget);
  }
  function addExToPlan(id) {
    var d = data.plan.days[state.selDay];
    if (!d) return;
    var ex = L.exerciseInfo(id);
    if (!ex) return;
    d.exercises.push({ id: id, name: L.zhName(id), enName: ex.name, muscle: ex.category, sets: 3, reps: 10, rest: 60, tip: '动作要点见讲解' });
    persist(); closeOv(); render('plan'); render('today');
    toast('已添加到 ' + d.title);
  }
  function deleteEx(id) {
    var d = data.plan.days[state.selDay];
    d.exercises = d.exercises.filter(function (e) { return e.id !== id; });
    persist(); render('plan'); render('today');
  }
  function updateExField(id, field, val) {
    var d = data.plan.days[state.selDay];
    var e = d.exercises.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    if (field === 'sets') e.sets = Math.max(1, Math.min(8, +val || e.sets));
    if (field === 'reps') e.reps = Math.max(1, Math.min(60, +val || e.reps));
    if (field === 'rest') e.rest = Math.max(0, Math.min(300, +val || e.rest));
    persist();
  }

  /* ---- 详情 ---- */
  function openExercise(id, addable) {
    var ex = L.exerciseInfo(id);
    if (!ex) return;
    var d = UI.exDetail(ex);
    $('#ex-name').textContent = d.zh + ' · ' + ex.name;
    $('#ex-sub').textContent = UI.catCn(ex.category) + ' · ' + ex.equipment + ' · 主要肌群：' + ex.target;
    $('#ex-gif').innerHTML = d.gif;
    $('#ex-tags').innerHTML = d.tags;
    $('#ex-steps').innerHTML = d.steps;
    var btn = $('#ex-add');
    btn.style.display = addable ? 'flex' : 'none';
    btn.onclick = function () { addExToPlan(id); };
    $('#ov-ex').classList.add('open');
  }
  function openRecipe(id) {
    var r = L.byId(id);
    if (!r) return;
    $('#rc-name').textContent = r.name;
    $('#rc-sub').textContent = UI.MEAL_CN[r.cat] + ' · 约 ' + r.kcal + ' kcal · ' + r.time + ' 分钟 · ' + (r.diff === 1 ? '简单' : r.diff === 2 ? '中等' : '熟练');
    $('#rc-ing').innerHTML = r.ing.map(function (i) { return '<div class="ingrow"><span>' + UI.esc(i[0]) + '</span><span class="qty">' + i[1] + ' ' + i[2] + '</span></div>'; }).join('');
    $('#rc-steps').innerHTML = r.steps.map(function (s) { return '<li>' + UI.esc(s) + '</li>'; }).join('');
    var fav = data.favorites.indexOf(r.id) >= 0;
    var b = $('#rc-fav');
    b.textContent = fav ? '已收藏 ♥' : '收藏这道菜';
    b.onclick = function () {
      var i = data.favorites.indexOf(r.id);
      if (i >= 0) data.favorites.splice(i, 1); else data.favorites.push(r.id);
      persist(); toast(i >= 0 ? '已取消收藏' : '已收藏'); openRecipe(id);
    };
    $('#ov-recipe').classList.add('open');
  }
  function closeOv() { $$('.overlay.open').forEach(function (o) { o.classList.remove('open'); if (o.getAttribute('data-dyn')) o.remove(); }); state.libAddTarget = null; }

  /* ---- 数据 ---- */
  function month(delta) {
    state.month += delta;
    if (state.month < 1) { state.month = 12; state.year--; }
    if (state.month > 12) { state.month = 1; state.year++; }
    render('stats');
  }
  function openHistory(key) {
    var d = data.plan && data.plan.days[L.weekdayOf(key)];
    var c = data.checkins[key] || {};
    var menu = data.menus[key];
    var parts = [];
    parts.push('<h2>' + key + '</h2>');
    parts.push('<div class="sub">' + (d && d.exercises.length ? '训练主题：' + UI.esc(d.title) : '休息日') + ' · 训练打卡：' + (c.workoutDone ? '✅ 完成' : '—') + '</div>');
    if (menu) {
      parts.push('<div style="margin:10px 0">' + Object.keys(menu.meals).map(function (k) {
        var r = L.byId(menu.meals[k].main);
        return r ? '<div class="ingrow"><span>' + UI.MEAL_CN[k] + ' · ' + UI.esc(r.name) + '</span><span class="qty">' + r.kcal + ' kcal</span></div>' : '';
      }).join('') + '</div>');
    }
    if (c.weight) parts.push('<div class="sub">体重：' + c.weight + ' kg</div>');
    var ov = document.createElement('div');
    ov.className = 'overlay open';
    ov.setAttribute('data-dyn', '1');
    ov.innerHTML = '<div class="sheet"><div class="sheethead"><h2 style="flex:1">当天回顾</h2><button class="iconbtn" onclick="App.closeOv()">✕</button></div>' + parts.join('') + '<div style="height:8px"></div><button class="btn primary" onclick="App.closeOv()">关闭</button></div>';
    document.body.appendChild(ov);
  }

  /* ---- 设置 ---- */
  function editProfile() {
    state.step = 0;
    go('onb');
    onbRender();
  }
  function overrideCal() {
    var v = prompt('每日热量目标（kcal），留空恢复自动计算', data.calorieOverride || '');
    if (v === null) return;
    if (v.trim() === '') {
      data.calorieOverride = null; data.profile.calorieTarget = null;
      toast('已恢复自动计算');
    } else {
      var n = parseInt(v, 10);
      if (n >= 1200 && n <= 4000) { data.calorieOverride = n; data.profile.calorieTarget = n; toast('热量目标已设为 ' + n); }
      else { toast('请输入 1200~4000 之间的值'); return; }
    }
    data.menus = {}; ensureWeek(); persist(); render('settings');
  }
  function toggleNotify() {
    var sw = $('#notify-switch');
    if (!data.notify) {
      if (!('Notification' in window)) { toast('当前浏览器不支持通知'); return; }
      Notification.requestPermission().then(function (perm) {
        if (perm === 'granted') { data.notify = true; sw.classList.add('on'); persist(); toast('提醒已开启（页面打开时生效）'); scheduleNotify(); }
        else { toast('未获得通知权限'); }
      });
    } else {
      data.notify = false; sw.classList.remove('on'); persist(); toast('提醒已关闭');
    }
  }
  function scheduleNotify() {
    if (!data.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    var now = new Date();
    var target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);
    var wait = target.getTime() - now.getTime();
    if (wait <= 0) return;
    setTimeout(function () {
      if (!data.notify) return;
      try { new Notification('健身助手', { body: '今天的训练/饮食还没打卡，打开看看吧 💪' }); } catch (e) {}
    }, wait);
  }
  function exportData() {
    var blob = new Blob([S.exportJson(data)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '健身助手数据备份-' + todayK() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已导出备份文件');
  }
  function importData() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var nd = S.importJson(reader.result);
          data = nd; state.selDay = 0; state.edit = false;
          ensureWeek(); persist(); go('today'); toast('✅ 数据导入成功');
        } catch (e) { toast('导入失败：' + e.message); }
      };
      reader.readAsText(f);
    };
    inp.click();
  }
  function about() {
    toast('动作库：Exercises dataset（1,324 动作）© Gym visual · 数据仅存本机');
  }

  /* ---- 事件 ---- */
  function bind() {
    $('#nav').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) go(b.dataset.v); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOv(); });
    $('#onb-next').addEventListener('click', onbNext);
    $('#onb-body').addEventListener('click', function (e) {
      var b = e.target.closest('button.opt');
      if (!b) return;
      var p = data.profile || {};
      if (b.dataset.g) p.gender = b.dataset.g;
      if (b.dataset.goal) p.goal = b.dataset.goal;
      if (b.dataset.wd) p.weeklyDays = +b.dataset.wd;
      if (b.dataset.c) p.condition = b.dataset.c;
      if (b.dataset.cook) p.cooking = b.dataset.cook;
      if (b.dataset.av) { var i = p.avoidances.indexOf(b.dataset.av); if (i >= 0) p.avoidances.splice(i, 1); else p.avoidances.push(b.dataset.av); }
      data.profile = p;
      e.currentTarget.querySelectorAll('button.opt').forEach(function (o) { o.classList.remove('sel'); });
      b.classList.add('sel');
    });
    $('#plan-regen').addEventListener('click', regenPlan);
    $('#plan-edit').addEventListener('click', toggleEdit);
    $('#plan-lib').addEventListener('click', function () { openLib('plan'); });
    $('#plan-body').addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); deleteEx(del.dataset.del); return; }
      var add = e.target.closest('#plan-add-ex');
      if (add) { openLib('plan'); return; }
      var done = e.target.closest('#plan-done-edit');
      if (done) { toggleEdit(); return; }
    });
    $('#plan-body').addEventListener('change', function (e) {
      var inp = e.target.closest('.rep-input');
      if (inp) updateExField(inp.dataset.id, inp.dataset.k, inp.value);
    });
    $('#lib-q').addEventListener('input', function () { state.libQ = this.value; $('#lib-grid').innerHTML = UI.libView(state.libQ, state.libCat); });
    $('#lib-cat').addEventListener('change', function () { state.libCat = this.value; $('#lib-grid').innerHTML = UI.libView(state.libQ, state.libCat); });
    $('#today-weight').addEventListener('click', function () { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); });
    $('#settings-body').addEventListener('click', function (e) {
      var sw = e.target.closest('#notify-switch');
      if (sw) { toggleNotify(); }
    });
    window.addEventListener('beforeunload', persist);
  }

  /* ---- 启动 ---- */
  function boot() {
    bind();
    if (!data.profile) {
      data.profile = { heightCm: 175, weightKg: 72, age: 24, gender: 'male', goal: 'gain_muscle', weeklyDays: 4, condition: 'gym', avoidances: [], cooking: 'easy' };
      go('onb');
      onbRender();
    } else {
      ensureWeek();
      persist();
      go('today');
      scheduleNotify();
    }
  }

  var App = { go: go, toggleWorkout: toggleWorkout, toggleMeal: toggleMeal, replaceMeal: replaceMeal, saveWeight: saveWeight, selDay: selDay, openExercise: openExercise, openRecipe: openRecipe, closeOv: closeOv, openLib: openLib, libOpen: libOpen, month: month, openHistory: openHistory, editProfile: editProfile, overrideCal: overrideCal, exportData: exportData, importData: importData, about: about };
  g.App = App;
  g.closeOv = closeOv;
  document.addEventListener('DOMContentLoaded', boot);
})(window);
