import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

const AgregarMedicacion = ({ agregarLocalmente, medicamentoAEditar }) => {
  const [nombre, setNombre] = useState(medicamentoAEditar ? medicamentoAEditar.nombre : "");
  const [dosis, setDosis] = useState("");
  const [unidad, setUnidad] = useState("mg");
  const [hora, setHora] = useState("");

  useEffect(() => {
    if (medicamentoAEditar) {
      setNombre(medicamentoAEditar.nombre);
      setDosis(medicamentoAEditar.dosis);
      setHora(medicamentoAEditar.hora);
    }
  }, [medicamentoAEditar]);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    const usuario = auth.currentUser;
    if (!usuario) {
      alert("Usuario no autenticado.");
      return;
    }

    const medicamento = { nombre, dosis: `${dosis} ${unidad}`, hora };
    await addDoc(collection(db, `usuarios/${usuario.uid}/medicamentos`), medicamento);
    alert("Medicamento agregado en la nube.");

    // Actualizar el estado local
    agregarLocalmente(medicamento);

    // Limpiar campos del formulario
    setNombre("");
    setDosis("");
    setUnidad("mg");
    setHora("");
  };

  return (
    <form onSubmit={manejarEnvio} style={{ position: "relative" }}>
      <input 
        type="text" 
        placeholder="Nombre del medicamento" 
        value={nombre} 
        onChange={(e) => setNombre(e.target.value)} 
        required 
      />
      <input 
        type="text" 
        placeholder="Dosis" 
        value={dosis} 
        onChange={(e) => setDosis(e.target.value)} 
        required 
      />
      <input 
        type="time" 
        value={hora} 
        onChange={(e) => setHora(e.target.value)} 
        required 
      />
      <button type="submit">Agregar Medicamento</button>
    </form>
  );
};

export default AgregarMedicacion;
