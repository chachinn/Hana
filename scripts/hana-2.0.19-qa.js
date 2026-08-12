const fs = require('fs');
const source = fs.readFileSync('app.js','utf8');
global.createId = (() => { let n=0; return () => `qa-${++n}`; })();

const n0 = source.indexOf('function normalizeSkincareRoutine');
const n1 = source.indexOf('function isSkincarePlanner', n0);
if (n0 < 0 || n1 < 0) throw new Error('normalizeSkincareRoutine extraction failed');
eval(source.slice(n0,n1));

const s0 = source.indexOf('function skincareStepsForDay');
const s1 = source.indexOf('function normalizeNote', s0);
if (s0 < 0 || s1 < 0) throw new Error('skincareStepsForDay extraction failed');
eval(source.slice(s0,s1));

const old = normalizeSkincareRoutine({steps:[{id:'old',category:'Cleanser',product:'Old cleanser',days:[1],times:['am']}]});
if (old.steps[0].variant !== 'primary') throw new Error('legacy step did not default to primary');

const routine = normalizeSkincareRoutine({steps:[
  {id:'p-am',category:'Cleanser',product:'Main AM',days:[1],times:['am'],variant:'primary'},
  {id:'a-am',category:'Serum',product:'Alt AM',days:[1],times:['am'],variant:'alternate'},
  {id:'p-pm',category:'Cleanser',product:'Main PM',days:[1],times:['pm']},
  {id:'a-pm',category:'Treatment / Active',product:'Alt PM',days:[1],times:['pm'],variant:'alternate'},
  {id:'bad',category:'Other',product:'Bad variant',days:[1],times:['am'],variant:'surprise'}
]});
const note={skincareRoutine:routine};
const names=(time,variant)=>skincareStepsForDay(note,1,time,variant).map(s=>s.product);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
if (!eq(names('am','primary'),['Main AM','Bad variant'])) throw new Error('primary AM filtering failed');
if (!eq(names('am','alternate'),['Alt AM'])) throw new Error('alternate AM filtering failed');
if (!eq(names('pm','primary'),['Main PM'])) throw new Error('primary PM filtering failed');
if (!eq(names('pm','alternate'),['Alt PM'])) throw new Error('alternate PM filtering failed');

const both = normalizeSkincareRoutine({steps:[{id:'both',category:'Moisturizer',product:'Both',days:[2],times:['am','pm']}]});
const bothNote={skincareRoutine:both};
if (skincareStepsForDay(bothNote,2,'am').length !== 1 || skincareStepsForDay(bothNote,2,'pm').length !== 1) throw new Error('legacy AM+PM compatibility failed');

console.log('Skincare compatibility QA passed');