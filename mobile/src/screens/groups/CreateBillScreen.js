import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../services/firebase/firebaseConfig';
import { createBill } from '../../services/firebase/bills';
import { validateBillData, formatCurrency } from '../../utils/billing';

const CreateBillScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { groupId, members } = route.params;
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [paidBy, setPaidBy] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [customShares, setCustomShares] = useState({});
  
  // Validation errors
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    // Set default paidBy to current user
    if (auth.currentUser && members.length > 0) {
      setPaidBy(auth.currentUser.uid);
      setSelectedParticipants([auth.currentUser.uid]);
    }
  }, [members]);

  const toggleParticipant = (uid) => {
    setSelectedParticipants(prev => {
      if (prev.includes(uid)) {
        return prev.filter(id => id !== uid);
      } else {
        return [...prev, uid];
      }
    });
  };

  const updateCustomShare = (uid, amount) => {
    setCustomShares(prev => ({
      ...prev,
      [uid]: parseFloat(amount) || 0
    }));
  };

  const validateAndSubmit = async () => {
    const billData = {
      title: title.trim(),
      totalAmount: parseFloat(totalAmount) || 0,
      splitMethod,
      participants: selectedParticipants,
      paidBy,
      createdBy: auth.currentUser.uid,
      ...(splitMethod === 'custom' && { customShares })
    };

    const validationErrors = validateBillData(billData);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      await createBill(groupId, billData);
      navigation.navigate('BillDetail', { groupId, billId: 'new' }); // Will be updated by listener
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderParticipant = (member) => {
    const isSelected = selectedParticipants.includes(member.id);
    const isPaidBy = paidBy === member.id;

    return (
      <View key={member.id} style={styles.participantItem}>
        <TouchableOpacity
          style={[styles.participantCheckbox, isSelected && styles.participantSelected]}
          onPress={() => toggleParticipant(member.id)}
        >
          <Text style={styles.checkboxText}>{isSelected ? '✓' : ''}</Text>
        </TouchableOpacity>
        
        <Text style={styles.participantName}>{member.displayName || member.name || 'Unknown'}</Text>
        
        <TouchableOpacity
          style={[styles.paidByButton, isPaidBy && styles.paidBySelected]}
          onPress={() => setPaidBy(member.id)}
        >
          <Text style={styles.paidByText}>Paid</Text>
        </TouchableOpacity>

        {splitMethod === 'custom' && isSelected && (
          <TextInput
            style={styles.customShareInput}
            placeholder="0.00"
            value={customShares[member.id]?.toString() || ''}
            onChangeText={(value) => updateCustomShare(member.id, value)}
            keyboardType="numeric"
          />
        )}
      </View>
    );
  };

  const totalCustomShares = Object.values(customShares).reduce((sum, share) => sum + share, 0);
  const customShareError = splitMethod === 'custom' && Math.abs(totalCustomShares - parseFloat(totalAmount || 0)) > 0.01;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingTop: 50, paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <Text style={styles.title}>Create Bill</Text>

        {errors.length > 0 && (
          <View style={styles.errorContainer}>
            {errors.map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
          </View>
        )}

      <View style={styles.section}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter bill title"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Total Amount *</Text>
        <TextInput
          style={styles.input}
          value={totalAmount}
          onChangeText={setTotalAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Split Method</Text>
        <View style={styles.splitMethodContainer}>
          <TouchableOpacity
            style={[styles.splitMethodButton, splitMethod === 'equal' && styles.splitMethodSelected]}
            onPress={() => setSplitMethod('equal')}
          >
            <Text style={styles.splitMethodText}>Equal Split</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.splitMethodButton, splitMethod === 'custom' && styles.splitMethodSelected]}
            onPress={() => setSplitMethod('custom')}
          >
            <Text style={styles.splitMethodText}>Custom Split</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Participants (min 2)</Text>
        {members.map(renderParticipant)}
      </View>

      {splitMethod === 'custom' && customShareError && (
        <Text style={styles.customShareError}>
          Custom shares ({formatCurrency(totalCustomShares)}) must equal total amount ({formatCurrency(parseFloat(totalAmount || 0))})
        </Text>
      )}

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={validateAndSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create Bill</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    marginBottom: 2,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  splitMethodContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  splitMethodButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  splitMethodSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  splitMethodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  participantCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  participantSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  participantName: {
    flex: 1,
    fontSize: 16,
  },
  paidByButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 8,
  },
  paidBySelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  paidByText: {
    fontSize: 12,
    fontWeight: '500',
  },
  customShareInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 4,
    textAlign: 'right',
    fontSize: 14,
  },
  customShareError: {
    color: '#c00',
    fontSize: 14,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateBillScreen;
