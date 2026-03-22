import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from './_layout';
import { SafeAreaView } from 'react-native-safe-area-context';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useContext(AuthContext);
  const router = useRouter();

  const handleAuth = async () => {
    if (!name.trim() || !pin.trim()) {
      setError('Please enter your name and PIN');
      return;
    }
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Something went wrong');
      setUser(data);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.pigEmoji}>🐷</Text>
              <Text style={styles.title}>Piggie Points</Text>
              <Text style={styles.subtitle}>
                {isRegister ? 'Create your account' : 'Welcome back, cutie!'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Your Name</Text>
                <TextInput
                  testID="login-name-input"
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#C4A0A8"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>PIN</Text>
                <TextInput
                  testID="login-pin-input"
                  style={styles.input}
                  placeholder="4-digit PIN"
                  placeholderTextColor="#C4A0A8"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                testID="login-submit-btn"
                style={styles.btn}
                onPress={handleAuth}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {isRegister ? 'Create Account' : 'Login'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                testID="toggle-auth-btn"
                onPress={() => { setIsRegister(!isRegister); setError(''); }}
                style={styles.toggleBtn}
              >
                <Text style={styles.toggleText}>
                  {isRegister ? 'Already have an account? Login' : "New here? Create Account"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Monitor link */}
            <TouchableOpacity
              testID="monitor-link-btn"
              onPress={() => router.push('/monitor')}
              style={styles.monitorLink}
            >
              <Text style={styles.monitorText}>Monitor Mode</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF0F5' },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pigEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FF9EAA',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#8D6E63',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#FFB7C5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  inputWrap: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF5F7',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#4A4A4A',
    borderWidth: 1.5,
    borderColor: '#FFD6DE',
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#FFB7C5',
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FFB7C5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  toggleBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    color: '#FF9EAA',
    fontSize: 14,
    fontWeight: '500',
  },
  monitorLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  monitorText: {
    color: '#C4A0A8',
    fontSize: 13,
    fontWeight: '500',
  },
});
