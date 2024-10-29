import './App.css';
import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import AgregarMedicacion from './componentes/AgregarMedicacion';
import ListaMedicamentos from './componentes/ListaMedicamentos';
import Login from './componentes/Login';

function App() {
  const [user, setUser] = useState(null);
  const [medicamentosLocales, setMedicamentosLocales] = useState([]); // Estado local para gestionar medicamentos
  const [medicamentoAEditar, setMedicamentoAEditar] = useState(null); // Estado para editar un medicamento específico

  useEffect(() => {
    // Escucha cambios en el estado de autenticación
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      console.log("Usuario autenticado:", user);
    });
    return () => unsubscribe();
  }, []);

  const agregarLocalmente = (nuevoMedicamento) => {
    setMedicamentosLocales([...medicamentosLocales, nuevoMedicamento]);
  };

  const editarMedicamento = (medicamento) => {
    setMedicamentoAEditar(medicamento);
  };

  const eliminarMedicamento = (id) => {
    setMedicamentosLocales(medicamentosLocales.filter((med) => med.id !== id));
  };

  return (
    <div className="container">
      <div className="card">
        <div className="logo-container">
          <img src="/logo.png" alt="MedTime Logo" className="logo" />
        </div>

        {user ? (
          <>
            <button onClick={() => auth.signOut()}>Cerrar sesión</button>
            <AgregarMedicacion 
              agregarLocalmente={agregarLocalmente} 
              medicamentoAEditar={medicamentoAEditar} 
            />
            <ListaMedicamentos 
              medicamentosLocales={medicamentosLocales} 
              setMedicamentosLocales={setMedicamentosLocales} 
              onEditar={editarMedicamento}
              onEliminar={eliminarMedicamento}
            />
          </>
        ) : (
          <Login />
        )}
      </div>
    </div>
  );
}

export default App;
