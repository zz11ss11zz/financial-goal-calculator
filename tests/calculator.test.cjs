'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {calculate} = require('../calculator.js');
const base = {age:30,initial:1000000,contribution:10000,target:5000000,rate:5,inflation:2,period:'monthly',basis:'nominal'};
test('annual return above 100 percent compounds correctly',()=>{
  const r=calculate({...base,initial:100,contribution:0,target:300,rate:200});
  assert.equal(r.months,12); assert.ok(Math.abs(r.last.balance-300)<1e-9);
});
test('zero-return monthly saving reaches exact target after 12 deposits',()=>{
  const r=calculate({...base,initial:100,contribution:10,target:220,rate:0});
  assert.equal(r.months,12); assert.equal(r.last.balance,220); assert.equal(r.last.principal,220);
});
test('annual contributions reproduce ordinary annuity example',()=>{
  const r=calculate({...base,initial:0,contribution:30000,target:1000000,rate:8,period:'yearly'});
  assert.equal(r.months,204); assert.ok(Math.abs(r.last.balance-1012506.7705503243)<1e-6);
});
test('initial principal compounds before first year-end contribution',()=>{
  const r=calculate({...base,initial:100,contribution:10,target:120,rate:10,period:'yearly'});
  assert.equal(r.months,12); assert.ok(Math.abs(r.last.balance-120)<1e-9);
});
test('effective monthly conversion matches annual rate without new money',()=>{
  const r=calculate({...base,initial:100,contribution:0,target:110,rate:10});
  assert.equal(r.months,12); assert.ok(Math.abs(r.last.balance-110)<1e-9);
});
test('nominal goal timing is independent of inflation; real purchasing power is not',()=>{
  const a=calculate(base),b=calculate({...base,inflation:10});
  assert.equal(a.months,b.months); assert.ok(b.last.real<a.last.real);
});
test('today purchasing power goal is later and inflation-adjusted',()=>{
  const a=calculate(base),b=calculate({...base,basis:'real'});
  assert.ok(b.months>a.months); assert.ok(b.last.real>=base.target-1e-6);
  assert.ok(b.points.at(-2).real<base.target);
});
test('already reached target takes zero months',()=>{
  const r=calculate({...base,target:500000}); assert.equal(r.months,0); assert.equal(r.points.length,1);
});
test('unreachable scenarios stop and report no fabricated success',()=>{
  const r=calculate({...base,initial:1,contribution:0,rate:-1});
  assert.equal(r.reached,false); assert.equal(r.months,null); assert.equal(r.points.at(-1).month,1200);
});
test('negative/nonfinite amounts, zero goal and invalid frequency are rejected',()=>{
  for(const patch of [{initial:-1},{contribution:NaN},{target:0},{rate:-100},{age:1.5},{period:'daily'},{basis:'unknown'}]) assert.throws(()=>calculate({...base,...patch}));
});
