/* 核心逻辑：热量、训练计划、每日菜单、统计 —— 纯函数，可在 Node 中测试 */
(function (g) {
  var EX = g.EXERCISES || [];
  var EX_BY_ID = {};
  EX.forEach(function (e) { EX_BY_ID[e.id] = e; });

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return fmtDate(new Date()); }
  function addDays(dateKey, n) { var d = new Date(dateKey + 'T12:00:00'); d.setDate(d.getDate() + n); return fmtDate(d); }
  function weekdayOf(dateKey) { return new Date(dateKey + 'T12:00:00').getDay(); } // 0=Sun
  function mondayOf(dateKey) { var wd = weekdayOf(dateKey); var off = (wd === 0 ? -6 : 1 - wd); return addDays(dateKey, off); }

  /* 种子随机（LCG），保证同参数结果稳定、换周可变化 */
  function rng(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  function pick(arr, count, seed) {
    var a = arr.slice(), out = [];
    var r = rng(seed);
    while (out.length < count && a.length) {
      out.push(a.splice(Math.floor(r() * a.length), 1)[0]);
    }
    return out;
  }

  /* 每日热量目标：BMR + 活动系数，按目标增减 */
  function calcCalorieTarget(profile) {
    if (profile.calorieTarget) return profile.calorieTarget;
    var bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + (profile.gender === 'female' ? -161 : 5);
    var tdee = bmr * 1.375;
    var target = profile.goal === 'lose_fat' ? tdee - 400 : profile.goal === 'gain_muscle' ? tdee + 300 : tdee;
    return Math.round(target / 50) * 50;
  }

  function exerciseInfo(id) { return EX_BY_ID[id] || null; }
  function zhName(id) { return (g.EXERCISE_ZH || {})[id] || (EX_BY_ID[id] && EX_BY_ID[id].name) || id; }

  /* 生成一周训练计划 */
  function generateWorkoutPlan(profile, weekOffset) {
    var pools = g.WORKOUT_POOLS[profile.condition] || g.WORKOUT_POOLS.gym;
    var dayTpls = g.DAY_PLANS[profile.weeklyDays] || g.DAY_PLANS[3];
    var goal = g.GOAL_RANGE[profile.goal] || g.GOAL_RANGE.maintain;
    var monday = mondayOf(todayKey());
    var schedule = { 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 3, 4] }[profile.weeklyDays] || [0, 2, 4];
    var days = [];
    for (var i = 0; i < 7; i++) days.push({ date: addDays(monday, i), title: '休息日', exercises: [] });

    dayTpls.forEach(function (tpl, idx) {
      var wd = schedule[idx];
      var title = tpl[0], slots = tpl[1];
      var exercises = [];
      var seedBase = weekOffset * 10000 + idx * 100;
      slots.forEach(function (slot, si) {
        var muscle = slot[0], count = slot[1];
        var ids = pick(pools[muscle] || [], count, seedBase + si * 7 + 3);
        ids.forEach(function (id, j) {
          var r = rng(seedBase + si * 100 + j);
          var reps = goal.repsMin + Math.floor(r() * (goal.repsMax - goal.repsMin + 1));
          var big = muscle === 'legs' || id === '0025' || id === '0032' || id === '0043';
          var rest = big ? (90 + Math.floor(r() * 2) * 30) : (60 + Math.floor(r() * 2) * 15);
          exercises.push({
            id: id, name: zhName(id), enName: exerciseInfo(id) ? exerciseInfo(id).name : id,
            muscle: muscle, sets: goal.sets, reps: reps, rest: rest,
            tip: g.MUSCLE_TIP[muscle] || '保持动作标准，量力而行'
          });
        });
      });
      /* 减脂：每天附加 1 个有氧 */
      if (profile.goal === 'lose_fat' && idx !== dayTpls.length - 1) {
        var cardioPool = pools.cardio || [];
        if (cardioPool.length) {
          var c = pick(cardioPool, 1, seedBase + 999)[0];
          exercises.push({ id: c, name: zhName(c), enName: exerciseInfo(c) ? exerciseInfo(c).name : c, muscle: 'cardio', sets: 1, reps: '15分钟', rest: 0, tip: g.MUSCLE_TIP.cardio });
        }
      }
      days[wd] = { date: addDays(monday, wd), title: title, exercises: exercises };
    });
    return { weekOffset: weekOffset, monday: monday, days: days };
  }

  /* 生成某天菜单 */
  function generateDailyMenu(profile, dateKey) {
    var target = calcCalorieTarget(profile);
    var share = { breakfast: 0.30, lunch: 0.40, dinner: 0.25, snack: 0.05 };
    var maxDiff = profile.cooking === 'beginner' ? 1 : profile.cooking === 'skilled' ? 3 : 2;
    var avoid = profile.avoidances || [];
    var meals = {};
    ['breakfast', 'lunch', 'dinner', 'snack'].forEach(function (cat) {
      var all = (g.RECIPES || []).filter(function (r) { return r.cat === cat; });
      var relaxed = all.filter(function (r) { return !r.avoidTags.some(function (t) { return avoid.indexOf(t) >= 0; }); });
      var strict = relaxed.filter(function (r) { return r.diff <= maxDiff; });
      var mainPool = strict.length ? strict : (relaxed.length ? relaxed : all);
      var altPool = relaxed.length ? relaxed : all;
      var shareKcal = Math.round(target * share[cat]);
      function byKcal(a, b) { return Math.abs(a.kcal - shareKcal) - Math.abs(b.kcal - shareKcal); }
      mainPool.sort(byKcal);
      altPool.sort(byKcal);
      var main = mainPool[0] ? mainPool[0].id : null;
      var alts = altPool.filter(function (r) { return r.id !== main; }).slice(0, 3).map(function (r) { return r.id; });
      meals[cat] = { main: main, alts: alts };
    });
    var total = 0;
    Object.keys(meals).forEach(function (cat) {
      var r = byId(meals[cat].main);
      if (r) total += r.kcal;
    });
    return { date: dateKey, meals: meals, target: target, total: total };
  }
  function byId(id) { return (g.RECIPES || []).filter(function (r) { return r.id === id; })[0] || null; }

  /* 连续坚持天数：按训练打卡从今天往回数 */
  function calcStreak(checkins, fromKey) {
    var key = fromKey || todayKey(), n = 0;
    while (true) {
      var c = checkins[key];
      if (c && c.workoutDone) { n++; key = addDays(key, -1); }
      else break;
    }
    return n;
  }

  /* 本周完成率：本周计划训练日完成数 / 计划训练日数 */
  function weeklyRate(checkins, plan) {
    if (!plan) return { done: 0, planned: 0, rate: 0 };
    var monday = mondayOf(todayKey());
    var planned = 0, done = 0;
    plan.days.forEach(function (d) {
      if (d.exercises.length) {
        planned++;
        var c = checkins[d.date];
        if (c && c.workoutDone) done++;
      }
    });
    return { done: done, planned: planned, rate: planned ? Math.round(done / planned * 100) : 0 };
  }

  /* 月度日历数据 */
  function monthData(checkins, plan, year, month /* 1-12 */) {
    var out = [];
    var days = new Date(year, month, 0).getDate();
    for (var d = 1; d <= days; d++) {
      var key = year + '-' + pad(month) + '-' + pad(d);
      var wd = weekdayOf(key);
      var planned = false;
      if (plan) {
        var pd = plan.days[wd];
        planned = !!pd && pd.exercises.length > 0;
      }
      var c = checkins[key];
      out.push({ date: key, day: d, planned: planned, done: !!(c && c.workoutDone), weight: c ? c.weight : null });
    }
    return out;
  }

  /* 体重序列 */
  function weightSeries(checkins) {
    return Object.keys(checkins).sort().map(function (k) {
      return { date: k, weight: checkins[k].weight };
    }).filter(function (x) { return x.weight; });
  }

  var api = { calcCalorieTarget: calcCalorieTarget, generateWorkoutPlan: generateWorkoutPlan, generateDailyMenu: generateDailyMenu, calcStreak: calcStreak, weeklyRate: weeklyRate, monthData: monthData, weightSeries: weightSeries, exerciseInfo: exerciseInfo, zhName: zhName, todayKey: todayKey, addDays: addDays, mondayOf: mondayOf, weekdayOf: weekdayOf, byId: byId };
  g.Logic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
