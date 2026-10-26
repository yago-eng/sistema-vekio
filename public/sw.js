// Service worker: mantém o app instalável (PWA) e recebe notificações push.
// Estratégia network-first, sem cache agressivo, já que o sistema é dinâmico
// (dados sempre precisam vir do servidor).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
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
