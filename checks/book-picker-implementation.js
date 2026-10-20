/* 词书显示顺序独立于学习队列；只存词书 ID，取消编辑不写入数据库。 */
function defaultBookPickerOrder() {
  return Object.keys(DB.custom || {}).map(function (k) { return "@" + k; })
    .concat(BOOKS.map(function (b) { return b.id; }), ["__fav", "__hard", "__mastered", "__new"]);
}
function normalizeBookPickerOrder(saved) {
  var all = defaultBookPickerOrder();
  if (!Array.isArray(saved) || !saved.length) return all;
  var seen = Object.create(null);
  var ordered = saved.filter(function (id) {
    if (typeof id !== "string" || all.indexOf(id) < 0 || seen[id]) return false;
    seen[id] = true;
    return true;
  });
  /* 新导入的自定义词书自动放在前面，已有词书的相对顺序不变。 */
  var added = all.filter(function (id) { return !seen[id]; });
  return added.filter(function (id) { return id.charAt(0) === "@"; })
    .concat(ordered, added.filter(function (id) { return id.charAt(0) !== "@"; }));
}
function moveBookPickerItem(order, id, action) {
  var next = order.slice();
  var from = next.indexOf(id);
  if (from < 0 || ["top", "up", "down"].indexOf(action) < 0) return next;
  var to = action === "top" ? 0 : from + (action === "up" ? -1 : 1);
  if (to < 0 || to >= next.length || to === from) return next;
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}
function bookPickerCategory(id) {
  return id.charAt(0) === "@" ? "自定义词书" : (bookMeta(id).cat || "我的");
}
function showBookPicker() {
  var h = '<p class="tiny faint" style="margin:0 0 14px">自定义词书默认排在最前；点击“调整顺序”可排列所有词书。</p><div class="grid g2 book-picker-grid" style="gap:8px">';
  normalizeBookPickerOrder(DB.bookPickerOrder).forEach(function (id) {
    var b = bookMeta(id); var s = statsOf(id);
    h += '<button class="bookcard' + (DB.book === id ? " cur" : "") + '" data-book="' + esc(id) + '">' +
      '<div class="tiny faint">' + esc(bookPickerCategory(id)) + '</div>' +
      '<div class="bt">' + esc(b.name) + '</div><div class="bd">' + esc(b.desc || "") + '</div>' +
      '<div class="pbar"><i style="width:' + (s.total ? Math.round(s.seen / s.total * 100) : 0) + '%"></i></div>' +
      '<div class="meta"><span>' + fmtNum(s.total) + ' 词</span><span>已学 ' + fmtNum(s.seen) + '</span></div></button>';
  });
  h += '</div>';
  openModal("选择词书", h, '<button class="btn book-picker-footer" id="bookSortEdit">调整顺序</button><button class="btn" id="mClose2">关闭</button>', function (m) {
    $("mClose2").onclick = closeModal;
    $("bookSortEdit").onclick = showBookOrderEditor;
    m.querySelectorAll("[data-book]").forEach(function (b) {
      b.onclick = function () {
        DB.book = b.getAttribute("data-book");
        TAGS = {}; BOWN = {}; save(true); closeModal(); render();
        toast("已切换到「" + (bookMeta(DB.book) || {}).name + "」", "ok");
      };
    });
  }, true);
}
function showBookOrderEditor() {
  var draft = normalizeBookPickerOrder(DB.bookPickerOrder);
  function rowsHTML() {
    return draft.map(function (id, i) {
      var b = bookMeta(id);
      var controls = [["top", "置顶"], ["up", "上移"], ["down", "下移"]].map(function (a) {
        var disabled = a[0] === "down" ? i === draft.length - 1 : i === 0;
        return '<button class="btn" data-sort-id="' + esc(id) + '" data-sort-action="' + a[0] + '" aria-label="' + esc(b.name + '：' + a[1]) + '"' + (disabled ? ' disabled' : '') + '>' + a[1] + '</button>';
      }).join("");
      return '<div class="book-sort-row"><span class="book-sort-number">' + (i + 1) + '</span><div class="book-sort-info"><b>' + esc(b.name) + '</b><span class="tiny faint">' + esc(bookPickerCategory(id)) + '</span></div><div class="book-sort-actions">' + controls + '</div></div>';
    }).join("");
  }
  function bindRows() {
    $("bookSortRows").querySelectorAll("[data-sort-action]").forEach(function (button) {
      button.onclick = function () {
        var id = button.getAttribute("data-sort-id");
        var action = button.getAttribute("data-sort-action");
        draft = moveBookPickerItem(draft, id, action);
        $("bookSortRows").innerHTML = rowsHTML();
        bindRows();
        var buttons = $("bookSortRows").querySelectorAll("[data-sort-action]");
        for (var i = 0; i < buttons.length; i++) {
          var b = buttons[i];
          if (b.getAttribute("data-sort-id") === id && b.getAttribute("data-sort-action") === action) {
            b.parentNode.parentNode.scrollIntoView({ block: "nearest" });
            var focusTarget = b.disabled ? b.parentNode.querySelector("button:not(:disabled)") : b;
            if (focusTarget) focusTarget.focus({ preventScroll: true });
            break;
          }
        }
      };
    });
  }
  openModal("调整词书顺序", '<p class="tiny faint" style="margin:0 0 10px">用“置顶 / 上移 / 下移”调整所有词书。保存后生效，不影响学习进度和书内单词顺序。</p><div id="bookSortRows">' + rowsHTML() + '</div>',
    '<button class="btn book-picker-footer" id="bookSortReset">恢复默认</button><button class="btn" id="bookSortCancel">取消</button><button class="btn primary" id="bookSortSave">保存顺序</button>', function () {
      bindRows();
      $("bookSortCancel").onclick = showBookPicker;
      $("bookSortReset").onclick = function () {
        draft = defaultBookPickerOrder();
        $("bookSortRows").innerHTML = rowsHTML();
        bindRows();
        $("modal").querySelector(".modal-b").scrollTop = 0;
        toast("已恢复默认排列，点击“保存顺序”后生效", "ok");
      };
      $("bookSortSave").onclick = function () {
        DB.bookPickerOrder = normalizeBookPickerOrder(draft);
        save(true);
        showBookPicker();
        if (storageOK) toast("词书顺序已保存", "ok");
      };
    }, true);
}
