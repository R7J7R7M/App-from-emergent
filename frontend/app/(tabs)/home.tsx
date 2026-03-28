import { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthContext } from '../_layout';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

type Task = {
  id: string;
  name: string;
  description: string;
  points: number;
  task_type: string;
  duration_minutes: number;
  icon: string;
  is_default: boolean;
  completed_today: boolean;
  completion_info?: any;
};

const ICON_MAP: Record<string, string> = {
  walk: 'walk-outline',
  fitness: 'barbell-outline',
  alarm: 'alarm-outline',
  nutrition: 'leaf-outline',
  star: 'star-outline',
};

export default function HomeScreen() {
  const { user, setUser } = useContext(AuthContext);
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [points, setPoints] = useState({ total_points: 0, current_streak: 0, streak_bonus_active: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [tasksRes, pointsRes] = await Promise.all([
        fetch(`${API}/api/tasks/today/${user.id}`),
        fetch(`${API}/api/points/${user.id}`),
      ]);
      const tasksData = await tasksRes.json();
      const pointsData = await pointsRes.json();
      setTasks(tasksData);
      setPoints(pointsData);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Delete "${task.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(task.id);
            try {
              const res = await fetch(`${API}/api/tasks/${task.id}`, { method: 'DELETE' });
              if (res.ok) fetchData();
            } catch (e) {
              console.error(e);
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleTaskPress = async (task: Task) => {
    if (task.completed_today) return;

    if (task.task_type === 'timer') {
      router.push({
        pathname: '/timer',
        params: {
          taskId: task.id,
          taskName: task.name,
          duration: task.duration_minutes.toString(),
          points: task.points.toString(),
          userId: user?.id || '',
        },
      });
      return;
    }

    // For wake_check: verify current hour
    if (task.task_type === 'wake_check') {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 6) {
        // Allow but note it's past 6
      }
    }

    // Manual or wake_check complete
    setCompleting(task.id);
    try {
      const res = await fetch(`${API}/api/tasks/complete/${user?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, duration_seconds: 0 }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(null);
    }
  };

  const completedCount = tasks.filter(t => t.completed_today).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  if (!user) {
    router.replace('/');
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#FFB7C5" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {user.name}!</Text>
            <Text style={styles.subGreeting}>Let's earn some piggie points today</Text>
          </View>
          <View style={styles.pigBadge}>
            <Text style={styles.pigEmoji}>🐷</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.pointsCard]}>
            <Text style={styles.statEmoji}>✨</Text>
            <Text style={styles.statNumber}>{points.total_points}</Text>
            <Text style={styles.statLabel}>Piggie Points</Text>
          </View>
          <View style={[styles.statCard, styles.streakCard]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statNumber}>{points.current_streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Streak bonus banner */}
        {points.streak_bonus_active && (
          <View style={styles.bonusBanner} testID="streak-bonus-banner">
            <Text style={styles.bonusText}>🎉 4+ Day Streak! Points are DOUBLED!</Text>
          </View>
        )}

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressCount}>{completedCount}/{totalCount}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* Tasks */}
        <Text style={styles.sectionTitle}>Daily Tasks</Text>
        {loading ? (
          <ActivityIndicator color="#FFB7C5" size="large" style={{ marginTop: 32 }} />
        ) : (
          tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              testID={`task-card-${task.id}`}
              style={[styles.taskCard, task.completed_today && styles.taskCompleted]}
              onPress={() => handleTaskPress(task)}
              activeOpacity={0.7}
              disabled={completing === task.id}
            >
              <View style={[styles.taskIcon, task.completed_today && styles.taskIconDone]}>
                {task.completed_today ? (
                  <Ionicons name="checkmark-circle" size={28} color="#98FB98" />
                ) : (
                  <Ionicons name={(ICON_MAP[task.icon] || 'star-outline') as any} size={28} color="#FF9EAA" />
                )}
              </View>
              <View style={styles.taskInfo}>
                <Text style={[styles.taskName, task.completed_today && styles.taskNameDone]}>
                  {task.name}
                </Text>
                <Text style={styles.taskDesc}>{task.description}</Text>
                <View style={styles.taskMeta}>
                  {task.task_type === 'timer' && (
                    <View style={styles.badge}>
                      <Ionicons name="time-outline" size={12} color="#FF9EAA" />
                      <Text style={styles.badgeText}>{task.duration_minutes}min</Text>
                    </View>
                  )}
                  {task.task_type === 'wake_check' && (
                    <View style={styles.badge}>
                      <Ionicons name="alarm-outline" size={12} color="#FF9EAA" />
                      <Text style={styles.badgeText}>Before 6 AM</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.taskPoints}>
                {completing === task.id ? (
                  <ActivityIndicator size="small" color="#FFB7C5" />
                ) : (
                  <>
                    <Text style={styles.pointsNum}>+{points.streak_bonus_active ? task.points * 2 : task.points}</Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                  </>
                )}
              </View>
              {!task.is_default && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteTask(task)}
                  disabled={deleting === task.id}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deleting === task.id ? (
                    <ActivityIndicator size="small" color="#FF9EAA" />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color="#FF9EAA" />
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF0F5' },
  scroll: { flex: 1 },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  subGreeting: {
    fontSize: 14,
    color: '#8D6E63',
    marginTop: 4,
  },
  pigBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pigEmoji: { fontSize: 32 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  pointsCard: {
    backgroundColor: '#FFE4E8',
  },
  streakCard: {
    backgroundColor: '#FFF5E1',
  },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  statLabel: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '500',
    marginTop: 2,
  },
  bonusBanner: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  bonusText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5D4037',
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#FFB7C5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9EAA',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#FFE4E8',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9EAA',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCompleted: {
    backgroundColor: '#F0FFF0',
    opacity: 0.85,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  taskIconDone: {
    backgroundColor: '#E8FFE8',
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  taskNameDone: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDesc: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
  },
  taskMeta: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#FF9EAA',
    fontWeight: '500',
  },
  taskPoints: {
    alignItems: 'center',
    marginLeft: 8,
  },
  pointsNum: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9EAA',
  },
  pointsLabel: {
    fontSize: 11,
    color: '#C4A0A8',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
