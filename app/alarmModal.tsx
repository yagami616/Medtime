// app/alarmModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Vibration,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from './app';
import { addToHistory } from '../src/storage/history';
import { scheduleMedicationNotificationWithAlarm } from '../src/notifications/notificationService';

interface AlarmModalProps {
  visible: boolean;
  medication: {
    id: string;
    name: string;
    dose: string;
    scheduledTime: string;
  } | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function AlarmModal({
  visible,
  medication,
  onClose,
}: AlarmModalProps) {
  const { user } = useAuth();
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible && medication) {
      playAlarmSound();
      // Vibrar continuamente mientras el modal esté abierto
      const vibrationInterval = setInterval(() => {
        Vibration.vibrate(1000);
      }, 2000);

      return () => {
        clearInterval(vibrationInterval);
      };
    }
  }, [visible, medication]);

  const playAlarmSound = async () => {
    try {
      // Crear un tono de alarma simple usando Audio
      const { sound } = await Audio.Sound.createAsync(
        // Usar un tono de alarma más agresivo
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      soundRef.current = sound;
    } catch (error) {
      console.error('Error playing alarm sound:', error);
      // Fallback: vibrar más agresivamente
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);
    }
  };

  const stopAlarm = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const handleTake = async () => {
    if (!medication) return;
    
    try {
      // Marcar como tomado en el historial
      await addToHistory({
        id: Date.now().toString(),
        name: medication.name,
        dose: medication.dose,
        at: new Date().toISOString(),
        status: 'Tomado',
        scheduledTimes: [medication.scheduledTime],
      });

      await stopAlarm();
      onClose();
      
      Alert.alert('✅ Medicamento Tomado', `${medication.name} registrado correctamente.`);
    } catch (error) {
      console.error('Error al marcar medicamento como tomado:', error);
      Alert.alert('Error', 'No se pudo registrar la toma del medicamento.');
    }
  };

  const handleSnooze = async () => {
    if (!medication) return;
    
    try {
      // Programar notificación para 10 minutos después
      const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
      await scheduleMedicationNotificationWithAlarm({
        id: medication.id,
        name: medication.name,
        dose: medication.dose,
        times: [snoozeTime.toISOString()],
      });

      await stopAlarm();
      onClose();
      
      Alert.alert('⏰ Aplazado', `${medication.name} se recordará en 10 minutos.`);
    } catch (error) {
      console.error('Error al aplazar medicamento:', error);
      Alert.alert('Error', 'No se pudo aplazar el medicamento.');
    }
  };

  const handleCancel = async () => {
    if (!medication) return;
    
    try {
      // Marcar como cancelado en el historial
      await addToHistory({
        id: Date.now().toString(),
        name: medication.name,
        dose: medication.dose,
        at: new Date().toISOString(),
        status: 'Cancelado',
        scheduledTimes: [medication.scheduledTime],
      });

      await stopAlarm();
      onClose();
      
      Alert.alert('❌ Cancelado', `${medication.name} cancelado.`);
    } catch (error) {
      console.error('Error al cancelar medicamento:', error);
      Alert.alert('Error', 'No se pudo cancelar el medicamento.');
    }
  };

  if (!visible || !medication) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header de alarma */}
          <View style={styles.header}>
            <Text style={styles.alarmIcon}>🚨</Text>
            <Text style={styles.alarmTitle}>¡Hora de tu medicamento!</Text>
          </View>

          {/* Información del medicamento */}
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            <Text style={styles.medicationDose}>Dosis: {medication.dose}</Text>
            <Text style={styles.medicationTime}>
              Horario: {new Date(medication.scheduledTime).toLocaleTimeString()}
            </Text>
          </View>

          {/* Botones de acción */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.takeButton]}
              onPress={handleTake}
            >
              <Text style={styles.buttonText}>✅ Tomar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.snoozeButton]}
              onPress={handleSnooze}
            >
              <Text style={styles.buttonText}>⏰ Aplazar 10min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.buttonText}>❌ Cancelar</Text>
            </TouchableOpacity>
          </View>

          {/* Instrucciones */}
          <Text style={styles.instructions}>
            Toca un botón para proceder
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.9,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alarmIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  alarmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
  },
  medicationInfo: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  medicationName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  medicationDose: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  medicationTime: {
    fontSize: 16,
    color: '#95a5a6',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  takeButton: {
    backgroundColor: '#27ae60',
  },
  snoozeButton: {
    backgroundColor: '#f39c12',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 16,
  },
});
