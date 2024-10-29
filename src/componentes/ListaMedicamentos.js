import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const ListaMedicamentos = ({ medicamentosLocales, setMedicamentosLocales, onEditar, onEliminar }) => {
  const [medicamentos, setMedicamentos] = useState(medicamentosLocales);

  useEffect(() => {
    const cargarMedicamentos = async () => {
      const usuario = auth.currentUser;
      if (!usuario) {
        console.log("Usuario no autenticado.");
        setMedicamentos(medicamentosLocales || []);
        return;
      }

      const querySnapshot = await getDocs(collection(db, `usuarios/${usuario.uid}/medicamentos`));
      setMedicamentos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    cargarMedicamentos();
  }, [medicamentosLocales]);

  const eliminarMedicamento = async (id) => {
    const usuario = auth.currentUser;
    if (!usuario) {
      alert("Usuario no autenticado.");
      return;
    }

    await deleteDoc(doc(db, `usuarios/${usuario.uid}/medicamentos`, id));
    setMedicamentos(medicamentos.filter((med) => med.id !== id));
    onEliminar(id);
  };

  return (
    <div className="lista-medicamentos">
      <ul>
        {medicamentos.map((medicamento) => (
          <li key={medicamento.id}>
            <span>{medicamento.nombre} - {medicamento.dosis} - {medicamento.hora}</span>
            <button className="editar-btn" onClick={() => onEditar(medicamento)}>✏️</button>
            <button className="eliminar-btn" onClick={() => eliminarMedicamento(medicamento.id)}>🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ListaMedicamentos;
