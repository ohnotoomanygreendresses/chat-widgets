/*
 * chat-widgets
 * Card picker and follow-up buttons rendered inside chat widgets.
 * The chat passes in its data at call time; this file holds only layout and behavior.
 *
 *   startCard(raw, root)      raw = { cards: [...rows], list: [...rows], pending: [{title, target}] }
 *   afterCreation(title, root)
 *
 * Both rely on the host-provided global sendPrompt(text).
 */
(function () {
  'use strict';

  var FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';

  var CSS_START = `
.sc{font-family:Pretendard,var(--font-sans);padding:.5rem 0 1rem}
.sc .sh{font-size:12px;font-weight:500;color:var(--text-secondary);margin:20px 2px 10px}
.sc .lb{font-size:12px;font-weight:500;color:var(--text-secondary);margin:0 2px 6px}
.sc .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.sc .c,.sc .row{all:unset;box-sizing:border-box;cursor:pointer;text-align:left;border-radius:14px}
.sc .c{display:flex;flex-direction:column;gap:4px;border:0.5px solid var(--border-strong);background:var(--surface-2);padding:14px}
.sc .row{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;border:0.5px dashed var(--border-stronger);padding:12px 14px;margin-bottom:8px}
.sc .c:hover,.sc .row:hover{border-color:var(--border-stronger)}
.sc button:disabled{opacity:.45;cursor:default}
.sc .k{font-size:11px;font-weight:500;color:var(--text-secondary)}
.sc .k.acc{color:var(--fill-brand)}
.sc .nm{font-size:15px;font-weight:500;line-height:1.35;color:var(--text-primary);word-break:keep-all;overflow-wrap:anywhere}
.sc .st{font-size:12px;color:var(--text-muted)}
.sc .row>.st{white-space:nowrap}
.sc .col{display:flex;flex-direction:column;gap:4px;min-width:0}
.sc .bar{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.sc .back{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:var(--radius);color:var(--text-secondary);font-size:18px}
.sc .back:hover{background:var(--surface-1)}
.sc .t{font-size:16px;font-weight:500}
.sc .q{font-size:15px;font-weight:500;margin:0 2px 2px}
.sc .qs{font-size:12px;color:var(--text-muted);margin:0 2px 12px}
.sc textarea{width:100%;box-sizing:border-box;font:inherit;font-size:15px;line-height:1.6;padding:10px 12px;border-radius:12px;resize:vertical}
.sc #hc{min-height:48px}
.sc #fc{min-height:96px}
.sc .go{margin-top:10px}
.sc .msg{font-size:13px;color:var(--text-secondary);margin:12px 2px 0;min-height:18px}
.sc .hide{display:none}
`;

  var CSS_AFTER = `
.ac{font-family:Pretendard,var(--font-sans);padding:.25rem 0 .5rem}
.ac .acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ac .sv{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
.ac .sv select{width:auto}
.ac .sv input{flex:1;min-width:180px}
.ac button:disabled,.ac select:disabled,.ac input:disabled{opacity:.45;cursor:default}
.ac textarea{width:100%;box-sizing:border-box;min-height:88px;font:inherit;font-size:15px;line-height:1.6;padding:10px 12px;border-radius:12px;margin-top:12px;resize:vertical}
.ac .err{font-size:13px;color:var(--text-danger);margin:4px 2px 0}
.ac .rs{margin-top:8px}
.ac .msg{font-size:13px;color:var(--text-secondary);margin:10px 2px 0;min-height:18px}
.ac .hide{display:none}
`;

  var AFTER_HTML = `
<div class="ac">
<div class="acts">
<button type="button" id="rx">반응 기록</button>
<button type="button" id="fu">분기·후속 제안 ↗</button>
</div>
<div id="rxbox" class="hide"><textarea id="rxt" placeholder="읽고 난 느낌을 적어 주세요. 어느 편인지 적어도 됩니다"></textarea><div class="err" id="rxe"></div><button type="button" class="rs" id="rxs">반응 보내기 ↗</button></div>
<div class="sv"><select id="ef" aria-label="추론 수준"><option>low</option><option>medium</option><option>high</option><option>xhigh</option><option selected>max</option></select><input id="si" type="text" placeholder="비우면 이 세션의 산출물 모두 저장" aria-label="저장 지시"><button type="button" id="sb">저장 ↗</button></div>
<div class="msg" id="msg"></div>
</div>`;

  function head() { return document.head || document.documentElement; }

  function addFont() {
    if (document.getElementById('wg-font')) return;
    var l = document.createElement('link');
    l.id = 'wg-font'; l.rel = 'stylesheet'; l.href = FONT;
    head().appendChild(l);
  }

  function addCss(id, css) {
    if (document.getElementById(id)) return;
    var s = document.createElement('style');
    s.id = id; s.textContent = css;
    head().appendChild(s);
  }

  function el(t, c, x) {
    var e = document.createElement(t);
    if (c) e.className = c;
    if (x != null) e.textContent = x;
    return e;
  }

  function post(text) {
    if (typeof window.sendPrompt === 'function') window.sendPrompt(text);
  }

  // Turns raw query rows into the shape the picker renders.
  // cards: rows with 이름/유형/소속/단계. list: rows with 이름/종류/상위 설정.
  // Already-shaped data (with a settings array) passes through untouched.
  function shape(raw) {
    raw = raw || {};
    if (Array.isArray(raw.settings)) return raw;
    var rows = raw.cards || [], list = raw.list || [];
    var cards = rows.map(function (r) {
      return { type: r['유형'], name: r['이름'], group: r['소속'] || null, steps: r['단계'] || '없음' };
    });
    var starts = cards.filter(function (c) { return c.type !== '재사용'; });
    var reuse = cards
      .filter(function (c) { return c.type === '재사용'; })
      .map(function (c, i) { return [c, i]; })
      .sort(function (a, b) {
        var g = (a[0].group || '').localeCompare(b[0].group || '', 'ko');
        return g || a[1] - b[1];
      })
      .map(function (x) { return x[0]; });
    var settings = list
      .filter(function (r) { return r['종류'] === '설정'; })
      .map(function (s) {
        return {
          name: s['이름'],
          phases: list
            .filter(function (p) { return p['종류'] === '국면' && p['상위 설정'] === s['이름']; })
            .map(function (p) { return p['이름']; })
        };
      });
    return { cards: starts.concat(reuse), settings: settings, pending: raw.pending || [] };
  }

  function startCard(raw, root) {
    root = root || document.body;
    addFont();
    addCss('wg-start', CSS_START);
    var DATA = shape(raw);

    root.textContent = '';
    var sc = el('div', 'sc');
    var home = el('div');
    var hc = el('textarea');
    hc.id = 'hc';
    hc.placeholder = '예: 8천 자 내외로 / 옵션을 6개 제시';
    var cards = el('div');
    home.append(el('div', 'lb', '덧붙일 조건 (선택)'), hc, cards);
    var flow = el('div', 'hide');
    var msg = el('div', 'msg');
    sc.append(home, flow, msg);
    root.append(sc);

    var sent = false, F = null;

    function cond(v) {
      v = (v == null ? hc.value : v).trim();
      return v ? '조건: ' + v : '';
    }
    function send(parts) {
      if (sent) return;
      sent = true;
      sc.querySelectorAll('button,textarea').forEach(function (b) { b.disabled = true; });
      msg.textContent = '보냈습니다';
      post(parts.filter(Boolean).join(' · '));
    }
    function card(k, acc, nm, st, fn) {
      var b = el('button', 'c');
      b.type = 'button';
      if (k) b.append(el('span', 'k' + (acc ? ' acc' : ''), k));
      b.append(el('span', 'nm', nm));
      if (st) b.append(el('span', 'st', st));
      b.onclick = fn;
      return b;
    }
    function stepText(s) {
      return s === '설정·국면·조건' ? '설정 → 국면 → 조건' : s === '조건' ? '조건 입력' : '바로 시작 ↗';
    }
    function pick(c) {
      if (c.steps === '설정·국면·조건') { F = { c: c, step: 1, set: null, ph: null }; renderFlow(); }
      else if (c.steps === '조건') { F = { c: c, step: 3, set: null, ph: null }; renderFlow(); }
      else send(['시작 카드', c.name, cond()]);
    }
    function renderHome() {
      cards.replaceChildren();
      function sh(x) { cards.append(el('div', 'sh', x)); }
      var starts = DATA.cards.filter(function (c) { return c.type !== '재사용'; });
      var reuse = DATA.cards.filter(function (c) { return c.type === '재사용'; });
      var g;
      if (starts.length) {
        sh('시작 카드');
        g = el('div', 'grid');
        starts.forEach(function (c) { g.append(card(c.type, true, c.name, stepText(c.steps), function () { pick(c); })); });
        cards.append(g);
      }
      if (DATA.pending.length) {
        sh('기획 대기');
        DATA.pending.forEach(function (p) {
          var b = el('button', 'row');
          b.type = 'button';
          var l = el('span', 'col');
          l.append(el('span', 'nm', p.title));
          if (p.target) l.append(el('span', 'st', p.target));
          b.append(l, el('span', 'st', '바로 시작 ↗'));
          b.onclick = function () { send(['시작 카드', '기획 대기', p.title, cond()]); };
          cards.append(b);
        });
      }
      if (reuse.length) {
        sh('재사용 프롬프트');
        g = el('div', 'grid');
        reuse.forEach(function (c) {
          g.append(card(c.group || '', false, c.name, c.steps === '없음' ? '바로 시작 ↗' : '고르고 시작', function () { pick(c); }));
        });
        cards.append(g);
      }
      if (!starts.length && !DATA.pending.length && !reuse.length) cards.append(el('div', 'st', '보여 줄 카드가 없습니다'));
    }
    function renderFlow() {
      home.classList.add('hide');
      flow.classList.remove('hide');
      flow.replaceChildren();
      var bar = el('div', 'bar'), bk = el('button', 'back');
      bk.type = 'button';
      bk.setAttribute('aria-label', '뒤로');
      bk.innerHTML = '<i class="ti ti-arrow-left" aria-hidden="true"></i>';
      bk.onclick = back;
      bar.append(bk, el('span', 't', F.c.name));
      flow.append(bar);
      var g;
      if (F.step === 1) {
        flow.append(el('div', 'q', '어느 설정으로 쓸까요'), el('div', 'qs', '노션 「선택 목록」에서 활성인 것만 보입니다'));
        g = el('div', 'grid');
        DATA.settings.forEach(function (s) {
          g.append(card(s.phases.length ? '국면 ' + s.phases.length : '국면 없음', false, s.name, '', function () {
            F.set = s; F.ph = null; F.step = s.phases.length ? 2 : 3; renderFlow();
          }));
        });
        flow.append(g);
      } else if (F.step === 2) {
        flow.append(el('div', 'q', '어느 국면으로 쓸까요'), el('div', 'qs', F.set.name));
        g = el('div', 'grid');
        F.set.phases.forEach(function (p) {
          g.append(card('', false, p, '', function () { F.ph = p; F.step = 3; renderFlow(); }));
        });
        flow.append(g);
      } else {
        flow.append(
          el('div', 'q', '조건이 있으면 적어 주세요'),
          el('div', 'qs', [F.set && F.set.name, F.ph].filter(Boolean).join(' · ') || '비워 두어도 됩니다')
        );
        var ta = el('textarea');
        ta.id = 'fc';
        ta.placeholder = '비워 두면 조건 없이 보냅니다';
        ta.value = hc.value;
        flow.append(ta);
        var go = el('button', 'go', '보내기 ↗');
        go.type = 'button';
        go.onclick = function () { send(['시작 카드', F.c.name, F.set && F.set.name, F.ph, cond(ta.value)]); };
        flow.append(go);
      }
    }
    function back() {
      if (F.step === 3 && F.c.steps === '설정·국면·조건') { F.step = F.set && F.set.phases.length ? 2 : 1; renderFlow(); }
      else if (F.step === 2) { F.step = 1; renderFlow(); }
      else { F = null; flow.classList.add('hide'); home.classList.remove('hide'); }
    }

    renderHome();
  }

  function afterCreation(title, root) {
    root = root || document.body;
    addFont();
    addCss('wg-after', CSS_AFTER);
    root.innerHTML = AFTER_HTML;
    var $ = function (i) { return root.querySelector('#' + i); };
    var msg = $('msg');
    function send(t, b, n) { b.disabled = true; msg.textContent = n; post(t); }
    $('rx').onclick = function () { $('rxbox').classList.remove('hide'); $('rxt').focus(); };
    $('rxt').oninput = function () { $('rxe').textContent = ''; };
    $('rxs').onclick = function () {
      var v = $('rxt').value.trim();
      if (!v) { $('rxe').textContent = '반응을 먼저 적어 주세요'; return; }
      $('rx').disabled = true;
      $('rxt').disabled = true;
      send('창작 후 · 반응 기록 · ' + title + '\n' + v, $('rxs'), '반응을 보냈습니다');
    };
    $('fu').onclick = function () { send('창작 후 · 분기·후속 제안 · ' + title, $('fu'), '분기·후속 제안을 요청했습니다'); };
    $('sb').onclick = function () {
      var v = $('si').value.trim();
      $('ef').disabled = true;
      $('si').disabled = true;
      send('창작 후 · 저장 · ' + $('ef').value + (v ? '\n' + v : ''), $('sb'), '저장을 요청했습니다');
    };
  }

  window.startCard = startCard;
  window.afterCreation = afterCreation;
})();
