importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDZtbXCeF1MTmsfnobMrj9KlOQTqYVmOOw",
  authDomain: "bank-card-tracker.firebaseapp.com",
  projectId: "bank-card-tracker",
  storageBucket: "bank-card-tracker.appspot.com",
  messagingSenderId: "768194565850",
  appId: "1:768194565850:web:cc22f9f9357f7f22ac37e3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const title =
    payload && payload.notification && payload.notification.title
      ? payload.notification.title
      : "Bank Card Tracker";

  const body =
    payload && payload.notification && payload.notification.body
      ? payload.notification.body
      : "Máš novú notifikáciu.";

  self.registration.showNotification(title, {
    body: body,
    tag: "bank-card-tracker",
    renotify: true
  });
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("./")
  );
});
