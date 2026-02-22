import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../services/firebase/firebaseConfig';
import { joinGroup } from '../../services/firebase/groups';

const JoinGroupScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to join a group');
        return;
      }

      const groupId = await joinGroup(inviteCode.toUpperCase(), user);
      Alert.alert('Success', 'You have joined the group!');
      navigation.navigate('GroupDetail', { groupId });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: 50 }}>
        <Text style={styles.title}>Join Group</Text>
        <Text style={styles.subtitle}>Enter the invite code to join an existing group</Text>
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="Invite Code"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        textAlign="center"
        maxLength={6}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleJoinGroup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Join Group</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JoinGroupScreen;
