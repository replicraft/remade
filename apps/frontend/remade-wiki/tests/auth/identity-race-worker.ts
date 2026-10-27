// Test-only entrypoint: hold one completed identity lookup so another real D1
// transaction can win before the callback continues into its email check.
export const identityRaceWorker = `
import Main from './index.js';
let held = false;
let released = false;

export default {
 async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === '/__test/identity-read') {
   if (url.searchParams.get('release') === '1') released = true;
   if (url.searchParams.get('reset') === '1') {held = false; released = false;}
   return Response.json({held});
  }
  const invoke = bindings => Main.prototype.fetch.call({env: bindings, ctx}, request);
  const holdIdentity = request.headers.get('X-Test-Hold-Identity-Read') === '1';
  const holdMerge = request.headers.get('X-Test-Hold-Merge-Match') === '1';
  if (!holdIdentity && !holdMerge) return invoke(env);

  const statements = new WeakMap();
  const wrap = (statement, sql) => {
   const proxy = new Proxy(statement, {get(target, key) {
    if (key === 'constructor') return target.constructor;
    if (key === 'bind') return (...args) => wrap(target.bind(...args), sql);
    if (key === 'first') return async (...args) => {
     const result = await target.first(...args);
     if (!held && ((holdIdentity && sql.startsWith('SELECT id AS identity_id') && result === null) || (holdMerge && sql.startsWith('SELECT e.identity_id') && result !== null))) {
      held = true;
      while (!released) await new Promise(resolve => setTimeout(resolve, 5));
     }
     return result;
    };
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
   }});
   statements.set(proxy, statement);
   return proxy;
  };
  const db = new Proxy(env.DB, {get(target, key) {
   if (key === 'constructor') return target.constructor;
   if (key === 'prepare') return sql => wrap(target.prepare(sql), sql);
   if (key === 'batch') return list => target.batch(list.map(statement => statements.get(statement) ?? statement));
   const value = Reflect.get(target, key, target);
   return typeof value === 'function' ? value.bind(target) : value;
  }});
  return invoke({...env, DB: db});
 }
};`;
