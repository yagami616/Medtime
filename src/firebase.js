import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCi9lK3eSJa1rMxFANf_80aKN2vbLFPbrw",
  authDomain: "medicamentos-app-c2664.firebaseapp.com",
  projectId: "medicamentos-app-c2664",
  storageBucket: "medicamentos-app-c2664.appspot.com",
  messagingSenderId: "258503944083",
  appId: "1:258503944083:web:83e0fd9f1f372be43f6a66",
  measurementId: "G-TKSXGZ78FV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error en la autenticación con Google:", error);
    alert("Error al iniciar sesión con Google.");
  }
};

// Función de inicio de sesión anónimo
const signInAnonymouslyUser = async () => {
  try {
    await signInAnonymously(auth);
    alert("Inicio de sesión anónimo exitoso.");
  } catch (error) {
    console.error("Error en la autenticación anónima:", error);
    alert("Error al iniciar sesión de forma anónima.");
  }
};

const logOut = () => signOut(auth);

export { auth, db, signInWithGoogle, signInAnonymouslyUser, logOut };
