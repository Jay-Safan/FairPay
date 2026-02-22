import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, Clipboard } from 'react-native';
import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '../../services/firebase/firebaseConfig';
import { listenGroupMembers } from '../../services/firebase/groups';
import { listenBills } from '../../services/firebase/bills';
import { formatCurrency } from '../../utils/billing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GroupDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch group details
    const fetchGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(firestore, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroup({ id: groupDoc.id, ...groupDoc.data() });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load group details');
      }
    };

    fetchGroup();

    // Listen to group members
    const membersUnsubscribe = listenGroupMembers(groupId, (groupMembers) => {
      setMembers(groupMembers);
    });

    // Listen to bills
    const billsUnsubscribe = listenBills(groupId, (groupBills) => {
      setBills(groupBills);
      setLoading(false);
    });

    return () => {
      membersUnsubscribe();
      billsUnsubscribe();
    };
  }, [groupId]);

  const handleCopyInviteCode = async () => {
    if (group?.inviteCode) {
      await Clipboard.setString(group.inviteCode);
      Alert.alert('Copied', 'Invite code copied to clipboard!');
    }
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberItem}>
      <Text style={styles.memberName}>{item.displayName}</Text>
      <Text style={styles.memberRole}>{item.role}</Text>
    </View>
  );

  const renderBill = ({ item }) => {
    const createdAt = item.createdAt?.toDate?.() || new Date();
    const dateStr = createdAt.toLocaleDateString();

    return (
      <TouchableOpacity 
        style={styles.billItem}
        onPress={() => navigation.navigate('BillDetail', { 
          groupId, 
          billId: item.id, 
          members: members,
          currentUserRole: members.find(m => m.id === auth.currentUser.uid)?.role
        })}
      >
        <View style={styles.billHeader}>
          <Text style={styles.billTitle}>{item.title}</Text>
          <Text style={styles.billAmount}>{formatCurrency(item.totalAmount, item.currency)}</Text>
        </View>
        <View style={styles.billFooter}>
          <Text style={styles.billDate}>{dateStr}</Text>
          <Text style={styles.billSplit}>{item.splitMethod}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.groupName}>{group.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invite Code</Text>
        <View style={styles.inviteCodeContainer}>
          <Text style={styles.inviteCode}>{group.inviteCode}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyInviteCode}>
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
        </View>
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          style={styles.membersList}
          horizontal={false}
          nestedScrollEnabled={false}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bills ({bills.length})</Text>
          <TouchableOpacity 
            style={styles.createBillButton}
            onPress={() => navigation.navigate('CreateBill', { groupId, members })}
          >
            <Text style={styles.createBillButtonText}>Create Bill</Text>
          </TouchableOpacity>
        </View>
        
        {bills.length === 0 ? (
          <Text style={styles.emptyText}>No bills yet. Create your first bill!</Text>
        ) : (
          <FlatList
            data={bills}
            renderItem={renderBill}
            keyExtractor={(item) => item.id}
            style={styles.billsList}
            nestedScrollEnabled={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
  },
  inviteCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  copyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  membersList: {
    maxHeight: 150,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  billsList: {
    maxHeight: 300,
  },
  billItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billDate: {
    fontSize: 14,
    color: '#666',
  },
  billSplit: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  createBillButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createBillButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default GroupDetailScreen;
