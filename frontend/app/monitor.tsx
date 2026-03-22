import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

type DashboardData = {
  users: any[];
  today_completions: any[];
  recent_completions: any[];
  recent_redemptions: any[];
  total_tasks_completed: number;
};

export default function MonitorScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);

  const handleLogin = async () => {
    if (!pin.trim()) { setError('Enter the monitor PIN'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/monitor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitor_pin: pin }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Invalid PIN');
      }
      setAuthenticated(true);
      fetchDashboard();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API}/api/monitor/dashboard`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.loginContainer}>
            <TouchableOpacity testID="monitor-back-btn" style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#8D6E63" />
            </TouchableOpacity>

            <Ionicons name="eye-outline" size={64} color="#FFB7C5" style={{ marginBottom: 16 }} />
            <Text style={styles.title}>Monitor Mode</Text>
            <Text style={styles.subtitle}>Enter the monitor PIN to view progress</Text>

            <TextInput
              testID="monitor-pin-input"
              style={styles.pinInput}
              placeholder="Enter PIN"
              placeholderTextColor="#C4A0A8"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity testID="monitor-login-btn" style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Access</Text>}
            </TouchableOpacity>

            <Text style={styles.hint}>Default PIN: 1234</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity testID="monitor-close-btn" onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#8D6E63" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Monitor Dashboard</Text>
          <TouchableOpacity onPress={fetchDashboard}>
            <Ionicons name="refresh" size={24} color="#FF9EAA" />
          </TouchableOpacity>
        </View>

        {!data ? (
          <ActivityIndicator color="#FFB7C5" size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* User stats */}
            {data.users.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <Text style={styles.userEmoji}>🐷</Text>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userPoints}>{u.total_points} Piggie Points</Text>
                  <Text style={styles.userStreak}>Streak: {u.current_streak} days</Text>
                </View>
              </View>
            ))}

            {/* Stats overview */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data.total_tasks_completed}</Text>
                <Text style={styles.statLabel}>Total Tasks Done</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data.today_completions.length}</Text>
                <Text style={styles.statLabel}>Done Today</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{data.recent_redemptions.length}</Text>
                <Text style={styles.statLabel}>Rewards Won</Text>
              </View>
            </View>

            {/* Today's completions */}
            <Text style={styles.sectionTitle}>Today's Activity</Text>
            {data.today_completions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No tasks completed today yet</Text>
              </View>
            ) : (
              data.today_completions.map((c, i) => (
                <View key={i} style={styles.activityCard}>
                  <Ionicons name="checkmark-circle" size={20} color="#98FB98" />
                  <Text style={styles.activityText}>{c.task_name}</Text>
                  <Text style={styles.activityPts}>+{c.points_earned} pts</Text>
                </View>
              ))
            )}

            {/* Recent rewards */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recent Rewards</Text>
            {data.recent_redemptions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No rewards redeemed yet</Text>
              </View>
            ) : (
              data.recent_redemptions.map((r, i) => (
                <View key={i} style={styles.activityCard}>
                  <Ionicons name="gift" size={20} color="#FFD700" />
                  <Text style={styles.activityText}>{r.reward_name}</Text>
                  <Text style={styles.activityPts}>-{r.points_spent} pts</Text>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF0F5' },
  // Login
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  subtitle: {
    fontSize: 14,
    color: '#8D6E63',
    marginTop: 8,
    marginBottom: 32,
  },
  pinInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 24,
    color: '#4A4A4A',
    borderWidth: 2,
    borderColor: '#FFD6DE',
    width: '100%',
    textAlign: 'center',
    letterSpacing: 8,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 12,
  },
  loginBtn: {
    backgroundColor: '#FFB7C5',
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 24,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    color: '#C4A0A8',
    fontSize: 12,
    marginTop: 16,
  },
  // Dashboard
  content: { padding: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#FFB7C5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userEmoji: { fontSize: 40, marginRight: 16 },
  userInfo: {},
  userName: { fontSize: 20, fontWeight: '700', color: '#4A4A4A' },
  userPoints: { fontSize: 16, color: '#FF9EAA', fontWeight: '600', marginTop: 4 },
  userStreak: { fontSize: 14, color: '#8D6E63', marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF9EAA',
  },
  statLabel: {
    fontSize: 11,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    color: '#C4A0A8',
    fontSize: 14,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  activityPts: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9EAA',
  },
});
