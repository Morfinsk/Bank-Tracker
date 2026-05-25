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
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "./icon-192.png",
    badge: "./icon-192.png"
  });
});