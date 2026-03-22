import { useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Modal, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../_layout';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

type Goal = {
  id: string;
  title: string;
  description: string;
  target_points: number;
  current_points: number;
  goal_type: string;
  completed: boolean;
  created_at: string;
};

export default function GoalsScreen() {
  const { user } = useContext(AuthContext);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [targetPts, setTargetPts] = useState('50');
  const [goalType, setGoalType] = useState<'short' | 'long'>('short');
  const [adding, setAdding] = useState(false);

  const fetchGoals = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/api/goals/${user.id}`);
      const data = await res.json();
      setGoals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const addGoal = async () => {
    if (!title.trim() || !user) return;
    setAdding(true);
    try {
      const res = await fetch(`${API}/api/goals/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim(),
          target_points: parseInt(targetPts) || 50,
          goal_type: goalType,
        }),
      });
      if (res.ok) {
        setTitle(''); setDesc(''); setTargetPts('50');
        setShowAdd(false);
        fetchGoals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await fetch(`${API}/api/goals/${goalId}`, { method: 'DELETE' });
      fetchGoals();
    } catch (e) {
      console.error(e);
    }
  };

  const shortGoals = goals.filter(g => g.goal_type === 'short');
  const longGoals = goals.filter(g => g.goal_type === 'long');

  const renderGoal = (goal: Goal) => {
    const progress = goal.target_points > 0 ? Math.min(goal.current_points / goal.target_points, 1) : 0;
    return (
      <View key={goal.id} style={[styles.goalCard, goal.completed && styles.goalDone]} testID={`goal-card-${goal.id}`}>
        <View style={styles.goalHeader}>
          <View style={styles.goalLeft}>
            {goal.completed ? (
              <Ionicons name="checkmark-circle" size={24} color="#98FB98" />
            ) : (
              <Ionicons name="flag-outline" size={24} color="#FF9EAA" />
            )}
            <Text style={[styles.goalTitle, goal.completed && styles.goalTitleDone]}>{goal.title}</Text>
          </View>
          <TouchableOpacity testID={`delete-goal-${goal.id}`} onPress={() => deleteGoal(goal.id)}>
            <Ionicons name="trash-outline" size={20} color="#C4A0A8" />
          </TouchableOpacity>
        </View>
        {goal.description ? <Text style={styles.goalDesc}>{goal.description}</Text> : null}
        <View style={styles.goalProgress}>
          <View style={styles.goalBar}>
            <View style={[styles.goalBarFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.goalPts}>{goal.current_points}/{goal.target_points} pts</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGoals(); }} tintColor="#FFB7C5" />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Goals</Text>
          <TouchableOpacity testID="add-goal-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#FFB7C5" size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Short-term Goals */}
            <Text style={styles.sectionTitle}>Short-term Goals</Text>
            {shortGoals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No short-term goals yet</Text>
                <Text style={styles.emptyHint}>Tap + to add one!</Text>
              </View>
            ) : (
              shortGoals.map(renderGoal)
            )}

            {/* Long-term Goals */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Long-term Goals</Text>
            {longGoals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No long-term goals yet</Text>
                <Text style={styles.emptyHint}>Dream big!</Text>
              </View>
            ) : (
              longGoals.map(renderGoal)
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Goal</Text>

            <TextInput
              testID="goal-title-input"
              style={styles.input}
              placeholder="Goal title"
              placeholderTextColor="#C4A0A8"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              testID="goal-desc-input"
              style={styles.input}
              placeholder="Description (optional)"
              placeholderTextColor="#C4A0A8"
              value={desc}
              onChangeText={setDesc}
            />
            <TextInput
              testID="goal-target-input"
              style={styles.input}
              placeholder="Target points"
              placeholderTextColor="#C4A0A8"
              value={targetPts}
              onChangeText={setTargetPts}
              keyboardType="number-pad"
            />

            <View style={styles.typeRow}>
              <TouchableOpacity
                testID="goal-type-short"
                style={[styles.typeBtn, goalType === 'short' && styles.typeBtnActive]}
                onPress={() => setGoalType('short')}
              >
                <Text style={[styles.typeBtnText, goalType === 'short' && styles.typeBtnTextActive]}>Short-term</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="goal-type-long"
                style={[styles.typeBtn, goalType === 'long' && styles.typeBtnActive]}
                onPress={() => setGoalType('long')}
              >
                <Text style={[styles.typeBtnText, goalType === 'long' && styles.typeBtnTextActive]}>Long-term</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity testID="cancel-goal-btn" style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-goal-btn" style={styles.saveBtn} onPress={addGoal} disabled={adding}>
                {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF0F5' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFB7C5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB7C5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8D6E63',
    marginBottom: 12,
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  goalDone: {
    backgroundColor: '#F0FFF0',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    flex: 1,
  },
  goalTitleDone: {
    textDecorationLine: 'line-through',
    color: '#98FB98',
  },
  goalDesc: {
    fontSize: 13,
    color: '#8D6E63',
    marginTop: 6,
    marginLeft: 34,
  },
  goalProgress: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#FFE4E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: '#FF9EAA',
    borderRadius: 4,
  },
  goalPts: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9EAA',
    minWidth: 60,
    textAlign: 'right',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#C4A0A8',
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
    color: '#FFB7C5',
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFF5F7',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#4A4A4A',
    borderWidth: 1.5,
    borderColor: '#FFD6DE',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD6DE',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#FFB7C5',
    borderColor: '#FFB7C5',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C4A0A8',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#FFD6DE',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#C4A0A8',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 9999,
    backgroundColor: '#FFB7C5',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
