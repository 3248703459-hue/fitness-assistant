import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../app/data/exercises.js');
require('../app/data/zh-names.js');
require('../app/data/workout-pools.js');
require('../app/data/recipes.js');
const Logic = require('../app/js/logic.js');
const Store = require('../app/js/store.js');

const BASE = { heightCm: 175, weightKg: 72, age: 24, gender: 'male', goal: 'gain_muscle', weeklyDays: 4, condition: 'gym', avoidances: [], cooking: 'easy', calorieTarget: null };

test('热量计算：男性/女性/目标差异与手动覆盖', () => {
  const male = Logic.calcCalorieTarget({ ...BASE, goal: 'maintain' });
  const female = Logic.calcCalorieTarget({ ...BASE, gender: 'female', goal: 'maintain' });
  assert.ok(male > 1800 && male < 2600, '男性保持热量合理: ' + male);
  assert.ok(male - female > 100, '男性高于女性');
  assert.ok(Logic.calcCalorieTarget({ ...BASE, goal: 'lose_fat' }) < Logic.calcCalorieTarget({ ...BASE, goal: 'gain_muscle' }), '减脂低于增肌');
  assert.equal(Logic.calcCalorieTarget({ ...BASE, calorieTarget: 2000 }), 2000, '手动覆盖生效');
});

test('训练计划：27 种组合全部生成有效动作', () => {
  const goals = ['lose_fat', 'gain_muscle', 'maintain'];
  const conds = ['gym', 'dumbbell', 'bodyweight'];
  const daysArr = [3, 4, 5];
  let checked = 0;
  for (const goal of goals) for (const condition of conds) for (const weeklyDays of daysArr) {
    const p = Logic.generateWorkoutPlan({ ...BASE, goal, condition, weeklyDays }, 0);
    assert.equal(p.days.length, 7, '7 天结构');
    const trainDays = p.days.filter(d => d.exercises.length > 0);
    assert.equal(trainDays.length, weeklyDays, `${goal}/${condition}/${weeklyDays} 训练日数量`);
    for (const d of trainDays) {
      assert.ok(d.title && d.title !== '休息日', '有主题');
      for (const e of d.exercises) {
        const info = Logic.exerciseInfo(e.id);
        assert.ok(info, `动作存在: ${e.id}`);
        assert.ok(e.name && e.name !== e.enName, `有中文名: ${e.id} ${e.enName}`);
        assert.ok(Array.isArray(info.instr) && info.instr.length >= 2, `有中文教程: ${e.id}`);
        assert.ok((e.muscle === 'cardio' ? e.sets >= 1 : e.sets >= 3) && e.reps, '组数次数有效');
      }
    }
    if (goal === 'lose_fat') {
      const cardio = p.days.filter(d => d.exercises.some(e => e.muscle === 'cardio')).length;
      assert.ok(cardio >= 2, `减脂周有氧次数≥2，实际 ${cardio}`);
    }
    if (goal === 'gain_muscle') {
      const sets = new Set(p.days.flatMap(d => d.exercises.map(e => e.sets)));
      assert.deepEqual([...sets], [4], '增肌组数=4');
    }
    checked++;
  }
  assert.equal(checked, 27);
});

test('菜单生成：忌口过滤、厨艺限制、四餐齐全、热量贴近目标', () => {
  const p = { ...BASE, avoidances: ['海鲜'], cooking: 'beginner' };
  const menu = Logic.generateDailyMenu(p, '2026-08-14');
  assert.ok(menu.meals.breakfast.main && menu.meals.lunch.main && menu.meals.dinner.main && menu.meals.snack.main, '四餐齐全');
  for (const cat of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const r = Logic.byId(menu.meals[cat].main);
    assert.ok(r, cat + ' 主菜存在');
    assert.ok(!r.avoidTags.includes('海鲜'), cat + ' 不含忌口海鲜');
    assert.ok(r.diff <= 1, cat + ' 新手只出难度1');
    assert.ok(menu.meals[cat].alts.length >= 2, cat + ' 有候选替换');
  }
  const target = Logic.calcCalorieTarget(p);
  const ratio = menu.total / target;
  assert.ok(ratio > 0.6 && ratio < 1.4, `四餐总和接近目标: ${menu.total}/${target} (${(ratio * 100).toFixed(0)}%)`);
});

test('菜单替换：替换后主菜与候选互不重复', () => {
  const p = { ...BASE, cooking: 'easy' };
  const menu = Logic.generateDailyMenu(p, '2026-08-15');
  const m = menu.meals.lunch;
  assert.ok(!m.alts.includes(m.main), '候选不含主菜');
});

test('连续坚持天数：跨月连续与中断', () => {
  const checkins = {};
  checkins['2026-07-30'] = { workoutDone: true };
  checkins['2026-07-31'] = { workoutDone: true };
  checkins['2026-08-01'] = { workoutDone: true };
  checkins['2026-08-02'] = { workoutDone: false };
  assert.equal(Logic.calcStreak(checkins, '2026-08-01'), 3, '跨月连续');
  assert.equal(Logic.calcStreak(checkins, '2026-08-02'), 0, '当天未打卡则 0');
});

test('周完成率与月度日历', () => {
  const plan = Logic.generateWorkoutPlan({ ...BASE, weeklyDays: 3 }, 0);
  const checkins = {};
  const trainDays = plan.days.filter(d => d.exercises.length);
  checkins[trainDays[0].date] = { workoutDone: true };
  checkins[trainDays[1].date] = { workoutDone: true };
  const rate = Logic.weeklyRate(checkins, plan);
  assert.equal(rate.planned, 3);
  assert.equal(rate.done, 2);
  assert.equal(rate.rate, 67);
  const month = Logic.monthData(checkins, plan, 2026, 8);
  assert.equal(month.length, 31);
  const someTrain = month.find(x => x.planned);
  assert.ok(someTrain, '有计划训练日');
});

test('体重序列：排序且只含有效值', () => {
  const checkins = {
    '2026-08-10': { weight: 72.5 },
    '2026-08-01': { weight: 73.2 },
    '2026-08-05': { weight: null }
  };
  const s = Logic.weightSeries(checkins);
  assert.deepEqual(s.map(x => x.date), ['2026-08-01', '2026-08-10']);
  assert.equal(s.length, 2);
});

test('存储：默认值、保存读取、导出导入', () => {
  let mem = {};
  globalThis.localStorage = {
    getItem: k => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: k => { delete mem[k]; }
  };
  const d0 = Store.load();
  assert.equal(d0.version, 1);
  assert.equal(d0.profile, null);
  d0.profile = BASE;
  assert.ok(Store.save(d0));
  const d1 = Store.load();
  assert.equal(d1.profile.goal, 'gain_muscle');
  const json = Store.exportJson(d1);
  const d2 = Store.importJson(json);
  assert.equal(d2.profile.heightCm, 175);
  assert.throws(() => Store.importJson('{"version":99}'), /版本/);
});
