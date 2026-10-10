(function (root) {
  'use strict';
  function calculate(input) {
    const {age, initial, contribution, target, rate, inflation, period, basis} = input;
    if (![age, initial, contribution, target, rate, inflation].every(Number.isFinite)) throw new Error('请填写有效数字。');
    if (!Number.isInteger(age) || age < 0 || age > 100 || initial < 0 || contribution < 0 || target <= 0 || Math.max(initial, contribution, target) > 1e12 || rate < -99 || inflation < -10 || inflation > 30) throw new Error('请检查输入范围：金额不可为负，目标需大于零，年龄为 0–100 岁整数。');
    if (!['monthly', 'yearly'].includes(period) || !['nominal', 'real'].includes(basis)) throw new Error('投入频率或目标口径无效。');
    const growth = Math.exp(Math.log1p(rate / 100) / 12);
    const inflationGrowth = Math.exp(Math.log1p(inflation / 100) / 12);
    let balance = initial, principal = initial, inflationFactor = 1;
    const points = [{month: 0, balance, principal, real: balance, goal: target}];
    let reached = initial >= target;
    const horizon = input.horizonMonths ?? 1200;
    for (let month = 1; month <= horizon && (input.horizonMonths !== undefined || !reached); month++) {
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
  function solveRate(input) {
    const months = Math.round(input.years * 12);
    if (!Number.isFinite(input.years) || months < 1 || months > 1200 || Math.abs(input.years * 12 - months) > 1e-7) throw new Error('目标年限需为 1 个月至 100 年，请按整月填写。');
    const evaluate = rate => calculate({...input, rate, horizonMonths: months});
    let low = -99, high = 100;
    if (input.initial === 0 && (input.contribution === 0 || (input.period === 'yearly' && months < 12))) throw new Error('指定期限内没有可投入的本金，无法通过收益达到目标。');
    let result = evaluate(low);
    if (result.last.balance >= result.last.goal) return {...result, requiredRate: low, atLowerBound: true};
    if (input.initial === 0 && months <= (input.period === 'yearly' ? 12 : 1)) throw new Error('期限内的投入发生在最后一个月末，没有复利时间；请增加投入或延长期限。');
    while (evaluate(high).last.balance < evaluate(high).last.goal) {
      high = (high + 100) * 2 - 100;
      if (!Number.isFinite(high)) throw new Error('指定期限下所需收益率超出可计算范围。');
    }
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      if (evaluate(mid).last.balance >= evaluate(mid).last.goal) high = mid; else low = mid;
    }
    result = evaluate(high);
    return {...result, requiredRate: high, atLowerBound: false};
  }
  root.FinancialGoal = {calculate, solveRate};
  if (typeof module !== 'undefined' && module.exports) module.exports = {calculate, solveRate};
})(typeof globalThis !== 'undefined' ? globalThis : this);
