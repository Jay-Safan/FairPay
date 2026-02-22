import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../services/firebase/firebaseConfig';
import { deleteBill, listenBill } from '../../services/firebase/bills';
import { formatCurrency } from '../../utils/billing';

const BillDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { groupId, billId } = route.params;
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberNames, setMemberNames] = useState({});

  useEffect(() => {
    // Get member names from route params or fetch them
    if (route.params.members) {
      const names = {};
      route.params.members.forEach(member => {
        names[member.id] = member.displayName;
      });
      setMemberNames(names);
    }
  }, [route.params]);

  useEffect(() => {
    if (billId === 'new') {
      // If it's a newly created bill, navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 100);
      return;
    }

    const unsubscribe = listenBill(groupId, billId, (billData) => {
      setBill(billData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [billId, groupId, navigation]);

  const handleDeleteBill = async () => {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBill(groupId, billId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bill');
            }
          }
        }
      ]
    );
  };

  const canDelete = bill && (
    auth.currentUser.uid === bill.createdBy || 
    route.params.currentUserRole === 'owner'
  );

  const renderBreakdownItem = ({ item }) => {
    const [uid, data] = item;
    return (
      <View style={styles.breakdownItem}>
        <Text style={styles.breakdownName}>{memberNames[uid] || 'Unknown'}</Text>
        <View style={styles.breakdownAmounts}>
          <Text style={styles.breakdownText}>Owes: {formatCurrency(data.owes)}</Text>
          <Text style={styles.breakdownText}>Paid: {formatCurrency(data.paid)}</Text>
          <Text style={[styles.breakdownText, styles.netText, data.net >= 0 ? styles.netPositive : styles.netNegative]}>
            Net: {formatCurrency(data.net)}
          </Text>
        </View>
      </View>
    );
  };

  const renderSettlement = ({ item }) => (
    <View style={styles.settlementItem}>
      <Text style={styles.settlementText}>
        {memberNames[item.from] || 'Unknown'} pays {memberNames[item.to] || 'Unknown'} {formatCurrency(item.amount)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading bill...</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bill not found</Text>
      </View>
    );
  }

  const breakdownData = Object.entries(bill.breakdown || {});

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top > 0 ? insets.top : 20 }}>
      <View style={styles.header}>
        <Text style={styles.billTitle}>{bill.title}</Text>
        <Text style={styles.billAmount}>{formatCurrency(bill.totalAmount, bill.currency)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bill Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Paid by:</Text>
          <Text style={styles.detailValue}>{memberNames[bill.paidBy] || 'Unknown'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Split method:</Text>
          <Text style={styles.detailValue}>{bill.splitMethod}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Participants:</Text>
          <Text style={styles.detailValue}>{bill.participants?.length || 0} people</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Breakdown</Text>
        <FlatList
          data={breakdownData}
          renderItem={renderBreakdownItem}
          keyExtractor={([uid]) => uid}
          scrollEnabled={false}
        />
      </View>

      {bill.settlements && bill.settlements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlements</Text>
          <FlatList
            data={bill.settlements}
            renderItem={renderSettlement}
            keyExtractor={(item, index) => `${item.from}-${item.to}-${index}`}
            scrollEnabled={false}
          />
        </View>
      )}

      {canDelete && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteBill}>
            <Text style={styles.deleteButtonText}>Delete Bill</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
  billTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  billAmount: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  breakdownName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  breakdownAmounts: {
    alignItems: 'flex-end',
  },
  breakdownText: {
    fontSize: 14,
    color: '#666',
  },
  netText: {
    fontWeight: '600',
    marginTop: 2,
  },
  netPositive: {
    color: '#28a745',
  },
  netNegative: {
    color: '#dc3545',
  },
  settlementItem: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  settlementText: {
    fontSize: 16,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BillDetailScreen;
