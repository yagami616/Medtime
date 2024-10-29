import React from 'react';
import { signInWithGoogle, signInAnonymouslyUser } from '../firebase';

const Login = () => {
  const iniciarSesion = async () => {
    try {
      await signInWithGoogle();
      alert('Inicio de sesión exitoso.');
    } catch (error) {
      alert('Error al iniciar sesión.');
    }
  };

  const iniciarSesionAnonima = async () => {
    try {
      await signInAnonymouslyUser();
      alert('Inicio de sesión anónimo exitoso.');
    } catch (error) {
      alert('Error al iniciar sesión de forma anónima.');
    }
  };

  return (
    <div>
      <button onClick={iniciarSesion}>Iniciar sesión con Google</button>
      <button onClick={iniciarSesionAnonima} style={{ marginTop: "10px" }}>ingresar como invitado</button>
    </div>
  );
};

export default Login;
