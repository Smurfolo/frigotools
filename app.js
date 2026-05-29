// ---------- NAVIGAZIONE TRA MODULI ----------
const navItems = document.querySelectorAll('.nav-item');
const modules = document.querySelectorAll('.module');
const moduleTitle = document.getElementById('moduleTitle');
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menuToggle');

navItems.forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.module;
    navItems.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    modules.forEach(m => m.classList.remove('active'));
    document.getElementById('module-' + id).classList.add('active');
    moduleTitle.textContent = btn.textContent;
    sidebar.classList.remove('open');
    if (id === 'curva') drawCurva();
  });
});

menuToggle?.addEventListener('click', () => sidebar.classList.toggle('open'));

// ---------- CURVA CLIMATICA ----------
const curvaInputs = ['text_min','tmand_max','text_max','tmand_min','text_check'];
let curvaChart = null;

function calcMandata(text, tMin, mMax, tMax, mMin) {
  // interpolazione lineare tra (tMin, mMax) e (tMax, mMin)
  if (tMax === tMin) return mMax;
  let m = mMax + (text - tMin) * (mMin - mMax) / (tMax - tMin);
  // clamp tra i due valori di mandata
  const hi = Math.max(mMax, mMin), lo = Math.min(mMax, mMin);
  return Math.min(hi, Math.max(lo, m));
}

function drawCurva() {
  const tMin = parseFloat(document.getElementById('text_min').value);
  const mMax = parseFloat(document.getElementById('tmand_max').value);
  const tMax = parseFloat(document.getElementById('text_max').value);
  const mMin = parseFloat(document.getElementById('tmand_min').value);
  const tCheck = parseFloat(document.getElementById('text_check').value);

  if ([tMin,mMax,tMax,mMin].some(isNaN)) return;

  // punti del grafico
  const pts = [];
  const start = Math.min(tMin, tMax), end = Math.max(tMin, tMax);
  for (let t = start; t <= end + 0.001; t += 0.5) {
    pts.push({ x: t, y: calcMandata(t, tMin, mMax, tMax, mMin) });
  }

  // risultato verifica
  const resEl = document.getElementById('curvaResult');
  if (!isNaN(tCheck)) {
    const m = calcMandata(tCheck, tMin, mMax, tMax, mMin);
    resEl.innerHTML = `A <strong>${tCheck}°C</strong> esterni la mandata è <strong>${m.toFixed(1)}°C</strong>`;
  } else {
    resEl.textContent = '—';
  }

  const data = {
    datasets: [
      {
        label: 'Curva di mandata',
        data: pts,
        borderColor: '#38e1c4',
        backgroundColor: 'rgba(56,225,196,.12)',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0,
        fill: true,
      },
      {
        label: 'Punto verificato',
        data: isNaN(tCheck) ? [] : [{ x: tCheck, y: calcMandata(tCheck, tMin, mMax, tMax, mMin) }],
        borderColor: '#4ea3ff',
        backgroundColor: '#4ea3ff',
        pointRadius: 6,
        showLine: false,
      }
    ]
  };

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Temp. esterna (°C)', color: '#9bb3c7' },
        ticks: { color: '#9bb3c7' },
        grid: { color: '#244c6e' },
      },
      y: {
        title: { display: true, text: 'Temp. mandata (°C)', color: '#9bb3c7' },
        ticks: { color: '#9bb3c7' },
        grid: { color: '#244c6e' },
      }
    },
    plugins: { legend: { labels: { color: '#eaf2f8' } } }
  };

  if (curvaChart) {
    curvaChart.data = data;
    curvaChart.options = opts;
    curvaChart.update();
  } else {
    const ctx = document.getElementById('curvaChart');
    ctx.parentElement.style.height = '320px';
    curvaChart = new Chart(ctx, { type: 'line', data, options: opts });
  }
}

curvaInputs.forEach(id => {
  document.getElementById(id).addEventListener('input', drawCurva);
});

// ---------- CONVERSIONI ----------
function bindConv(ids, fromBase, toBase) {
  // fromBase: converte il valore digitato nell'unità base
  // toBase: oggetto {id: fn(base)} per riempire gli altri
  ids.forEach(srcId => {
    document.getElementById(srcId).addEventListener('input', () => {
      const v = parseFloat(document.getElementById(srcId).value);
      if (isNaN(v)) return;
      const base = fromBase[srcId](v);
      Object.keys(toBase).forEach(tid => {
        if (tid !== srcId) document.getElementById(tid).value = +toBase[tid](base).toFixed(4);
      });
    });
  });
}

// pressione — base = bar
bindConv(['conv_bar','conv_psi','conv_kpa'],
  { conv_bar: v=>v, conv_psi: v=>v/14.5037738, conv_kpa: v=>v/100 },
  { conv_bar: b=>b, conv_psi: b=>b*14.5037738, conv_kpa: b=>b*100 });

// temperatura — base = °C
bindConv(['conv_c','conv_f','conv_k'],
  { conv_c: v=>v, conv_f: v=>(v-32)*5/9, conv_k: v=>v-273.15 },
  { conv_c: b=>b, conv_f: b=>b*9/5+32, conv_k: b=>b+273.15 });

// potenza — base = kW
bindConv(['conv_kw','conv_frig','conv_btu'],
  { conv_kw: v=>v, conv_frig: v=>v/859.845, conv_btu: v=>v/3412.142 },
  { conv_kw: b=>b, conv_frig: b=>b*859.845, conv_btu: b=>b*3412.142 });

// ---------- COP / EER ----------
function calcCop() {
  const resa = parseFloat(document.getElementById('cop_resa').value);
  const pel = parseFloat(document.getElementById('cop_pel').value);
  const el = document.getElementById('copResult');
  if (isNaN(resa) || isNaN(pel) || pel === 0) { el.textContent = '—'; return; }
  el.innerHTML = `COP / EER = <strong>${(resa/pel).toFixed(2)}</strong>`;
}
['cop_resa','cop_pel'].forEach(id => document.getElementById(id).addEventListener('input', calcCop));

// ---------- INIT ----------
window.addEventListener('load', () => {
  drawCurva();
  calcCop();
  // popola conversioni iniziali
  document.getElementById('conv_bar').dispatchEvent(new Event('input'));
  document.getElementById('conv_c').dispatchEvent(new Event('input'));
  document.getElementById('conv_kw').dispatchEvent(new Event('input'));
});
