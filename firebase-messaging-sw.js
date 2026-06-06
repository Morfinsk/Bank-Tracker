/* firebase-messaging-sw.js
   Bank Tracker - Android safe Firebase Messaging Service Worker
   Upload this file to GitHub as:
   firebase-messaging-sw.js
*/

self.addEventListener("install", function () {
  try {
    self.skipWaiting();
  } catch (e) {}
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      try {
        if (self.clients && self.clients.claim) {
          await self.clients.claim();
        }
      } catch (e) {}
    })()
  );
});

let messaging = null;

try {
  importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

  if (typeof firebase !== "undefined" && firebase && firebase.initializeApp) {
    firebase.initializeApp({
      apiKey: "AIzaSyDZtbXCeF1MTmsfnobMrj9KlOQTqYVmOOw",
      authDomain: "bank-card-tracker.firebaseapp.com",
      projectId: "bank-card-tracker",
      storageBucket: "bank-card-tracker.appspot.com",
      messagingSenderId: "768194565850",
      appId: "1:768194565850:web:cc22f9f9357f7f22ac37e3"
    });

    if (firebase.messaging) {
      messaging = firebase.messaging();
    }
  }
} catch (error) {
  // Never let Firebase/service worker init crash Android PWA.
  console.warn("[Bank Tracker SW] Firebase init failed:", error);
}

function pickPayloadValue(payload, key, fallback) {
  try {
    if (payload && payload.notification && payload.notification[key]) {
      return payload.notification[key];
    }

    if (payload && payload.data && payload.data[key]) {
      return payload.data[key];
    }
  } catch (e) {}

  return fallback;
}

function getNotificationOptions(payload) {
  const body = pickPayloadValue(payload, "body", "Máš novú notifikáciu.");

  const url =
    pickPayloadValue(payload, "url", null) ||
    pickPayloadValue(payload, "click_action", null) ||
    "./";

  return {
    body: body,
    tag: "bank-card-tracker",
    renotify: true,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: {
      url: url
    }
  };
}

if (messaging && messaging.onBackgroundMessage) {
  try {
    messaging.onBackgroundMessage(function (payload) {
      const title = pickPayloadValue(payload, "title", "Bank Card Tracker");
      const options = getNotificationOptions(payload);

      try {
        return self.registration.showNotification(title, options);
      } catch (error) {
        console.warn("[Bank Tracker SW] showNotification failed:", error);
      }
    });
  } catch (error) {
    console.warn("[Bank Tracker SW] onBackgroundMessage setup failed:", error);
  }
}

self.addEventListener("push", function (event) {
  // Fallback for push payloads that do not go through Firebase callback cleanly on Android.
  if (messaging && messaging.onBackgroundMessage) return;

  event.waitUntil(
    (async function () {
      let payload = {};

      try {
        payload = event.data ? event.data.json() : {};
      } catch (e) {
        try {
          payload = {
            data: {
              body: event.data ? event.data.text() : ""
            }
          };
        } catch (_) {
          payload = {};
        }
      }

      const title = pickPayloadValue(payload, "title", "Bank Card Tracker");
      const options = getNotificationOptions(payload);

      try {
        await self.registration.showNotification(title, options);
      } catch (error) {
        console.warn("[Bank Tracker SW] fallback push notification failed:", error);
      }
    })()
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl =
    event.notification &&
    event.notification.data &&
    event.notification.data.url
      ? event.notification.data.url
      : "./";

  event.waitUntil(
    (async function () {
      try {
        const allClients = await clients.matchAll({
          type: "window",
          includeUncontrolled: true
        });

        for (const client of allClients) {
          if (client && "focus" in client) {
            try {
              if (client.url && client.url.indexOf(self.location.origin) === 0) {
                await client.focus();

                if ("navigate" in client && targetUrl && targetUrl !== "./") {
                  await client.navigate(targetUrl);
                }

                return;
              }
            } catch (e) {}
          }
        }

        if (clients.openWindow) {
          await clients.openWindow(targetUrl || "./");
        }
      } catch (error) {
        try {
          await clients.openWindow("./");
        } catch (e) {}
      }
    })()
  );
});
