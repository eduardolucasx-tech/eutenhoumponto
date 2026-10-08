'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
// Extract the pure progress function from the app as shipped.
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=app.indexOf('function computeTimeProgress(');
const end=app.indexOf('\nfunction renderHome(){',start);
assert.ok(start>=0&&end>start,'Missing progress calculation function');
const compute=new Function(app.slice(start,end)+';return computeTimeProgress;')();
for(const [worked,planned,percent,extra] of [
  [0,480,0,0],
  [240,480,50,0],
  [480,480,100,0],
  [540,480,113,60],
  [600,480,125,120],
  [960,480,200,480],
  [1200,480,250,720],
  [-60,480,0,0],
]){
 test((worked/60)+'h of '+(planned/60)+'h => '+percent+'%',()=>{
  const result=compute(worked,planned);
  assert.equal(result.percent,percent);
  assert.equal(result.extraMinutes,extra);
  assert.equal(result.goalArc,Math.min(100,percent));
  assert.equal(result.extraArc,Math.min(100,Math.round(extra/planned*100)));
 });
}
test('Non-working day does not divide by zero',()=>{
 const r=compute(240,0);
 assert.equal(r.percent,null);
 assert.equal(r.overtime,true);
 assert.equal(r.extraMinutes,240);
 assert.equal(r.label,'SEM META');
});
test('Non-working day with no punches',()=>{
 const r=compute(0,0);
 assert.equal(r.percent,null);
 assert.equal(r.overtime,false);
});
