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
    if (id === 'ph') loadCoolProp();
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

// ---------- DIAGRAMMA p-h ----------
let Module = null;        // istanza CoolProp
let coolpropLoading = false;
let phChart = null;

function loadCoolProp() {
  if (Module || coolpropLoading) return;
  coolpropLoading = true;
  const status = document.getElementById('phStatus');
  const script = document.createElement('script');
  script.src = 'coolprop.js';
  script.onload = () => {
    // coolprop.js espone una factory globale: la inizializziamo
    if (typeof createModule === 'function') {
      createModule().then(m => { Module = m; onCoolPropReady(); });
    } else if (typeof Module === 'object' && Module.PropsSI) {
      onCoolPropReady();
    } else {
      // fallback: la build classica popola window.Module dopo onRuntimeInitialized
      const t = setInterval(() => {
        if (window.Module && window.Module.PropsSI) {
          Module = window.Module; clearInterval(t); onCoolPropReady();
        }
      }, 200);
    }
  };
  script.onerror = () => {
    status.innerHTML = '⚠️ Impossibile caricare <code>coolprop.js</code>. ' +
      'Verifica che i file <code>coolprop.js</code> e <code>coolprop.wasm</code> ' +
      'siano nella radice del sito e che la pagina sia aperta online (non in locale).';
  };
  document.head.appendChild(script);
}

function onCoolPropReady() {
  document.getElementById('phStatus').innerHTML =
    '✅ Libreria termodinamica pronta. Modifica i parametri per aggiornare il ciclo.';
  calcPh();
}

// PropsSI: pressioni in Pa, temperature in K, entalpie in J/kg
function PropsSI(out, n1, v1, n2, v2, fluid) {
  return Module.PropsSI(out, n1, v1, n2, v2, fluid);
}

function calcPh() {
  if (!Module) return;
  const fluid = document.getElementById('ph_fluid').value;
  const pe = parseFloat(document.getElementById('ph_pe').value) * 1e5;   // bar -> Pa
  const pc = parseFloat(document.getElementById('ph_pc').value) * 1e5;
  const sh = parseFloat(document.getElementById('ph_sh').value);
  const sc = parseFloat(document.getElementById('ph_sc').value);
  const eta = parseFloat(document.getElementById('ph_eta').value);
  const load = parseFloat(document.getElementById('ph_load').value) * 1000; // kW -> W

  const resEl = document.getElementById('phResult');
  const ptsEl = document.getElementById('phPoints');

  if ([pe,pc,sh,sc,eta,load].some(isNaN) || pe <= 0 || pc <= pe) {
    resEl.innerHTML = '⚠️ Controlla i dati: la pressione di condensazione deve essere maggiore di quella di evaporazione.';
    return;
  }

  try {
    // temperature di saturazione alle due pressioni
    const Tevap = PropsSI('T','P',pe,'Q',1,fluid);   // K
    const Tcond = PropsSI('T','P',pc,'Q',0,fluid);

    // PUNTO 1: aspirazione compressore (uscita evaporatore + surriscaldamento)
    const T1 = Tevap + sh;
    const h1 = PropsSI('H','P',pe,'T',T1,fluid);
    const s1 = PropsSI('S','P',pe,'T',T1,fluid);

    // PUNTO 2: mandata compressore. Isentropico fino a pc, poi correzione rendimento
    const h2s = PropsSI('H','P',pc,'S',s1,fluid);
    const h2 = h1 + (h2s - h1) / eta;
    const T2 = PropsSI('T','P',pc,'H',h2,fluid);

    // PUNTO 3: uscita condensatore (liquido sottoraffreddato)
    const T3 = Tcond - sc;
    const h3 = PropsSI('H','P',pc,'T',T3,fluid);

    // PUNTO 4: dopo laminazione isentalpica
    const h4 = h3;            // valvola: h costante
    const T4 = Tevap;        // alla pressione di evaporazione

    // GRANDEZZE DEL CICLO
    const q_evap = h1 - h4;             // resa frigorifera specifica J/kg
    const w_comp = h2 - h1;             // lavoro specifico J/kg
    const q_cond = h2 - h3;             // calore ceduto specifico J/kg
    const mdot = load / q_evap;         // portata massica kg/s (da carico noto)
    const P_comp = mdot * w_comp;       // potenza compressore W
    const COP_freddo = q_evap / w_comp;
    const COP_caldo = q_cond / w_comp;
    const Q_cond_tot = mdot * q_cond;   // potenza al condensatore W

    resEl.innerHTML =
      `Portata massica: <strong>${(mdot*1000).toFixed(1)}</strong> g/s ` +
      `(${(mdot*3600).toFixed(2)} kg/h)<br>` +
      `Potenza compressore: <strong>${(P_comp/1000).toFixed(2)}</strong> kW<br>` +
      `Potenza al condensatore: <strong>${(Q_cond_tot/1000).toFixed(2)}</strong> kW<br>` +
      `EER (raffrescamento): <strong>${COP_freddo.toFixed(2)}</strong><br>` +
      `COP (riscaldamento): <strong>${COP_caldo.toFixed(2)}</strong>`;

    ptsEl.innerHTML =
      `1 — aspiraz: ${(pe/1e5).toFixed(2)} bar, ${(T1-273.15).toFixed(1)}°C, h=${(h1/1000).toFixed(1)} kJ/kg<br>` +
      `2 — mandata: ${(pc/1e5).toFixed(2)} bar, ${(T2-273.15).toFixed(1)}°C, h=${(h2/1000).toFixed(1)} kJ/kg<br>` +
      `3 — liquido: ${(pc/1e5).toFixed(2)} bar, ${(T3-273.15).toFixed(1)}°C, h=${(h3/1000).toFixed(1)} kJ/kg<br>` +
      `4 — post-valvola: ${(pe/1e5).toFixed(2)} bar, ${(T4-273.15).toFixed(1)}°C, h=${(h4/1000).toFixed(1)} kJ/kg`;

    drawPhChart(fluid, pe, pc, [
      { h: h1, p: pe }, { h: h2, p: pc }, { h: h3, p: pc }, { h: h4, p: pe }
    ]);
  } catch (e) {
    resEl.innerHTML = '⚠️ Errore nel calcolo: ' + e.message;
  }
}

function buildSaturationDome(fluid) {
  // costruisce le curve liquido saturo (Q=0) e vapore saturo (Q=1)
  const Tmin = PropsSI('Ttriple','T',0,'T',0,fluid) || PropsSI('T','P',1e4,'Q',0,fluid);
  const Tcrit = PropsSI('Tcrit','T',0,'T',0,fluid);
  const liq = [], vap = [];
  const start = Math.max(Tmin, Tcrit - 120);
  for (let T = start; T < Tcrit - 0.5; T += (Tcrit - start) / 60) {
    try {
      const hl = PropsSI('H','T',T,'Q',0,fluid) / 1000;
      const hv = PropsSI('H','T',T,'Q',1,fluid) / 1000;
      const p = PropsSI('P','T',T,'Q',0,fluid) / 1e5;
      liq.push({ x: hl, y: p });
      vap.push({ x: hv, y: p });
    } catch (e) { /* salta punti fuori range */ }
  }
  return liq.concat(vap.reverse());
}

function drawPhChart(fluid, pe, pc, cyclePts) {
  const dome = buildSaturationDome(fluid);
  // chiudi il ciclo: 1->2->3->4->1, in kJ/kg e bar
  const cycle = cyclePts.map(p => ({ x: p.h/1000, y: p.p/1e5 }));
  cycle.push(cycle[0]);

  const data = {
    datasets: [
      {
        label: 'Cupola di saturazione', data: dome,
        borderColor: '#4ea3ff', borderWidth: 2, pointRadius: 0,
        showLine: true, fill: false, tension: 0,
      },
      {
        label: 'Ciclo', data: cycle,
        borderColor: '#38e1c4', backgroundColor: '#38e1c4',
        borderWidth: 2.5, pointRadius: 4, showLine: true, tension: 0,
      }
    ]
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { type: 'linear', title: { display: true, text: 'Entalpia (kJ/kg)', color: '#9bb3c7' },
        ticks: { color: '#9bb3c7' }, grid: { color: '#244c6e' } },
      y: { type: 'logarithmic', title: { display: true, text: 'Pressione (bar)', color: '#9bb3c7' },
        ticks: { color: '#9bb3c7' }, grid: { color: '#244c6e' } }
    },
    plugins: { legend: { labels: { color: '#eaf2f8' } } }
  };

  if (phChart) { phChart.data = data; phChart.options = opts; phChart.update(); }
  else {
    const ctx = document.getElementById('phChart');
    ctx.parentElement.style.height = '340px';
    phChart = new Chart(ctx, { type: 'scatter', data, options: opts });
  }
}

['ph_fluid','ph_pe','ph_pc','ph_sh','ph_sc','ph_eta','ph_load'].forEach(id => {
  document.getElementById(id).addEventListener('input', calcPh);
});
