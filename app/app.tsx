// App.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";
import * as WebBrowser from "expo-web-browser";
import { View, Alert, Text } from "react-native";
import { requestNotificationPermissions, addNotificationReceivedListener, addNotificationResponseListener, handleNotificationResponse } from "../src/notifications/notificationService";
import { AppState } from 'react-native';

import LoginScreen from "../app/login";
import AddOrEdit from "../app/index";
import Lista from "../app/lista";
import Historial from "../app/historial";
import Perfil from "../app/perfil";
import AlarmModal from "../app/alarmModal";
import { supabase } from "../src/lib/supabaseClient";

export const navigationRef = createNavigationContainerRef();

type AuthUser = null | { mode: "guest" } | { mode: "user"; name?: string | null };
type AuthCtx = { user: AuthUser; signInAsGuest: () => void; signOut: () => Promise<void> };

const AuthContext = createContext<AuthCtx | undefined>(undefined);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

WebBrowser.maybeCompleteAuthSession();

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [alarmModal, setAlarmModal] = useState<{
    visible: boolean;
    medication: any | null;
  }>({ visible: false, medication: null });

  useEffect(() => {
    // Configurar notificaciones al iniciar la app
    const setupNotifications = async () => {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Notificaciones',
          'Para recibir recordatorios de medicamentos, por favor activa las notificaciones en la configuración de la app.',
          [{ text: 'Entendido' }]
        );
      }
    };

    setupNotifications();

    // Configurar listener para notificaciones recibidas
    const notificationListener = addNotificationReceivedListener((notification) => {
      console.log('[App] Notificación recibida:', notification);
      console.log('[App] Estado de la app:', AppState.currentState);
      
      // Si es una notificación de medicamento con modal, mostrar el modal SOLO si la app está activa
      if (notification.request.content.data?.showModal && 
          notification.request.content.data?.medicationId) {
        
        if (AppState.currentState === 'active') {
          console.log('[App] App activa - mostrando modal de alarma');
          setAlarmModal({
            visible: true,
            medication: {
              id: notification.request.content.data.medicationId,
              name: notification.request.content.data.medicationName,
              dose: notification.request.content.data.dose,
              scheduledTime: notification.request.content.data.scheduledTime,
            }
          });
        } else {
          console.log('[App] App en segundo plano - notificación del sistema se mostrará automáticamente');
        }
      } else if (!notification.request.content.data?.showModal) {
        // Solo mostrar alert para notificaciones que no son de medicamentos
        Alert.alert(
          notification.request.content.title || 'Notificación',
          notification.request.content.body || 'Nueva notificación',
          [{ text: 'OK' }]
        );
      }
    });

    // Configurar listener para respuestas de notificaciones interactivas
    const responseListener = addNotificationResponseListener((response) => {
      console.log('[App] Respuesta de notificación recibida:', response);
      handleNotificationResponse(response);
    });

    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (s) setUser({ mode: "user", name: s.user?.user_metadata?.full_name });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[Auth] onAuthStateChange:", event);
      if (session) {
        setUser({ mode: "user", name: session.user?.user_metadata?.full_name });
        // Solo resetear si hay un navegador activo y no es el estado inicial
        if (navigationRef.isReady() && event !== 'INITIAL_SESSION') {
          setTimeout(() => {
            if (navigationRef.isReady()) {
              navigationRef.reset({ index: 0, routes: [{ name: "Agregar medicamento" as const }] });
            }
          }, 100);
        }
      } else {
        setUser(null);
        // Solo limpiar navegación si no es el estado inicial
        if (navigationRef.isReady() && event !== 'INITIAL_SESSION') {
          setTimeout(() => {
            if (navigationRef.isReady()) {
              navigationRef.reset({ index: 0, routes: [] });
            }
          }, 100);
        }
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      signInAsGuest: () => setUser({ mode: "guest" }),
      signOut: async () => {
        await supabase.auth.signOut();
        setUser(null);
      },
    }),
    [user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AlarmModal
        visible={alarmModal.visible}
        medication={alarmModal.medication}
        onClose={() => setAlarmModal({ visible: false, medication: null })}
        onTake={() => console.log('Medicamento tomado')}
        onSnooze={() => console.log('Medicamento aplazado')}
        onCancel={() => console.log('Medicamento cancelado')}
      />
    </AuthContext.Provider>
  );
}

const Drawer = createDrawerNavigator();

/** Drawer personalizado con botón "Cerrar sesión" al final */
function CustomDrawerContent(props: any) {
  const { signOut, user } = useAuth();
  const isGuest = user?.mode === "guest";

  return (
    <DrawerContentScrollView {...props}>
      {/* Mostrar estado del usuario */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: isGuest ? '#ff9800' : '#4caf50' }}>
          {isGuest ? '👤 Modo Invitado' : '✅ Usuario Autenticado'}
        </Text>
        {!isGuest && user?.name && (
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            {user.name}
          </Text>
        )}
      </View>
      
      <DrawerItemList {...props} />
      <View style={{ height: 8 }} />
      <DrawerItem
        label="Cerrar sesión"
        labelStyle={{ color: '#d32f2f', fontWeight: 'bold' }}
        onPress={async () => {
          await signOut(); // RootNavigator mostrará Login automáticamente
        }}
      />
    </DrawerContentScrollView>
  );
}

function RootNavigator() {
  const { user } = useAuth();

  if (!user) return <LoginScreen />;

  // Para usuarios invitados, solo mostrar Agregar medicamento y Lista
  const isGuest = user.mode === "guest";

  return (
    <Drawer.Navigator
      initialRouteName="Agregar medicamento"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Agregar medicamento" component={AddOrEdit} />
      <Drawer.Screen name="Lista" component={Lista} />
      {!isGuest && <Drawer.Screen name="Historial" component={Historial} />}
      {!isGuest && <Drawer.Screen name="Perfil" component={Perfil} />}
    </Drawer.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
