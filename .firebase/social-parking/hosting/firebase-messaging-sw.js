importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCcaJI-Ab6wKbk8_C9BckHf5JXblK8aLQs",
  authDomain: "studio-6366379090-251c5.firebaseapp.com",
  projectId: "studio-6366379090-251c5",
  storageBucket: "studio-6366379090-251c5.firebasestorage.app",
  messagingSenderId: "898470092455",
  appId: "1:898470092455:web:8a65404f01381d2d660582"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-p.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
