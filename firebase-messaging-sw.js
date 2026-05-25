importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDZtbXCeF1MTmsfnobMrj9KlOQTqYVmOOw",
  authDomain: "bank-card-tracker.firebaseapp.com",
  projectId: "bank-card-tracker",
  storageBucket: "bank-card-tracker.firebasestorage.app",
  messagingSenderId: "768194565850",
  appId: "1:768194565850:web:cc22f9f9357f7f22ac37e3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Bank Card Tracker";
  const body = payload.notification?.body || payload.data?.body || "Máš novú notifikáciu.";

  self.registration.showNotification(title, {
    body,
    tag: "bank-card-tracker",
    renotify: true
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("bank-card-tracker") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("./");
      }
    })
  );
});
