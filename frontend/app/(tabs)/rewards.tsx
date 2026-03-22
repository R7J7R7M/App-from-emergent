import { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Easing, Dimensions, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../_layout';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

const WHEEL_COLORS = ['#FFB7C5', '#FFD700', '#98FB98', '#FFC5D3', '#FF9EAA', '#FFFDD0', '#FF6B6B', '#87CEEB'];

type Reward = {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  emoji: string;
};

export default function RewardsScreen() {
  const { user, setUser } = useContext(AuthContext);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonReward, setWonReward] = useState<Reward | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRotation = useRef(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [rewardsRes, pointsRes] = await Promise.all([
        fetch(`${API}/api/rewards`),
        fetch(`${API}/api/points/${user.id}`),
      ]);
      setRewards(await rewardsRes.json());
      const pData = await pointsRes.json();
      setTotalPoints(pData.total_points);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (spinning || !user) return;
    setError('');

    const affordable = rewards.filter(r => r.points_cost <= totalPoints);
    if (affordable.length === 0) {
      setError('Not enough Piggie Points to spin!');
      return;
    }

    setSpinning(true);

    // Animate spin
    const extraRotations = 5 + Math.random() * 5;
    const targetRotation = spinRotation.current + extraRotations;

    Animated.timing(spinAnim, {
      toValue: targetRotation,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      spinRotation.current = targetRotation;

      try {
        const res = await fetch(`${API}/api/rewards/spin/${user.id}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || 'Spin failed');
          setSpinning(false);
          return;
        }
        setWonReward(data.won_reward);
        setTotalPoints(data.points_remaining);
        setShowModal(true);
        // Update user context
        setUser({ ...user, total_points: data.points_remaining });
      } catch (e) {
        setError('Failed to spin. Try again!');
      } finally {
        setSpinning(false);
      }
    });
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#FFB7C5" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Spin & Win!</Text>
        <Text style={styles.subtitle}>Use your Piggie Points to spin for rewards</Text>

        {/* Points display */}
        <View style={styles.pointsDisplay}>
          <Text style={styles.pointsEmoji}>✨</Text>
          <Text style={styles.pointsNum}>{totalPoints}</Text>
          <Text style={styles.pointsLabel}>Piggie Points</Text>
        </View>

        {/* Wheel */}
        <View style={styles.wheelContainer}>
          <View style={styles.pointer}>
            <Ionicons name="caret-down" size={32} color="#FF6B6B" />
          </View>
          <Animated.View style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
            {rewards.slice(0, 8).map((reward, i) => {
              const angle = (i * 360) / Math.min(rewards.length, 8);
              return (
                <View
                  key={reward.id}
                  style={[
                    styles.wheelSlice,
                    {
                      backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length],
                      transform: [
                        { rotate: `${angle}deg` },
                        { translateY: -60 },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.sliceEmoji}>{reward.emoji}</Text>
                  <Text style={styles.sliceText} numberOfLines={1}>{reward.name}</Text>
                </View>
              );
            })}
          </Animated.View>

          <TouchableOpacity
            testID="spin-wheel-btn"
            style={[styles.spinBtn, spinning && styles.spinBtnDisabled]}
            onPress={handleSpin}
            disabled={spinning}
            activeOpacity={0.8}
          >
            <Text style={styles.spinBtnText}>{spinning ? '...' : 'SPIN'}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Rewards catalog */}
        <Text style={styles.sectionTitle}>Reward Catalog</Text>
        {rewards.map((r) => (
          <View key={r.id} style={styles.rewardCard} testID={`reward-card-${r.id}`}>
            <Text style={styles.rewardEmoji}>{r.emoji}</Text>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardName}>{r.name}</Text>
              <Text style={styles.rewardDesc}>{r.description}</Text>
            </View>
            <View style={styles.rewardCost}>
              <Text style={styles.costNum}>{r.points_cost}</Text>
              <Text style={styles.costLabel}>pts</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Win Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>{wonReward?.emoji || '🎁'}</Text>
            <Text style={styles.modalTitle}>You Won!</Text>
            <Text style={styles.modalReward}>{wonReward?.name}</Text>
            <Text style={styles.modalDesc}>{wonReward?.description}</Text>
            <Text style={styles.modalPoints}>-{wonReward?.points_cost} points</Text>
            <TouchableOpacity
              testID="close-win-modal-btn"
              style={styles.modalBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalBtnText}>Yay!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const WHEEL_SIZE = width * 0.7;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF0F5' },
  content: { padding: 20, alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8D6E63',
    marginBottom: 20,
  },
  pointsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E8',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 24,
  },
  pointsEmoji: { fontSize: 20 },
  pointsNum: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF9EAA',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#8D6E63',
  },
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pointer: {
    position: 'absolute',
    top: -8,
    zIndex: 10,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFB7C5',
  },
  wheelSlice: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  sliceEmoji: { fontSize: 22 },
  sliceText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#4A4A4A',
    textAlign: 'center',
  },
  spinBtn: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF9EAA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9EAA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 5,
  },
  spinBtnDisabled: { opacity: 0.6 },
  spinBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A4A4A',
    alignSelf: 'flex-start',
    marginBottom: 16,
    marginTop: 8,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rewardEmoji: { fontSize: 32, marginRight: 14 },
  rewardInfo: { flex: 1 },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  rewardDesc: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
  },
  rewardCost: { alignItems: 'center' },
  costNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
  },
  costLabel: {
    fontSize: 11,
    color: '#C4A0A8',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: width * 0.8,
    shadowColor: '#FFB7C5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalEmoji: { fontSize: 64, marginBottom: 12 },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF9EAA',
  },
  modalReward: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4A4A4A',
    marginTop: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 4,
  },
  modalPoints: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 12,
  },
  modalBtn: {
    backgroundColor: '#FFB7C5',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginTop: 20,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
