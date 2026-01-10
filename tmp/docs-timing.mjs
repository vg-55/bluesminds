const urls = ["http://localhost:3001/docs", "http://localhost:3001/docs.rsc"];

const pickHeaders = (res) => {
  const h = (k) => res.headers.get(k);
  return {
    "x-nextjs-cache": h("x-nextjs-cache"),
    "x-nextjs-prerender": h("x-nextjs-prerender"),
    "cache-control": h("cache-control"),
    vary: h("vary"),
    "content-type": h("content-type"),
  };
};

for (const url of urls) {
  console.log("===", url);
  for (let i = 1; i <= 5; i++) {
    const t0 = Date.now();
    const res = await fetch(url, { headers: { accept: "*/*" } });
    await res.arrayBuffer();
    const dt = Date.now() - t0;
    console.log(i, "status", res.status, "ms", dt, pickHeaders(res));
  }
}