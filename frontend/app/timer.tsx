import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

export default function TimerScreen() {
  const params = useLocalSearchParams<{
    taskId: string;
    taskName: string;
    duration: string;
    points: string;
    userId: string;
  }>();
  const router = useRouter();

  const totalSeconds = (parseInt(params.duration || '0')) * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = () => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setCompleted(true);
          Vibration.vibrate([0, 500, 200, 500]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resetTimer = () => {
    setRunning(false);
    setCompleted(false);
    setSecondsLeft(totalSeconds);
    elapsedRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const submitCompletion = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/tasks/complete/${params.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: params.taskId,
          duration_seconds: elapsedRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Failed to submit');
        return;
      }
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity testID="timer-close-btn" style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#8D6E63" />
        </TouchableOpacity>

        {/* Task name */}
        <Text style={styles.taskName}>{params.taskName}</Text>
        <Text style={styles.taskSub}>
          {completed ? 'Completed!' : running ? 'Keep going, you got this!' : 'Ready to start?'}
        </Text>

        {/* Timer circle */}
        <View style={styles.timerCircle}>
          {/* Progress ring background */}
          <View style={styles.progressRing}>
            <View style={[styles.progressFill, { 
              borderTopColor: progress > 0.25 ? '#FF9EAA' : 'transparent',
              borderRightColor: progress > 0.5 ? '#FF9EAA' : 'transparent',
              borderBottomColor: progress > 0.75 ? '#FF9EAA' : 'transparent',
              borderLeftColor: progress > 0 ? '#FF9EAA' : 'transparent',
              transform: [{ rotate: `${progress * 360}deg` }],
            }]} />
          </View>
          <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
          <Text style={styles.timerLabel}>
            {completed ? 'Done!' : `of ${formatTime(totalSeconds)}`}
          </Text>
        </View>

        {/* Points info */}
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsText}>+{params.points} Piggie Points</Text>
        </View>

        {/* Controls */}
        {completed ? (
          <TouchableOpacity
            testID="timer-submit-btn"
            style={styles.submitBtn}
            onPress={submitCompletion}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? 'Saving...' : 'Claim Points!'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.controls}>
            {!running ? (
              <TouchableOpacity testID="timer-start-btn" style={styles.startBtn} onPress={startTimer}>
                <Ionicons name="play" size={36} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="timer-pause-btn" style={styles.pauseBtn} onPress={pauseTimer}>
                <Ionicons name="pause" size={36} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity testID="timer-reset-btn" style={styles.resetBtn} onPress={resetTimer}>
              <Ionicons name="refresh" size={24} color="#C4A0A8" />
            </TouchableOpacity>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const CIRCLE_SIZE = width * 0.65;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF0F5' },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A4A4A',
    marginTop: 20,
    textAlign: 'center',
  },
  taskSub: {
    fontSize: 16,
    color: '#8D6E63',
    marginTop: 8,
    marginBottom: 32,
  },
  timerCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB7C5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 6,
    borderColor: '#FFE4E8',
  },
  progressRing: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 6,
  },
  timerText: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FF9EAA',
    letterSpacing: 2,
  },
  timerLabel: {
    fontSize: 16,
    color: '#C4A0A8',
    marginTop: 4,
  },
  pointsInfo: {
    marginTop: 32,
    backgroundColor: '#FFE4E8',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9EAA',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 40,
  },
  startBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF9EAA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9EAA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  pauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#98FB98',
    borderRadius: 9999,
    paddingVertical: 18,
    paddingHorizontal: 48,
    marginTop: 40,
    shadowColor: '#98FB98',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    color: '#2E7D32',
    fontSize: 20,
    fontWeight: '700',
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
});
