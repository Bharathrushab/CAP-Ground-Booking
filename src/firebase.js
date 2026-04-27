import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyBuRNNw2S8p3NNY2M8QRQgc0D1KSrceJng",
  authDomain: "cap-practice-booking.firebaseapp.com",
  projectId: "cap-practice-booking",
  storageBucket: "cap-practice-booking.firebasestorage.app",
  messagingSenderId: "49781610428",
  appId: "1:49781610428:web:917a9d2a42e27c9d7e7db9",
  measurementId: "G-BB34REQSK8"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const analytics = getAnalytics(app);
// Initialize Firebase Authentication
export const auth = getAuth(app);