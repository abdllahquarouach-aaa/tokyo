// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy3WhiNwfQob0twdLrci6HxlaHxg82Vro",
  authDomain: "tokyo0001-8efa2.firebaseapp.com",
  projectId: "tokyo0001-8efa2",
  storageBucket: "tokyo0001-8efa2.firebasestorage.app",
  messagingSenderId: "718123589861",
  appId: "1:718123589861:web:a8af34f5eff13bd62ef40c",
  measurementId: "G-BD300L5M9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);