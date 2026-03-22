import { useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  Modal, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../_layout';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SettingsScreen() {
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  // Task creation
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPoints, setTaskPoints] = useState('1');
  const [taskType, setTaskType] = useState('manual');
  const [taskDuration, setTaskDuration] = useState('0');
  const [addingTask, setAddingTask] = useState(false);

  // Reward creation
  const [showAddReward, setShowAddReward] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardCost, setRewardCost] = useState('10');
  const [rewardEmoji, setRewardEmoji] = useState('🎁');
  const [addingReward, setAddingReward] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${API}/api/photos`);
      setPhotos(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const addTask = async () => {
    if (!taskName.trim()) return;
    setAddingTask(true);
    try {
      const res = await fetch(`${API}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: taskName.trim(),
          description: taskDesc.trim(),
          points: parseInt(taskPoints) || 1,
          task_type: taskType,
          duration_minutes: taskType === 'timer' ? parseInt(taskDuration) || 0 : 0,
          icon: 'star',
        }),
      });
      if (res.ok) {
        setTaskName(''); setTaskDesc(''); setTaskPoints('1'); setTaskDuration('0');
        setShowAddTask(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTask(false);
    }
  };

  const addReward = async () => {
    if (!rewardName.trim()) return;
    setAddingReward(true);
    try {
      const res = await fetch(`${API}/api/rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rewardName.trim(),
          description: rewardDesc.trim(),
          points_cost: parseInt(rewardCost) || 10,
          emoji: rewardEmoji,
        }),
      });
      if (res.ok) {
        setRewardName(''); setRewardDesc(''); setRewardCost('10');
        setShowAddReward(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingReward(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setUploadingPhoto(true);
      try {
        await fetch(`${API}/api/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_data: `data:image/jpeg;base64,${result.assets[0].base64}`,
            name: `Photo ${photos.length + 1}`,
          }),
        });
        fetchPhotos();
      } catch (e) {
        console.error(e);
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const deletePhoto = async (id: string) => {
    try {
      await fetch(`${API}/api/photos/${id}`, { method: 'DELETE' });
      fetchPhotos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const EMOJIS = ['🎁', '🤗', '🍫', '🎬', '💆', '🛍️', '💕', '✈️', '🧸', '🎮', '🍰', '💐'];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* User info */}
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🐷</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userSub}>Piggie Points Champion</Text>
            </View>
          </View>
        </View>

        {/* Customize section */}
        <Text style={styles.sectionTitle}>Customize</Text>

        <TouchableOpacity testID="add-task-settings-btn" style={styles.optionCard} onPress={() => setShowAddTask(true)}>
          <View style={styles.optionIcon}><Ionicons name="add-circle-outline" size={24} color="#FF9EAA" /></View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Add Custom Task</Text>
            <Text style={styles.optionSub}>Create your own daily tasks</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C4A0A8" />
        </TouchableOpacity>

        <TouchableOpacity testID="add-reward-settings-btn" style={styles.optionCard} onPress={() => setShowAddReward(true)}>
          <View style={styles.optionIcon}><Ionicons name="gift-outline" size={24} color="#FF9EAA" /></View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Add Custom Reward</Text>
            <Text style={styles.optionSub}>Set new rewards for the spin wheel</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C4A0A8" />
        </TouchableOpacity>

        <TouchableOpacity testID="add-photo-settings-btn" style={styles.optionCard} onPress={pickPhoto} disabled={uploadingPhoto}>
          <View style={styles.optionIcon}>
            {uploadingPhoto ? <ActivityIndicator color="#FF9EAA" /> : <Ionicons name="camera-outline" size={24} color="#FF9EAA" />}
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Add Background Photo</Text>
            <Text style={styles.optionSub}>{photos.length} photos uploaded</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C4A0A8" />
        </TouchableOpacity>

        {/* Photos preview */}
        {photos.length > 0 && (
          <View style={styles.photosRow}>
            {photos.slice(0, 4).map((p) => (
              <TouchableOpacity key={p.id} style={styles.photoThumb} onPress={() => deletePhoto(p.id)}>
                <Ionicons name="image-outline" size={28} color="#FF9EAA" />
                <Ionicons name="close-circle" size={16} color="#FF6B6B" style={styles.photoDelete} />
              </TouchableOpacity>
            ))}
            {photos.length > 4 && (
              <View style={styles.photoThumb}>
                <Text style={styles.morePhotos}>+{photos.length - 4}</Text>
              </View>
            )}
          </View>
        )}

        {/* Other */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Other</Text>

        <TouchableOpacity testID="monitor-settings-btn" style={styles.optionCard} onPress={() => router.push('/monitor')}>
          <View style={styles.optionIcon}><Ionicons name="eye-outline" size={24} color="#FF9EAA" /></View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Monitor Mode</Text>
            <Text style={styles.optionSub}>View progress (PIN required)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C4A0A8" />
        </TouchableOpacity>

        <TouchableOpacity testID="logout-btn" style={[styles.optionCard, { borderColor: '#FFD6DE' }]} onPress={handleLogout}>
          <View style={styles.optionIcon}><Ionicons name="log-out-outline" size={24} color="#FF6B6B" /></View>
          <View style={styles.optionInfo}>
            <Text style={[styles.optionTitle, { color: '#FF6B6B' }]}>Logout</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Task</Text>
            <TextInput testID="task-name-input" style={styles.input} placeholder="Task name" placeholderTextColor="#C4A0A8" value={taskName} onChangeText={setTaskName} />
            <TextInput testID="task-desc-input" style={styles.input} placeholder="Description" placeholderTextColor="#C4A0A8" value={taskDesc} onChangeText={setTaskDesc} />
            <TextInput testID="task-points-input" style={styles.input} placeholder="Points" placeholderTextColor="#C4A0A8" value={taskPoints} onChangeText={setTaskPoints} keyboardType="number-pad" />

            <Text style={styles.typeLabel}>Task Type</Text>
            <View style={styles.typeRow}>
              {(['manual', 'timer', 'wake_check'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  testID={`task-type-${t}`}
                  style={[styles.typeBtn, taskType === t && styles.typeBtnActive]}
                  onPress={() => setTaskType(t)}
                >
                  <Text style={[styles.typeBtnText, taskType === t && styles.typeBtnTextActive]}>
                    {t === 'manual' ? 'Manual' : t === 'timer' ? 'Timer' : 'Wake'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {taskType === 'timer' && (
              <TextInput testID="task-duration-input" style={styles.input} placeholder="Duration (minutes)" placeholderTextColor="#C4A0A8" value={taskDuration} onChangeText={setTaskDuration} keyboardType="number-pad" />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity testID="cancel-task-btn" style={styles.cancelBtn} onPress={() => setShowAddTask(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-task-btn" style={styles.saveBtn} onPress={addTask} disabled={addingTask}>
                {addingTask ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Reward Modal */}
      <Modal visible={showAddReward} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Reward</Text>
            <TextInput testID="reward-name-input" style={styles.input} placeholder="Reward name" placeholderTextColor="#C4A0A8" value={rewardName} onChangeText={setRewardName} />
            <TextInput testID="reward-desc-input" style={styles.input} placeholder="Description" placeholderTextColor="#C4A0A8" value={rewardDesc} onChangeText={setRewardDesc} />
            <TextInput testID="reward-cost-input" style={styles.input} placeholder="Points cost" placeholderTextColor="#C4A0A8" value={rewardCost} onChangeText={setRewardCost} keyboardType="number-pad" />

            <Text style={styles.typeLabel}>Choose Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, rewardEmoji === e && styles.emojiBtnActive]}
                  onPress={() => setRewardEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity testID="cancel-reward-btn" style={styles.cancelBtn} onPress={() => setShowAddReward(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-reward-btn" style={styles.saveBtn} onPress={addReward} disabled={addingReward}>
                {addingReward ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28 },
  userInfo: {},
  userName: { fontSize: 20, fontWeight: '700', color: '#4A4A4A' },
  userSub: { fontSize: 13, color: '#8D6E63', marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8D6E63',
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#4A4A4A' },
  optionSub: { fontSize: 12, color: '#8D6E63', marginTop: 2 },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  photoThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFE4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDelete: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  morePhotos: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9EAA',
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
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD6DE',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#FFB7C5',
    borderColor: '#FFB7C5',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C4A0A8',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  emojiRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF5F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnActive: {
    borderColor: '#FFB7C5',
    backgroundColor: '#FFE4E8',
  },
  emojiText: { fontSize: 22 },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
