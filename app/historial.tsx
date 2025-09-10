// app/historial.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { colors } from "../src/theme/colors";
import { getHistory, HistoryEntry, historyToCSV } from "../src/storage/history";
import { loadUserHistoryFromSupabase, supabaseHistoryToCSV, SupabaseHistoryEntry } from "../src/storage/supabaseHistory";
import { useAuth } from "./app";
import { shade, fmtHour } from "../src/utils/helpers";

/** 🎛️ Ajustes */
const UI = {
  SCREEN_PADDING: 16,
  CARD_RADIUS: 12,
  DARKEN_PRIMARY: -20,
  BADGE_BLUE: "#2563eb",
  BADGE_RED: "#b91c1c",
};


type OrderBy = "fecha" | "az";

const HistorialScreen = React.memo(function HistorialScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryEntry[]>([]);
  const [supabaseRows, setSupabaseRows] = useState<SupabaseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderBy, setOrderBy] = useState<OrderBy>("fecha");
  const [useSupabase, setUseSupabase] = useState(false);

  const borderColor = useMemo(() => shade(colors.primary, UI.DARKEN_PRIMARY), []);

  async function load() {
    setLoading(true);
    try {
      // Cargar historial local
      const localHistory = await getHistory();
      setRows(localHistory);

      // Si el usuario está autenticado, cargar de Supabase y priorizarlo
      if (user?.mode === "user") {
        const supabaseHistory = await loadUserHistoryFromSupabase();
        setSupabaseRows(supabaseHistory);
        // Priorizar Supabase si el usuario está autenticado
        setUseSupabase(true);
      } else {
        // Usuario no autenticado, usar solo datos locales
        setUseSupabase(false);
      }
    } catch (error) {
      console.error('[Historial] Error al cargar:', error);
      Alert.alert('Error', 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const ordered = useMemo(() => {
    const dataToUse = useSupabase ? supabaseRows : rows;
    const copy = [...dataToUse];
    
    if (orderBy === "fecha") {
      copy.sort((a, b) => {
        const dateA = 'taken_at' in a ? a.taken_at : a.at;
        const dateB = 'taken_at' in b ? b.taken_at : b.at;
        return dateA < dateB ? 1 : -1; // desc
      });
    } else {
      copy.sort((a, b) => {
        const nameA = 'med_name' in a ? a.med_name : a.name;
        const nameB = 'med_name' in b ? b.med_name : b.name;
        return nameA.localeCompare(nameB, "es");
      });
    }
    return copy;
  }, [rows, supabaseRows, orderBy, useSupabase]);

  const onDownload = async () => {
    try {
      const dataToUse = useSupabase ? supabaseRows : rows;
      
      if (dataToUse.length === 0) {
        Alert.alert("Historial vacío", "No hay datos para exportar.");
        return;
      }

      // Usar el formato correcto según el tipo de datos
      const csv = useSupabase 
        ? supabaseHistoryToCSV(dataToUse as SupabaseHistoryEntry[])
        : historyToCSV(dataToUse as HistoryEntry[]);

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `historial_medtime_${stamp}.csv`;
      
      // Intentar guardar en la carpeta de descargas (más accesible)
      let fileUri = '';
      let saveLocation = '';
      
      try {
        // Para emuladores Android, usar la ruta del almacenamiento externo
        const externalStorageDir = FileSystem.documentDirectory + '../../../../storage/emulated/0/Download/';
        const downloadsUri = externalStorageDir + fileName;
        
        console.log('[Historial] Intentando guardar en:', downloadsUri);
        
        // Verificar si la carpeta de descargas existe
        const downloadsInfo = await FileSystem.getInfoAsync(externalStorageDir);
        if (downloadsInfo.exists) {
          await FileSystem.writeAsStringAsync(downloadsUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
          fileUri = downloadsUri;
          saveLocation = 'Carpeta de Descargas (SDK > Download)';
        } else {
          throw new Error('Carpeta de descargas no disponible');
        }
      } catch (error) {
        console.log('No se pudo guardar en Downloads, intentando ruta alternativa:', error);
        
        try {
          // Intentar ruta alternativa para emuladores
          const alternativeDir = FileSystem.documentDirectory + '../../../Download/';
          const alternativeUri = alternativeDir + fileName;
          
          const altInfo = await FileSystem.getInfoAsync(alternativeDir);
          if (altInfo.exists) {
            await FileSystem.writeAsStringAsync(alternativeUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
            fileUri = alternativeUri;
            saveLocation = 'Carpeta de Descargas (ruta alternativa)';
          } else {
            throw new Error('Ruta alternativa no disponible');
          }
        } catch (altError) {
          console.log('Ruta alternativa falló, usando carpeta de documentos:', altError);
          // Fallback: guardar en la carpeta de documentos de la app
          fileUri = FileSystem.documentDirectory! + fileName;
          await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
          saveLocation = 'Carpeta de documentos de MedTime';
        }
      }

      // Verificar que el archivo se creó correctamente
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        Alert.alert(
          "✅ Archivo descargado", 
          `El historial se ha guardado como:\n\n${fileName}\n\nUbicación: ${saveLocation}`,
          [
            { text: "OK" },
            { 
              text: "Compartir archivo", 
              onPress: async () => {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                  await Sharing.shareAsync(fileUri, { 
                    mimeType: "text/csv", 
                    dialogTitle: "Compartir historial de MedTime" 
                  });
                } else {
                  Alert.alert("Error", "No se puede compartir en este dispositivo");
                }
              }
            },
            { 
              text: "Ver ubicación", 
              onPress: () => {
                // Mostrar la ubicación real del archivo
                Alert.alert(
                  "📍 Ubicación del archivo",
                  `El archivo se guardó en:\n\n${fileUri}\n\nPara acceder al archivo:\n1. Abre el administrador de archivos\n2. Ve a "SDK" > "Download"\n3. Busca el archivo: ${fileName}\n\nSi no aparece, busca en "Archivos internos"`,
                  [
                    { text: "Entendido" },
                    { 
                      text: "Compartir archivo", 
                      onPress: async () => {
                        const canShare = await Sharing.isAvailableAsync();
                        if (canShare) {
                          await Sharing.shareAsync(fileUri, { 
                            mimeType: "text/csv", 
                            dialogTitle: "Compartir historial" 
                          });
                        }
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", "No se pudo crear el archivo.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "No se pudo exportar el historial.");
    }
  };

  const renderItem = ({ item }: { item: HistoryEntry | SupabaseHistoryEntry }) => {
    // Determinar si es un item de Supabase o local
    const isSupabaseItem = 'med_name' in item;
    
    const medName = isSupabaseItem ? (item as SupabaseHistoryEntry).med_name : (item as HistoryEntry).name;
    const dose = item.dose;
    const status = item.status;
    const scheduledTimes = isSupabaseItem ? (item as SupabaseHistoryEntry).scheduled_times : (item as HistoryEntry).scheduledTimes;
    const dateField = isSupabaseItem ? (item as SupabaseHistoryEntry).taken_at : (item as HistoryEntry).at;
    
    const horarios = scheduledTimes.map(fmtHour).join(" · ");
    const badgeBg = status === "Tomado" ? UI.BADGE_BLUE : UI.BADGE_RED;

    return (
      <View style={[s.card, { borderColor }]}>
        <View style={s.rowBetween}>
          <Text style={s.medName}>{medName}</Text>
          <View style={[s.badge, { backgroundColor: badgeBg }]}>
            <Text style={s.badgeText}>{status}</Text>
          </View>
        </View>
        <Text style={s.subText}>{new Date(dateField).toLocaleString()}</Text>
        <Text style={s.subText}>Dosis: <Text style={s.bold}>{dose}</Text></Text>
        <Text style={s.subText}>Horarios: <Text style={s.bold}>{horarios || "—"}</Text></Text>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <TouchableOpacity style={s.downloadBtn} onPress={onDownload}>
          <AntDesign name="download" size={16} color="#fff" />
          <Text style={s.downloadText}>Descargar historial</Text>
        </TouchableOpacity>

        <View style={s.orderWrap}>
          <Text style={s.orderLabel}>Ordenar por:</Text>
          <TouchableOpacity
            style={s.orderBtn}
            onPress={() => setOrderBy((p) => (p === "fecha" ? "az" : "fecha"))}
          >
            <Text style={s.orderBtnText}>{orderBy === "fecha" ? "Fecha" : "A-Z"}</Text>
            <AntDesign name="caretdown" size={12} color="#111" />
          </TouchableOpacity>
        </View>
      </View>


      {loading ? (
        <Text style={{ color: "#666" }}>Cargando…</Text>
      ) : ordered.length === 0 ? (
        <Text style={{ color: "#666", marginTop: 10 }}>Tu historial está vacío.</Text>
      ) : (
        <FlatList
          data={ordered}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
        />
      )}
    </View>
  );
});

export default HistorialScreen;

const s = StyleSheet.create({
  container: { flex: 1, padding: UI.SCREEN_PADDING, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  downloadBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#111827", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  downloadText: { color: "#fff", fontWeight: "800" },
  orderWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderLabel: { color: "#374151" },
  orderBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f3f4f6" },
  orderBtnText: { fontWeight: "800", color: "#111" },


  card: { borderWidth: 1, borderRadius: UI.CARD_RADIUS, padding: 12, backgroundColor: "#fff" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  medName: { fontSize: 18, fontWeight: "900", color: "#111827" },
  subText: { color: "#374151", marginTop: 2 },
  bold: { fontWeight: "700" },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: "#fff", fontWeight: "900" },
});
