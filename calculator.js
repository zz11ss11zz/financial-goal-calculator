(function (root) {
  'use strict';
  function calculate(input) {
    const {age, initial, contribution, target, rate, inflation, period, basis} = input;
    if (![age, initial, contribution, target, rate, inflation].every(Number.isFinite)) throw new Error('请填写有效数字。');
    if (!Number.isInteger(age) || age < 0 || age > 100 || initial < 0 || contribution < 0 || target <= 0 || Math.max(initial, contribution, target) > 1e12 || rate < -99 || rate > 100 || inflation < -10 || inflation > 30) throw new Error('请检查输入范围：金额不可为负，目标需大于零，年龄为 0–100 岁整数。');
    if (!['monthly', 'yearly'].includes(period) || !['nominal', 'real'].includes(basis)) throw new Error('投入频率或目标口径无效。');
    const growth = Math.exp(Math.log1p(rate / 100) / 12);
    const inflationGrowth = Math.exp(Math.log1p(inflation / 100) / 12);
    let balance = initial, principal = initial, inflationFactor = 1;
    const points = [{month: 0, balance, principal, real: balance, goal: target}];
    let reached = initial >= target;
    for (let month = 1; month <= 1200 && !reached; month++) {
      balance *= growth;
      if (period === 'monthly' || month % 12 === 0) { balance += contribution; principal += contribution; }
      inflationFactor *= inflationGrowth;
      const goal = basis === 'real' ? target * inflationFactor : target;
      points.push({month, balance, principal, real: balance / inflationFactor, goal});
      reached = balance >= goal - Math.max(1, goal) * 1e-12;
    }
    const last = points[points.length - 1];
    return {reached, months: reached ? last.month : null, last, points, realRate: (1 + rate / 100) / (1 + inflation / 100) - 1};
  }
  root.FinancialGoal = {calculate};
  if (typeof module !== 'undefined' && module.exports) module.exports = {calculate};
})(typeof globalThis !== 'undefined' ? globalThis : this);
