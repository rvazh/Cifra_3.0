// Service worker da CIFRA
// 1) Deixa a CIFRA ser instalada como app e abrir mesmo sem internet (com a última versão guardada).
// 2) Mostra os avisos de vencimento como notificação.
//
// Como guarda os arquivos:
//   - páginas (index.html): tenta a internet primeiro; sem internet, usa a última cópia guardada;
//   - arquivos de assets/ e ícones (nome muda a cada versão): usa a cópia guardada, senão baixa e guarda;
//   - outros arquivos do site: internet primeiro, cópia guardada sem internet;
//   - nada de outros endereços (Supabase, ViaCEP, notícias) passa por aqui: eles vão sempre direto à internet.

const CACHE = 'cifra-v1';

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['./', './manifest.webmanifest', './icones/icone-192.png']))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return; // Supabase e outros sites: direto, sem cache

  // Página: internet primeiro (para pegar a versão nova), cópia guardada sem internet
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copia));
          return resposta;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Outros arquivos (manifest, favicon...): internet primeiro, cópia guardada sem internet
  const fixo = url.pathname.includes('/assets/') || url.pathname.includes('/icones/');
  if (!fixo) {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(pedido, copia));
          }
          return resposta;
        })
        .catch(() => caches.match(pedido))
    );
    return;
  }

  // Arquivos de "assets/" e ícones: têm um código no nome que muda a cada versão, então a cópia nunca fica velha
  evento.respondWith(
    caches.match(pedido).then(
      (guardado) =>
        guardado ||
        fetch(pedido).then((resposta) => {
          if (resposta.ok && resposta.type === 'basic') {
            const copia = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(pedido, copia));
          }
          return resposta;
        })
    )
  );
});

// Ao tocar na notificação, abre (ou traz para frente) a CIFRA no calendário
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.url) || './';
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      if (janelas.length) return janelas[0].focus();
      return self.clients.openWindow(destino);
    })
  );
});
