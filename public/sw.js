// Service worker: mantém o app instalável (PWA) e recebe notificações push.
// Estratégia network-first, sem cache agressivo, já que o sistema é dinâmico
// (dados sempre precisam vir do servidor).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const PAGINA_SEM_CONEXAO = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sem conexão</title>
<style>
  body{font-family:-apple-system,system-ui,sans-serif;display:flex;min-height:100vh;margin:0;padding:24px;
  align-items:center;justify-content:center;text-align:center;color:#333;background:#faf9f6}
  button{margin-top:16px;padding:12px 20px;border:0;border-radius:10px;background:#3f4030;color:#fff;font-size:16px}
</style></head>
<body><div><h1 style="font-size:20px">Sem conexão no momento</h1>
<p>Não foi possível falar com o sistema. Verifique o sinal da internet e tente de novo.</p>
<button onclick="location.reload()">Tentar de novo</button></div></body></html>`;

// Só intercepta pedidos de leitura (GET) deste mesmo site. O resto (envio de formulários, ações,
// serviços externos) segue direto para a rede, sem passar por aqui.
self.addEventListener("fetch", (event) => {
  const pedido = event.request;
  if (pedido.method !== "GET" || new URL(pedido.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(pedido).catch(async () => {
      // Sem rede (sinal fraco, por exemplo): nunca devolver "nada", que o Safari mostra como
      // "FetchEvent.respondWith received an error: Returned response is null".
      const guardada = await caches.match(pedido);
      if (guardada) return guardada;
      if (pedido.mode === "navigate") {
        return new Response(PAGINA_SEM_CONEXAO, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return Response.error();
    })
  );
});

// Notificação push vinda do servidor ({ titulo, descricao, link }).
self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: "Vekio", descricao: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo || "Vekio Engenharia", {
      body: dados.descricao || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: dados.link || "/inicio" },
    })
  );
});

// Ao tocar na notificação, abre (ou traz pra frente) o app na tela certa.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const alvo = new URL(event.notification.data?.link || "/inicio", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ("focus" in janela) {
          if ("navigate" in janela) janela.navigate(alvo);
          return janela.focus();
        }
      }
      return self.clients.openWindow(alvo);
    })
  );
});
