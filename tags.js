// 简易标签筛选：从 tags.json 读取标签与站点映射，并在页面注入标签工具条
(function () {
  function closestCard(el) {
    var n = el;
    for (var i = 0; i < 6 && n; i++) {
      var cls = (n.className || '').toString();
      if (/xe-widget|col-|panel|card|item/.test(cls)) return n;
      n = n.parentElement;
    }
    return el;
  }

  function injectStyles() {
    var css = `
    #tag-bar { position: sticky; top: 0; z-index: 9999; background: rgba(255,255,255,0.95); backdrop-filter: saturate(180%) blur(6px); padding: 8px 12px; border-bottom: 1px solid #eee; }
    #tag-bar .tag { display: inline-block; margin: 4px 6px; padding: 4px 10px; border-radius: 16px; background: #f2f3f5; color: #333; cursor: pointer; font-size: 12px; }
    #tag-bar .tag.active { background: #4a90e2; color: #fff; }
    #tag-bar .title { font-weight: 600; margin-right: 8px; }
    `;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildBar(tags) {
    var bar = document.createElement('div');
    bar.id = 'tag-bar';
    var title = document.createElement('span');
    title.className = 'title';
    title.textContent = '标签筛选:';
    bar.appendChild(title);
    var all = document.createElement('span');
    all.className = 'tag active';
    all.textContent = '全部';
    all.dataset.tag = '__ALL__';
    bar.appendChild(all);
    tags.forEach(function (t) {
      var span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      span.dataset.tag = t;
      bar.appendChild(span);
    });
    return bar;
  }

  function main() {
    injectStyles();
    fetch('tags.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var sites = data.sites || [];
        var tagSet = new Set(data.tags || []);
        var urlToTags = new Map();
        sites.forEach(function (s) {
          if (s.url) urlToTags.set(s.url, s.tags || []);
        });

        // 标注页面中每个外链元素
        var anchors = Array.prototype.slice.call(document.querySelectorAll('a[href^="http"]'));
        anchors.forEach(function (a) {
          var tags = urlToTags.get(a.getAttribute('href')) || [];
          if (tags.length) {
            a.dataset.tags = tags.join(',');
            a.dataset.site = 'true';
          }
        });

        // 构建标签工具条
        var tags = Array.from(tagSet).sort();
        var bar = buildBar(tags);
        var container = document.body;
        container.insertBefore(bar, container.firstChild);

        function selectTag(tag) {
          // 更新激活状态
          bar.querySelectorAll('.tag').forEach(function (el) {
            el.classList.toggle('active', el.dataset.tag === tag);
          });
          // 筛选
          anchors.forEach(function (a) {
            var card = closestCard(a);
            var itemTags = (a.dataset.tags || '').split(',').filter(Boolean);
            if (tag === '__ALL__') {
              card.style.display = '';
            } else {
              card.style.display = itemTags.includes(tag) ? '' : 'none';
            }
          });
        }

        bar.addEventListener('click', function (e) {
          var t = e.target;
          if (t.classList.contains('tag')) {
            selectTag(t.dataset.tag);
          }
        });
      })
      .catch(function (err) {
        console.warn('标签功能初始化失败:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();