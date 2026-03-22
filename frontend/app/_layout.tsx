import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = { id: string; name: string; total_points: number; current_streak: number } | null;

type AuthContextType = {
  user: User;
  setUser: (u: User) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  const [user, setUser] = useState<User>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('piggie_user').then((val) => {
      if (val) setUser(JSON.parse(val));
      setLoaded(true);
    });
  }, []);

  const updateUser = (u: User) => {
    setUser(u);
    if (u) AsyncStorage.setItem('piggie_user', JSON.stringify(u));
    else AsyncStorage.removeItem('piggie_user');
  };

  const logout = () => {
    setUser(null);
    AsyncStorage.removeItem('piggie_user');
  };

  if (!loaded) return null;

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, logout }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="timer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="monitor" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthContext.Provider>
  );
}
