/* 本机存储：localStorage 持久化 + JSON 导出/导入 */
(function (g) {
  var KEY = 'fitness-helper-v1';
  var DEFAULT = function () {
    return {
      version: 1,
      profile: null,          // null = 未建档
      calorieOverride: null,  // 手动热量覆盖
      notify: false,
      plan: null,             // { weekOffset, monday, days }
      menus: {},              // dateKey -> {date, meals, target, total}
      checkins: {},           // dateKey -> { workoutDone, meals, weight }
      favorites: []           // 收藏菜谱 id
    };
  };

  function load() {
    try {
      var raw = g.localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.version === 1) {
          var d = DEFAULT();
          Object.keys(d).forEach(function (k) { if (data[k] !== undefined) d[k] = data[k]; });
          return d;
        }
      }
    } catch (e) { /* ignore */ }
    return DEFAULT();
  }
  function save(data) {
    try { g.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { return false; }
    return true;
  }
  function clear() { try { g.localStorage.removeItem(KEY); } catch (e) {} }
  function exportJson(data) { return JSON.stringify(data, null, 2); }
  function importJson(text) {
    var data = JSON.parse(text);
    if (!data || data.version !== 1) throw new Error('数据文件版本不兼容');
    return data;
  }

  var api = { KEY: KEY, load: load, save: save, clear: clear, exportJson: exportJson, importJson: importJson, defaults: DEFAULT };
  g.Store = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
