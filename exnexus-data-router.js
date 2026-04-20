export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname.replace('/data','') || '/status';
    const DATA = 'https://exnexus-data.drorbaron18.workers.dev';
    const CORS = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' };

    if(request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      const opts = request.method === 'POST'
        ? { method:'POST', headers:{'Content-Type':'application/json'}, body: await request.text() }
        : { method:'GET' };

      const res  = await fetch(DATA + path + url.search, opts);
      const data = await res.text();
      return new Response(data, { headers: CORS });
    } catch(e) {
      return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
    }
  }
};