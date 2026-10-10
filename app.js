'use strict';
const $ = id => document.getElementById(id);
const form = $('plan-form');
let period = 'monthly';
const yuan = value => new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 0}).format(value);
const wan = value => `${new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 2}).format(value / 10000)} 万元`;
const duration = months => `${Math.floor(months / 12)} 年${months % 12 ? ` ${months % 12} 个月` : ''}`;
function hints() {
  $('initial-hint').textContent = wan(Number($('initial').value));
  $('target-hint').textContent = wan(Number($('target').value));
  const c = Number($('contribution').value);
  $('contribution-hint').textContent = period === 'monthly' ? `每年合计 ${wan(c * 12)} · 每月末投入` : `每年合计 ${wan(c)} · 每年末投入`;
}
function renderChart(points, age) {
  const w = 700, h = 265, left = 62, right = 19, top = 18, bottom = 34;
  const maxMonth = Math.max(12, points.at(-1).month);
  const values = points.flatMap(p => [p.balance, p.goal]);
  const ceiling = Math.max(1, ...values) * 1.1;
  const x = m => left + m / maxMonth * (w - left - right);
  const y = v => h - bottom - v / ceiling * (h - top - bottom);
  const stride = Math.max(1, Math.floor(points.length / 150));
  const sampled = points.filter((p, i) => i % stride === 0 || i === points.length - 1);
  const path = key => sampled.map((p, i) => `${i ? 'L' : 'M'}${x(p.month).toFixed(2)},${y(p[key]).toFixed(2)}`).join(' ');
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = ceiling * i / 4;
    grid += `<line x1="${left}" y1="${y(v)}" x2="${w - right}" y2="${y(v)}" stroke="#e5ebe1"/><text x="${left - 9}" y="${y(v) + 4}" text-anchor="end" fill="#798878" font-size="11">${Math.round(v / 10000).toLocaleString('zh-CN')}</text>`;
  }
  for (let i = 0; i <= 4; i++) {
    const month = maxMonth * i / 4;
    grid += `<text x="${x(month)}" y="${h - 10}" text-anchor="middle" fill="#798878" font-size="11">${(age + month / 12).toFixed(1)} 岁</text>`;
  }
  const last = points.at(-1);
  $('chart').innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">资产积累与目标金额</title><desc id="chart-desc">资产从 ${yuan(points[0].balance)} 元增长至 ${yuan(last.balance)} 元，经过 ${last.month} 个月。完整数值见逐年明细。</desc><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#6eaa83" stop-opacity=".25"/><stop offset="1" stop-color="#6eaa83" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${path('balance')} L${x(last.month)},${h - bottom} L${left},${h - bottom} Z" fill="url(#area)"/><path d="${path('goal')}" fill="none" stroke="#b38c55" stroke-width="2" stroke-dasharray="6 5"/><path d="${path('balance')}" fill="none" stroke="#286e58" stroke-width="3"/><circle cx="${x(last.month)}" cy="${y(last.balance)}" r="5" fill="#286e58" stroke="#fffefb" stroke-width="2"/></svg>`;
}
function run(event) {
  event?.preventDefault();
  if (!form.reportValidity()) return;
  const input = Object.fromEntries(['age','initial','contribution','target','rate','inflation'].map(k => [k, Number($(k).value)]));
  input.period = period; input.basis = $('basis').value;
  try {
    const reverse = $('mode').value === 'rate';
    input.years = Number($('years').value);
    const result = reverse ? FinancialGoal.solveRate(input) : FinancialGoal.calculate(input), last = result.last;
    if (reverse) input.rate = result.requiredRate;
    $('error').hidden = true;
    $('result-label').textContent = result.reached ? '预计达标年龄' : '在当前假设下';
    if (reverse) {
      $('result-label').textContent = '指定期限所需名义年化收益';
      $('headline').innerHTML = `${result.requiredRate.toFixed(2)}<span> %${result.atLowerBound ? ' 或更低' : ''}</span>`;
      $('result-summary').textContent = `按当前投入计划，在 ${duration(last.month)}后的月末达到目标，需保持以上固定年化收益。${result.atLowerBound ? '当前计算下限为 −99%，在此收益率下仍可达标。' : '显示值四舍五入；图表使用未舍入的收益率。'}`;
      $('duration').textContent = `目标年龄 ${input.age + Math.floor(last.month / 12)} 岁${last.month % 12 ? ` ${last.month % 12} 个月` : ''}`;
    } else if (result.reached) {
      const totalMonths = input.age * 12 + result.months;
      $('headline').innerHTML = `${Math.floor(totalMonths / 12)}<span> 岁${totalMonths % 12 ? ` ${totalMonths % 12} 个月` : ''}</span>`;
      $('result-summary').textContent = result.months === 0 ? '你目前的初始资金已经达到目标。' : `保持这份计划，预计在 ${duration(result.months)}后的月末首次达到目标。`;
      $('duration').textContent = result.months === 0 ? '现在已达标' : `还需 ${duration(result.months)}`;
    } else {
      $('headline').innerHTML = '100 年内<span> 未达标</span>';
      $('result-summary').textContent = '当前投入与收益假设下，100 年内未达到目标。可以调整投入、收益假设或目标金额。';
      $('duration').textContent = '展示未来 100 年情景';
    }
    $('target-label').textContent = `${input.basis === 'real' ? '今天购买力目标' : '未来金额目标'} ${wan(input.target)}`;
    $('principal').textContent = wan(last.principal);
    $('gains').textContent = wan(last.balance - last.principal);
    $('purchasing').textContent = wan(last.real);
    $('assumptions').textContent = `按${period === 'monthly' ? '每月末' : '每年末'}固定投入计算。名义年化收益 ${input.rate}%，年化通胀 ${input.inflation}%，对应实际年化收益 ${(result.realRate * 100).toFixed(2)}%。年化收益按复利转换为月收益率，不直接除以 12。${input.basis === 'real' ? '目标金额随通胀增长。' : '目标金额固定；通胀仅影响购买力展示，不改变名义达标时间。'}`;
    const rows = result.points.filter(p => p.month % 12 === 0 || p === last);
    $('year-table').innerHTML = rows.map(p => `<tr><td>${duration(p.month)}</td><td>${input.age + Math.floor(p.month / 12)} 岁${p.month % 12 ? ` ${p.month % 12} 个月` : ''}</td><td>${yuan(p.principal)} 元</td><td>${yuan(p.balance)} 元</td><td>${yuan(p.real)} 元</td></tr>`).join('');
    renderChart(result.points, input.age);
    hints();
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
    $('result-label').textContent = '输入无效 · 下方保留上次结果';
  }
}
form.addEventListener('submit', run);
form.addEventListener('input', () => { hints(); $('result-label').textContent = '上次计算结果 · 参数已调整，请重新计算'; });
document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
  const next = button.dataset.period;
  if (next !== period) {
    const amount = Number($('contribution').value);
    if (Number.isFinite(amount)) $('contribution').value = Number((next === 'yearly' ? amount * 12 : amount / 12).toFixed(8));
    period = next;
    document.querySelectorAll('[data-period]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    hints(); $('result-label').textContent = '上次计算结果 · 参数已调整，请重新计算';
  }
}));
function syncMode() {
  const reverse = $('mode').value === 'rate';
  $('rate-field').hidden = reverse; $('rate').disabled = reverse;
  $('years-field').hidden = !reverse; $('years').disabled = !reverse; $('years').required = reverse;
  $('button-label').textContent = reverse ? '计算所需年化' : '计算达标年龄';
}
$('mode').addEventListener('change', syncMode);
$('reset').addEventListener('click', () => {
  form.reset(); period = 'monthly'; syncMode();
  document.querySelectorAll('[data-period]').forEach(b => { const active = b.dataset.period === period; b.classList.toggle('selected', active); b.setAttribute('aria-pressed', String(active)); });
  run();
});
run();
