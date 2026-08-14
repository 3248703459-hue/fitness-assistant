/* 训练模板池：condition -> muscle -> exerciseId 列表（全部来自 exercises-dataset） */
(function(g){
var POOLS = {
  gym: {
    chest: ['0025','0047','0289','0308','0251'],
    back: ['0027','0652','1326','0292','0177'],
    shoulders: ['0091','0334','0310','0290','0120'],
    arms: ['0031','0294','0070','0200','0061','0030'],
    legs: ['0043','0032','0054','1409','0116'],
    core: ['0001','0464','0687','2963','0274'],
    cardio: ['0685','1160','0630','2612']
  },
  dumbbell: {
    chest: ['0289','0314','0308','0662'],
    back: ['0292','0293','0406','1326'],
    shoulders: ['0290','0334','0310','0326'],
    arms: ['0294','0285','0430','0333'],
    legs: ['1760','0336','1459','0413','0300'],
    core: ['0001','0464','0687','0274'],
    cardio: ['1160','3224','0685','0630']
  },
  bodyweight: {
    chest: ['0662','0279','0251','1273'],
    back: ['0652','1326','3166','3293'],
    shoulders: ['0283','0471','0259'],
    arms: ['0129','0283','0139','1771'],
    legs: ['3119','3470','3013','2368','0514'],
    core: ['0001','0464','0687','0274'],
    cardio: ['1160','3224','0630','0685']
  }
};
/* 每周天数 -> 每天的模板 [名称, [{muscle, count}]] */
var DAY_PLANS = {
  3: [
    ['胸 + 肩 + 三头', [['chest',2],['shoulders',1],['arms',1]]],
    ['背 + 二头', [['back',2],['arms',1]]],
    ['腿 + 核心', [['legs',2],['core',1]]]
  ],
  4: [
    ['胸 + 三头', [['chest',2],['arms',1]]],
    ['背 + 二头', [['back',2],['arms',1]]],
    ['腿 + 核心', [['legs',3],['core',1]]],
    ['全身 + 有氧', [['chest',1],['back',1],['legs',1],['core',1]]]
  ],
  5: [
    ['胸', [['chest',3],['arms',1]]],
    ['背', [['back',3],['arms',1]]],
    ['肩 + 手臂', [['shoulders',2],['arms',2]]],
    ['腿', [['legs',3],['core',1]]],
    ['核心 + 有氧', [['core',2],['cardio',1]]]
  ]
};
var GOAL_RANGE = { lose_fat: {sets:3, repsMin:12, repsMax:15}, gain_muscle: {sets:4, repsMin:8, repsMax:10}, maintain: {sets:3, repsMin:10, repsMax:12} };
var MUSCLE_TIP = {
  chest:'肩胛收紧，控制离心，感受胸部发力',
  back:'先沉肩再发力，想象手肘向后拉',
  shoulders:'不要耸肩，动作放慢控制',
  arms:'肘部固定，避免借力摆动',
  legs:'膝盖与脚尖同向，核心收紧',
  core:'收紧腹部，保持均匀呼吸',
  cardio:'保持节奏，心率稳定即可'
};
g.WORKOUT_POOLS = POOLS;
g.DAY_PLANS = DAY_PLANS;
g.GOAL_RANGE = GOAL_RANGE;
g.MUSCLE_TIP = MUSCLE_TIP;
if (typeof module !== 'undefined' && module.exports) module.exports = { POOLS, DAY_PLANS, GOAL_RANGE, MUSCLE_TIP };
})(typeof window !== 'undefined' ? window : globalThis);
