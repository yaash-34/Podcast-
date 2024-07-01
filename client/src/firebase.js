// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBzuG3ITgZWt-a7Di-hk941agPMuLamL7w",
  authDomain: "resonet-ac72d.firebaseapp.com",
  projectId: "resonet-ac72d",
  storageBucket: "resonet-ac72d.appspot.com",
  messagingSenderId: "680184323685",
  appId: "1:680184323685:web:ea58ab0eae13a99fad708c",
  measurementId: "G-N2G3LP46HC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export default (app)