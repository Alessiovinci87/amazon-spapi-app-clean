// backend_v2/test.e2e.mjs
// Test E2E per scalatura accessori e update "pronto" (assoluto e a delta).
// Richiede il server avviato su http://localhost:3005 (npm start).

const base = 'http://localhost:3005/api/v2';

async function req(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${method} ${url} -> ${res.status} ${res.statusText} :: ${txt}`);
  }
  return res.json();
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg} | atteso=${expected}, ottenuto=${actual}`);
  }
}

function pickAcc(list, asin) {
  const f = list.find(a => a.asin_accessorio === asin);
  if (!f) throw new Error(`Accessorio non trovato: ${asin}`);
  return f;
}

(async () => {
  console.log('▶️  Healthcheck...');
  await req('GET', '/health');

  console.log('▶️  Reset a 1000 pezzi per accessorio, pronto=0...');
  await req('POST', '/dev/reset', { qty: 1000 });

  console.log('▶️  Verifica stato iniziale accessori...');
  let accessori = await req('GET', '/accessori');
  assertEq(pickAcc(accessori, 'TAPPO_12').quantita, 1000, 'Quantità iniziale TAPPO_12');
  assertEq(pickAcc(accessori, 'PENNELLO_12').quantita, 1000, 'Quantità iniziale PENNELLO_12');
  assertEq(pickAcc(accessori, 'BOCCETTA_12').quantita, 1000, 'Quantità iniziale BOCCETTA_12');

  console.log('▶️  PRODUCE DELTA 100 su BOTTLE_12ML (ci aspettiamo -100 per ogni accessorio)...');
  let out = await req('POST', '/inventario/BOTTLE_12ML/produce', { qty: 100, note: 'E2E produce 100' });
  assertEq(out.ok, true, 'produce ok');
  assertEq(out.delta, 100, 'delta 100');
  assertEq(out.pronto, 100, 'pronto 100 dopo produzione');

  accessori = await req('GET', '/accessori');
  assertEq(pickAcc(accessori, 'TAPPO_12').quantita, 900, 'TAPPO_12 dopo -100');
  assertEq(pickAcc(accessori, 'PENNELLO_12').quantita, 900, 'PENNELLO_12 dopo -100');
  assertEq(pickAcc(accessori, 'BOCCETTA_12').quantita, 900, 'BOCCETTA_12 dopo -100');

  console.log('▶️  SET PRONTO ASSOLUTO a 150 (delta +50 => -50 per ciascun accessorio)...');
  out = await req('PATCH', '/inventario/BOTTLE_12ML/pronto', { pronto: 150, note: 'E2E set 150' });
  assertEq(out.ok, true, 'set 150 ok');
  assertEq(out.delta, 50, 'delta +50');
  assertEq(out.pronto, 150, 'pronto 150');

  accessori = await req('GET', '/accessori');
  assertEq(pickAcc(accessori, 'TAPPO_12').quantita, 850, 'TAPPO_12 dopo ulteriore -50');
  assertEq(pickAcc(accessori, 'PENNELLO_12').quantita, 850, 'PENNELLO_12 dopo ulteriore -50');
  assertEq(pickAcc(accessori, 'BOCCETTA_12').quantita, 850, 'BOCCETTA_12 dopo ulteriore -50');

  console.log('▶️  RETTIFICA: set pronto assoluto a 120 (delta -30 => nessuna scalatura accessori)...');
  out = await req('PATCH', '/inventario/BOTTLE_12ML/pronto', { pronto: 120, note: 'E2E rettifica 120' });
  assertEq(out.ok, true, 'set 120 ok');
  assertEq(out.delta, -30, 'delta -30');
  assertEq(out.pronto, 120, 'pronto 120');

  accessori = await req('GET', '/accessori');
  assertEq(pickAcc(accessori, 'TAPPO_12').quantita, 850, 'TAPPO_12 invariato dopo rettifica');
  assertEq(pickAcc(accessori, 'PENNELLO_12').quantita, 850, 'PENNELLO_12 invariato dopo rettifica');
  assertEq(pickAcc(accessori, 'BOCCETTA_12').quantita, 850, 'BOCCETTA_12 invariato dopo rettifica');

  console.log('\n✅ TEST E2E COMPLETATI: scalatura e rettifica OK.');
})().catch(err => {
  console.error('❌ Test fallito:', err.message);
  process.exit(1);
});
