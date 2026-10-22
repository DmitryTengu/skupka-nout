/*
 * Калькулятор ориентировочной цены выкупа ноутбуков и ПК.
 *
 * Как считается цена:
 *   1. По характеристикам складывается условная вторичная рыночная цена (BYN),
 *      ориентиры взяты из объявлений на Kufar (октябрь 2026), с запасом вниз.
 *   2. Она умножается на коэффициент возраста и состояния.
 *   3. Затем применяется закупочный коэффициент (K ниже): мы платим долю от
 *      рыночной цены. Чем меньше K, тем выгоднее для скупки.
 *   4. Клиенту показывается диапазон: от 85% расчёта до 100%, округлённый вниз.
 *
 * Чтобы изменить цены, правьте числа в FIELDS и коэффициенты в K.
 */
(function (root) {
  'use strict';

  // Закупочные коэффициенты: какую долю от рыночной цены мы платим
  var K = { laptop: 0.55, apple: 0.58, pc: 0.5 };

  // Вычет за отсутствие зарядного устройства, BYN (до применения K)
  var NO_CHARGER = { win: 40, gaming: 40, apple: 80 };

  // Показываем диапазон: нижняя граница = 85% расчётной цены
  var LOW_SHARE = 0.85;
  // Ниже этой суммы показываем «до 50 BYN»
  var MIN_SHOWN = 50;
  // Максимум, который показываем клиенту (BYN). Даже у топовой техники цена не выше
  var MAX_SHOWN = 2500;

  var COND_LAPTOP = [
    ['excellent', 'Отличное: без следов использования', 1],
    ['good', 'Хорошее: мелкие потёртости', 0.92],
    ['worn', 'Заметный износ: царапины, сколы, слабая батарея', 0.8],
    ['defect', 'Есть неисправности: разбит экран, не работает клавиатура и т. п.', 0.5],
    ['dead', 'Не включается / на запчасти', 0.25]
  ];

  var COND_PC = [
    ['excellent', 'Отличное: работает без проблем', 1],
    ['good', 'Хорошее: мелкие потёртости корпуса', 0.92],
    ['worn', 'Заметный износ: царапины, пыль, шумит', 0.8],
    ['defect', 'Есть неисправности: артефакты, перегрев, не работает порт', 0.5],
    ['dead', 'Не запускается / на запчасти', 0.25]
  ];

  var CHARGER = [['yes', 'Есть', 0], ['no', 'Нет', 1]];

  var LAPTOP_RAM = [
    ['4', '4 ГБ и меньше', 0],
    ['8', '8 ГБ', 60],
    ['16', '16 ГБ', 180],
    ['32', '32 ГБ и больше', 330]
  ];

  var LAPTOP_SSD = [
    ['hdd', 'Только HDD', 0],
    ['256', 'SSD до 256 ГБ', 60],
    ['512', 'SSD 512 ГБ', 130],
    ['1024', 'SSD 1 ТБ и больше', 220]
  ];

  // key, подпись, режимы, варианты [значение, текст, число], индекс по умолчанию
  var FIELDS = [
    // ---- Ноутбук (обычный и игровой) ----
    { key: 'cpu', label: 'Процессор', modes: ['win', 'gaming'], def: 2, opts: [
      ['weak', 'Celeron / Pentium / Athlon / AMD A4–A6', 250],
      ['i3', 'Core i3 / Ryzen 3', 500],
      ['i5', 'Core i5 / Ryzen 5', 750],
      ['i7', 'Core i7 / Ryzen 7', 1000],
      ['i9', 'Core i9 / Ryzen 9', 1300]
    ] },
    { key: 'gpu', label: 'Видеокарта', modes: ['gaming'], def: 1, opts: [
      ['g1', 'GTX 1050–1650 / RX 560–580 / MX', 250],
      ['g2', 'GTX 1660 Ti / RTX 2050–2060 / RTX 3050', 500],
      ['g3', 'RTX 3060 / RTX 2070 / RTX 4050', 800],
      ['g4', 'RTX 3070 / RTX 4060 / RTX 3080', 1200],
      ['g5', 'RTX 4070 / RTX 5060 / RTX 5070', 1800],
      ['g6', 'Топ: RTX 4080 / 4090 / 5080 / 5090', 3200]
    ] },
    { key: 'ram', label: 'Оперативная память', modes: ['win', 'gaming'], def: 1, opts: LAPTOP_RAM },
    { key: 'ssd', label: 'Накопитель', modes: ['win', 'gaming'], def: 1, opts: LAPTOP_SSD },
    { key: 'age', label: 'Возраст ноутбука', modes: ['win', 'gaming'], def: 2, opts: [
      ['y2', 'До 2 лет', 1],
      ['y4', '3–4 года', 0.8],
      ['y6', '5–6 лет', 0.6],
      ['y8', '7–8 лет', 0.42],
      ['y9', '9 лет и старше', 0.28]
    ] },
    { key: 'cond', label: 'Состояние', modes: ['win', 'gaming'], def: 1, opts: COND_LAPTOP },
    { key: 'charger', label: 'Зарядное устройство', modes: ['win', 'gaming', 'apple'], def: 0, opts: CHARGER },

    // ---- MacBook ----
    { key: 'a_model', label: 'Модель', modes: ['apple'], def: 0, opts: [
      ['air', 'MacBook Air', 1],
      ['pro', 'MacBook Pro', 1.25]
    ] },
    { key: 'a_chip', label: 'Процессор / год', modes: ['apple'], def: 1, opts: [
      ['i15', 'Intel, 2015–2017', 450],
      ['i18', 'Intel, 2018–2020', 900],
      ['m1', 'Apple M1', 1500],
      ['m2', 'Apple M2', 1900],
      ['m3', 'Apple M3 и новее', 2700]
    ] },
    { key: 'a_ram', label: 'Оперативная память', modes: ['apple'], def: 0, opts: [
      ['8', '8 ГБ', 0],
      ['16', '16 ГБ', 250],
      ['32', '24 ГБ и больше', 450]
    ] },
    { key: 'a_ssd', label: 'Накопитель', modes: ['apple'], def: 0, opts: [
      ['256', '256 ГБ', 0],
      ['512', '512 ГБ', 200],
      ['1024', '1 ТБ и больше', 400]
    ] },
    { key: 'a_cond', label: 'Состояние', modes: ['apple'], def: 1, opts: COND_LAPTOP },

    // ---- Компьютер (системный блок) ----
    { key: 'p_cpu', label: 'Процессор', modes: ['pc'], def: 2, opts: [
      ['old', 'Старый: Core 2, FX, Pentium, Core i3–i7 1–4 поколения (до 2014 г.)', 100],
      ['i3', 'Core i3 5–10 поколения / Ryzen 3 1000–3000', 200],
      ['i5', 'Core i5 5–10 поколения / Ryzen 5 1000–3000', 320],
      ['i7', 'Core i7 5–10 поколения / Ryzen 7 1000–3000', 430],
      ['n5', 'Core i3–i5 11–14 поколения / Ryzen 5 5000 и новее', 520],
      ['n7', 'Core i7–i9 11–14 поколения / Ryzen 7–9 5000 и новее', 750]
    ] },
    { key: 'p_gpu', label: 'Видеокарта', modes: ['pc'], def: 0, opts: [
      ['none', 'Встроенная графика / нет видеокарты', 0],
      ['g0', 'Слабая: GT 710–1030, GTX 750–960', 60],
      ['g1', 'GTX 1050 Ti / 1650 / RX 570–580', 150],
      ['g2', 'GTX 1060 / 1660 / RTX 2060 / RX 5600', 320],
      ['g3', 'RTX 3060 / 4060 / RX 6600–6700', 750],
      ['g4', 'RTX 3070 / 4060 Ti / 3080', 1150],
      ['g5', 'RTX 4070 / 4070 Super / 5060 Ti / 5070', 1700],
      ['g6', 'Высокая: RTX 4070 Ti Super / 4080 / 5070 Ti / 5080', 2800],
      ['g7', 'Топ: RTX 4090 / 5090', 4500]
    ] },
    { key: 'p_ram', label: 'Оперативная память', modes: ['pc'], def: 1, opts: [
      ['4', '4 ГБ и меньше', 0],
      ['8', '8 ГБ', 50],
      ['16', '16 ГБ', 110],
      ['32', '32 ГБ', 220],
      ['64', '64 ГБ и больше', 400]
    ] },
    { key: 'p_ssd', label: 'Накопитель', modes: ['pc'], def: 1, opts: LAPTOP_SSD },
    { key: 'p_mon', label: 'Монитор в комплекте', modes: ['pc'], def: 0, opts: [
      ['none', 'Нет', 0],
      ['m24', 'Да, до 24″', 80],
      ['m27', 'Да, 27″ и больше', 180]
    ] },
    { key: 'p_cond', label: 'Состояние', modes: ['pc'], def: 1, opts: COND_PC }
  ];

  var MODE_LABEL = {
    win: 'Ноутбук',
    gaming: 'Игровой ноутбук',
    apple: 'MacBook',
    pc: 'Компьютер (системный блок)'
  };

  var BY_KEY = {};
  FIELDS.forEach(function (f) { BY_KEY[f.key] = f; });

  function num(key, value) {
    var f = BY_KEY[key];
    if (!f) { throw new Error('unknown field ' + key); }
    for (var i = 0; i < f.opts.length; i++) {
      if (f.opts[i][0] === value) { return f.opts[i][2]; }
    }
    throw new Error('unknown value ' + value + ' for ' + key);
  }

  // v: { cpu: 'i5', ram: '8', ... } — значения полей текущего режима
  function estimate(mode, v) {
    var m;
    if (mode === 'win' || mode === 'gaming') {
      m = num('cpu', v.cpu) + num('ram', v.ram) + num('ssd', v.ssd);
      if (mode === 'gaming') { m += num('gpu', v.gpu); }
      m = m * num('age', v.age) * num('cond', v.cond);
      if (num('charger', v.charger)) { m -= NO_CHARGER[mode]; }
      m *= K.laptop;
    } else if (mode === 'apple') {
      m = num('a_chip', v.a_chip) * num('a_model', v.a_model) + num('a_ram', v.a_ram) + num('a_ssd', v.a_ssd);
      m = m * num('a_cond', v.a_cond);
      if (num('charger', v.charger)) { m -= NO_CHARGER.apple; }
      m *= K.apple;
    } else if (mode === 'pc') {
      m = num('p_cpu', v.p_cpu) + num('p_gpu', v.p_gpu) + num('p_ram', v.p_ram) +
          num('p_ssd', v.p_ssd) + num('p_mon', v.p_mon);
      m = m * num('p_cond', v.p_cond) * K.pc;
    } else {
      throw new Error('unknown mode ' + mode);
    }
    return toRange(Math.min(Math.max(m, 0), MAX_SHOWN));
  }

  function toRange(x) {
    if (x < MIN_SHOWN) {
      return { raw: x, low: 0, high: MIN_SHOWN, small: true, text: 'до ' + MIN_SHOWN + ' BYN' };
    }
    var low = Math.floor(x * LOW_SHARE / 10) * 10;
    var high = Math.floor(x / 10) * 10;
    if (high <= low) { high = low + 10; }
    return { raw: x, low: low, high: high, small: false, text: 'от ' + fmt(low) + ' до ' + fmt(high) + ' BYN' };
  }

  function fmt(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  var api = { estimate: estimate, FIELDS: FIELDS, MODE_LABEL: MODE_LABEL, K: K };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.SkupkaCalc = api;

  // ---------- Интерфейс ----------
  if (typeof document === 'undefined') { return; }

  function init() {
    var form = document.getElementById('calc-form');
    if (!form) { return; }
    var box = document.getElementById('calc-fields');
    var result = document.getElementById('calc-result');
    var priceEl = document.getElementById('calc-price');
    var noteEl = document.getElementById('calc-note');
    var tg = document.getElementById('calc-tg');
    var shown = false;

    FIELDS.forEach(function (f) {
      var wrap = document.createElement('div');
      wrap.className = 'calc-field';
      wrap.setAttribute('data-modes', f.modes.join(' '));

      var id = 'calc-' + f.key;
      var label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = f.label;

      var sel = document.createElement('select');
      sel.id = id;
      sel.name = f.key;
      f.opts.forEach(function (o, i) {
        var opt = document.createElement('option');
        opt.value = o[0];
        opt.textContent = o[1];
        if (i === f.def) { opt.selected = true; }
        sel.appendChild(opt);
      });

      wrap.appendChild(label);
      wrap.appendChild(sel);
      box.appendChild(wrap);
    });

    function mode() {
      return form.querySelector('input[name="mode"]:checked').value;
    }

    function syncFields() {
      var m = mode();
      var wraps = box.children;
      for (var i = 0; i < wraps.length; i++) {
        var on = wraps[i].getAttribute('data-modes').split(' ').indexOf(m) !== -1;
        wraps[i].hidden = !on;
        wraps[i].querySelector('select').disabled = !on;
      }
    }

    function values() {
      var m = mode();
      var v = {};
      FIELDS.forEach(function (f) {
        if (f.modes.indexOf(m) !== -1) { v[f.key] = document.getElementById('calc-' + f.key).value; }
      });
      return v;
    }

    function summary(m) {
      var lines = [];
      FIELDS.forEach(function (f) {
        if (f.modes.indexOf(m) === -1) { return; }
        var sel = document.getElementById('calc-' + f.key);
        lines.push(f.label + ': ' + sel.options[sel.selectedIndex].textContent);
      });
      return lines;
    }

    function render() {
      var m = mode();
      var r = estimate(m, values());
      priceEl.textContent = r.text;
      noteEl.textContent = r.small
        ? 'Устройство в таком состоянии или такой комплектации оценивается недорого. Точную цену назовём после осмотра: возможно, она будет выше.'
        : 'Это ориентировочная цена. Итоговую сумму называем после осмотра и проверки устройства.';
      var msg = 'Здравствуйте! Хочу продать: ' + MODE_LABEL[m] + '.\n' +
        summary(m).join('\n') + '\nПо калькулятору на сайте: ' + r.text + '.';
      tg.href = 'https://t.me/tvoynout53?text=' + encodeURIComponent(msg);
      result.hidden = false;
      shown = true;
    }

    syncFields();

    // На телефонах прячем плавающие кнопки связи, пока форма на экране:
    // они перекрывают правый край выпадающих списков.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        document.body.classList.toggle('calc-active', entries[0].isIntersecting);
      }, { threshold: 0.05 }).observe(form);
    }

    form.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'mode') { syncFields(); }
      if (shown) { render(); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      render();
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
