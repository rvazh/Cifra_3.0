// Service worker da CIFRA: serve só para mostrar os avisos de vencimento como notificação.
// Não guarda nada em cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

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
