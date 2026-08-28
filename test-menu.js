const fetch = require('node-fetch');

async function test() {
  const res = await fetch("http://localhost:4000/api/menu", {
    headers: { "X-Business-ID": "d4c1a530-e4f5-41ed-8da6-88f16b5e082d" }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
