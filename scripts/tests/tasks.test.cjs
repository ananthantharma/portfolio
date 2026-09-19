const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');

function load(relative, stubs = {}, globals = {}) {
  const filename = path.join(root, relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true}}).outputText;
  const module = {exports: {}};
  vm.runInNewContext(source, {module, exports: module.exports, require: name => {
    if (name in stubs) return stubs[name];
    throw new Error('Unexpected dependency: ' + name);
  }, console: {error() {}}, ...globals}, {filename});
  return module.exports;
}
const ok = data => ({ok: true, status: 200, json: async () => ({success: true, data})});
const bad = {ok: false, status: 500, json: async () => ({success: false, error: 'Save unavailable'})};
const flush = () => new Promise(resolve => setImmediate(resolve));

 test('writes to one task serialize, including deletion, and publish in order', async () => {
  const requests = [], events = [];
  const {api, subscribeTasks} = load('src/components/Tasks/api.ts', {}, {fetch: (url, options) => new Promise(resolve => requests.push({url, options, resolve}))});
  subscribeTasks(event => events.push(event));
  const first = api.update('a', {title:'First'});
  const second = api.update('a', {title:'Second'});
  const removal = api.remove('a');
  await flush(); assert.equal(requests.length, 1);
  requests[0].resolve(ok({_id:'a',title:'First'})); await first; await flush();
  assert.equal(requests.length, 2);
  requests[1].resolve(ok({_id:'a',title:'Second'})); await second; await flush();
  assert.equal(requests[2].options.method, 'DELETE');
  requests[2].resolve(ok({})); await removal;
  assert.deepEqual(events.map(event => event.type), ['upsert','upsert','remove']);
 });
 test('a failed write does not poison the next save or publish success', async () => {
  let count=0; const events=[];
  const {api,subscribeTasks}=load('src/components/Tasks/api.ts',{}, {fetch:async()=>++count===1?bad:ok({_id:'a',title:'Recovered'})});
  subscribeTasks(event=>events.push(event));
  await assert.rejects(api.update('a',{title:'Fail'}),/Save unavailable/);
  const result=await api.update('a',{title:'Recovered'});
  assert.equal(result.title,'Recovered'); assert.equal(events.length,1);
 });
 test('independent tasks can save concurrently',async()=>{
  let calls=0; const resolvers=[];
  const {api}=load('src/components/Tasks/api.ts',{}, {fetch:()=>{calls++;return new Promise(resolve=>resolvers.push(resolve));}});
  const one=api.update('a',{}),two=api.update('b',{});await flush();assert.equal(calls,2);
  resolvers.forEach(resolve=>resolve(ok({_id:'x'})));await Promise.all([one,two]);
 });
 test('new tasks have no accidental due date, and reordering errors propagate',async()=>{
  let body;
  const {api}=load('src/components/Tasks/api.ts',{}, {fetch:async(url,options)=>{body=JSON.parse(options.body);return url.endsWith('reorder')?bad:ok({_id:'a'});}});
  await api.create({title:'No deadline'});assert.equal(body.dueDate,null);
  await assert.rejects(api.reorder([{id:'a',order:1}]),/Save unavailable/);
 });

function routeHarness(session) {
 const state={connected:0,filter:null,patch:null,options:null};
 const model={findOneAndUpdate(filter,patch,options){Object.assign(state,{filter,patch,options});return {populate:async()=>({_id:'task',...patch.$set})}},findOneAndDelete:async filter=>{state.filter=filter;return {_id:'task'}},bulkWrite:async operations=>{state.operations=operations}};
 const stubs={'next-auth':{getServerSession:async()=>session},'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},'@/lib/auth':{authOptions:{}},'@/lib/dbConnect':{__esModule:true,default:async()=>{state.connected++}},'@/models/ToDo':{__esModule:true,default:model},'@/models/NotePage':{}};
 return {state,stubs};
}
const request = body => ({headers:{get:()=> 'application/json'},json:async()=>body});
 test('task mutation routes reject unauthenticated callers before DB access',async()=>{
  const {state,stubs}=routeHarness(null),route=load('src/app/api/todos/[id]/route.ts',stubs);
  assert.equal((await route.PUT(request({title:'x'}),{params:{id:'task'}})).status,401);
  assert.equal((await route.DELETE({}, {params:{id:'task'}})).status,401);
  assert.equal(state.connected,0);
 });
 test('task update scopes ownership, strips protected fields, and synchronizes status',async()=>{
  const {state,stubs}=routeHarness({user:{email:'owner@example.test'}}),route=load('src/app/api/todos/[id]/route.ts',stubs);
  const response=await route.PUT(request({title:'Saved',status:'done',isCompleted:false,userEmail:'other', $unset:{userEmail:1},dueDate:''}),{params:{id:'task'}});
  assert.equal(response.status,200);assert.equal(state.filter.userEmail,'owner@example.test');
  assert.equal(state.patch.$set.userEmail,undefined);assert.equal(state.patch.$set.$unset,undefined);
  assert.equal(state.patch.$set.isCompleted,true);assert.equal(state.patch.$set.dueDate,null);assert.equal(state.options.runValidators,true);
 });
 test('blank titles and invalid statuses are rejected',async()=>{
  const {stubs}=routeHarness({user:{email:'owner'}}),route=load('src/app/api/todos/[id]/route.ts',stubs);
  assert.equal((await route.PUT(request({title:'  '}),{params:{id:'task'}})).status,400);
  assert.equal((await route.PUT(request({status:'invalid'}),{params:{id:'task'}})).status,400);
 });
 test('deletion only targets the signed-in owner',async()=>{
  const {state,stubs}=routeHarness({user:{email:'owner'}}),route=load('src/app/api/todos/[id]/route.ts',stubs);
  await route.DELETE({}, {params:{id:'task'}});assert.equal(state.filter.userEmail,'owner');assert.equal(state.filter._id,'task');
 });
 test('reorder requires authentication and scopes each operation to the owner',async()=>{
  const denied=routeHarness(null);assert.equal((await load('src/app/api/todos/reorder/route.ts',denied.stubs).PUT(request({updates:[]}))).status,401);
  const {state,stubs}=routeHarness({user:{email:'owner'}}),route=load('src/app/api/todos/reorder/route.ts',stubs);
  assert.equal((await route.PUT(request({updates:[{id:'a',order:2}]}))).status,200);assert.equal(state.operations[0].updateOne.filter.userEmail,'owner');
  assert.equal((await route.PUT(request({updates:[null]}))).status,400);
 });
 test('recurring completion creates the next task only after successful update',async()=>{
  const types=load('src/components/Tasks/types.ts');let created=0;
  const base={_id:'a',title:'Repeat',priority:'None',isCompleted:false,status:'todo',dueDate:'2026-09-19T17:00:00Z',recurrence:{freq:'daily'}};
  const {saveTaskChanges}=load('src/components/Tasks/taskActions.ts',{'./types':types,'./api':{api:{update:async(id,patch)=>({...base,...patch}),create:async payload=>{created++;assert.equal(payload.isCompleted,false);return payload}}}});
  await saveTaskChanges(base,{status:'done',isCompleted:true});assert.equal(created,1);
  await saveTaskChanges({...base,status:'done',isCompleted:true},{notes:'Edited'});assert.equal(created,1);
 });
 test('recurrence creation failure reports partial success without undoing the completed task',async()=>{
  const types=load('src/components/Tasks/types.ts');
  const base={_id:'a',title:'Repeat',isCompleted:false,dueDate:'2026-09-19T17:00:00Z',recurrence:{freq:'daily'}};
  const {saveTaskChanges}=load('src/components/Tasks/taskActions.ts',{'./types':types,'./api':{api:{update:async()=>({...base,isCompleted:true}),create:async()=>{throw Error('offline')}}}});
  const result=await saveTaskChanges(base,{isCompleted:true});assert.equal(result.task.isCompleted,true);assert.match(result.warning,/next occurrence/);
 });
