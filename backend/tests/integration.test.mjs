import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
const user='11111111-1111-4111-8111-111111111111';
const project='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
let upstream, server, base, profile, memberships, role, calls;
const listen=s=>new Promise(resolve=>s.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${s.address().port}`)));
before(async()=>{
 upstream=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');calls.push(url);
  res.setHeader('Content-Type','application/json');
  const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
  if(url.pathname==='/auth/v1/user')return req.headers.authorization==='Bearer valid-test-token'?send(200,{id:user}):send(401,{message:'Invalid JWT'});
  if(url.pathname==='/rest/v1/profiles')return send(200,profile);
  if(url.pathname==='/rest/v1/project_members') {
   assert.equal(url.searchParams.get('user_id'),`eq.${user}`);
   if(url.searchParams.has('project_id'))return send(200,url.searchParams.get('project_id')===`eq.${project}`?{project_id:project,role,district:null}:null);
   return send(200,memberships);
  }
  if(url.pathname==='/rest/v1/projects')return send(200,{id:project,name:'Test project',status:'active'});
  if(url.pathname==='/rest/v1/activities') {
   assert.equal(url.searchParams.get('project_id'),`eq.${project}`);
   return send(200,null);
  }
  return send(500,{message:'Unexpected test request'});
 });
 const url=await listen(upstream);
 Object.assign(process.env,{NODE_ENV:'test',FRONTEND_URL:'http://localhost:5173',SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'nonfunctional-test-key-only'});
 const {default:app}=await import('../dist/app.js');
 server=createServer(app);base=await listen(server);
});
after(async()=>{await Promise.all([server,upstream].map(s=>new Promise(r=>s.close(r))));});
beforeEach(()=>{profile={id:user,email:'test@example.invalid',active:true,is_org_admin:false};memberships=[{role:'admin',projects:{id:project,name:'Test project',status:'active'}}];role='admin';calls=[];});
async function request(path,token='valid-test-token',method='GET'){
 const r=await fetch(base+path,{method,headers:token?{Authorization:`Bearer ${token}`}:{}});
 assert.match(r.headers.get('content-type'),/application\/json/);return {status:r.status,body:await r.json()};
}
test('health is public JSON and never queries Supabase',async()=>{assert.deepEqual(await request('/health',null),{status:200,body:{status:'ok'}});assert.equal(calls.length,0);});
test('missing token fails before any database access',async()=>{assert.equal((await request('/api/users/me',null)).status,401);assert.equal(calls.length,0);});
test('invalid token is verified upstream and denied before profiles',async()=>{assert.equal((await request('/api/users/me','invalid')).status,401);assert.equal(calls.length,1);assert.equal(calls[0].pathname,'/auth/v1/user');});
test('missing profile fails closed',async()=>{profile=null;assert.equal((await request('/api/users/me')).status,401);});
test('inactive profile fails closed',async()=>{profile.active=false;assert.equal((await request('/api/users/me')).status,401);});
test('account includes only current user memberships',async()=>{const r=await request('/api/users/me');assert.equal(r.status,200);assert.equal(r.body.id,user);assert.deepEqual(r.body.projects,memberships);});
test('empty memberships are a valid account',async()=>{memberships=[];assert.deepEqual((await request('/api/users/me')).body.projects,[]);});
test('malformed relationships and roles are excluded',async()=>{memberships=[null,{role:'admin',projects:null},{role:'admin',projects:{}},{role:'unknown',projects:{id:project,name:'Test',status:'active'}}];assert.deepEqual((await request('/api/users/me')).body.projects,[]);});
test('array relationship remains usable',async()=>{memberships=[{role:'admin',projects:[null,{id:project,name:'Test',status:'active'}]}];assert.equal((await request('/api/users/me')).body.projects.length,1);});
test('member can read own project',async()=>{assert.equal((await request(`/api/projects/${project}`)).status,200);});
test('foreign project is hidden even from organization admin',async()=>{profile.is_org_admin=true;assert.equal((await request(`/api/projects/${other}`)).status,404);assert.ok(!calls.some(x=>x.pathname==='/rest/v1/projects'));});
test('malformed project identifier fails before project lookup',async()=>{assert.equal((await request('/api/projects/not-a-uuid')).status,404);assert.ok(!calls.some(x=>x.pathname==='/rest/v1/project_members'));});
test('officer cannot enumerate members',async()=>{role='officer';assert.equal((await request(`/api/projects/${project}/members`)).status,403);});
test('non organization admin cannot enumerate profiles',async()=>{assert.equal((await request('/api/users')).status,403);});
test('foreign nested activity is constrained to authorized project',async()=>{assert.equal((await request(`/api/projects/${project}/activities/${other}`)).status,404);assert.ok(calls.some(x=>x.pathname==='/rest/v1/activities'));});
