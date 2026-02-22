import { collection, doc, setDoc, deleteDoc, onSnapshot, orderBy, query, serverTimestamp, getDoc } from 'firebase/firestore';
import { firestore } from './firebaseConfig';
import { computeBreakdown, computeSettlements } from '../../utils/billing';

// Listen to bills for a group in real-time
export const listenBills = (groupId, callback) => {
  const billsRef = collection(firestore, 'groups', groupId, 'bills');
  const q = query(billsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const bills = [];
    snapshot.forEach((doc) => {
      bills.push({ id: doc.id, ...doc.data() });
    });
    callback(bills);
  });
};

// Listen to a specific bill in real-time
export const listenBill = (groupId, billId, callback) => {
  const billRef = doc(firestore, 'groups', groupId, 'bills', billId);
  
  return onSnapshot(billRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

// Create a new bill
export const createBill = async (groupId, billPayload) => {
  const billId = doc(collection(firestore, 'groups', groupId, 'bills')).id;
  
  // Compute breakdown and settlements
  const breakdown = computeBreakdown(
    billPayload.totalAmount,
    billPayload.participants,
    billPayload.paidBy,
    billPayload.splitMethod,
    billPayload.customShares
  );
  
  const settlements = computeSettlements(breakdown);
  
  // Create bill document
  const billData = {
    title: billPayload.title,
    currency: billPayload.currency || 'RM',
    totalAmount: billPayload.totalAmount,
    splitMethod: billPayload.splitMethod,
    participants: billPayload.participants,
    paidBy: billPayload.paidBy,
    createdBy: billPayload.createdBy,
    createdAt: serverTimestamp(),
    breakdown,
    settlements,
  };
  
  // Add custom shares if custom split method
  if (billPayload.splitMethod === 'custom' && billPayload.customShares) {
    billData.customShares = billPayload.customShares;
  }
  
  await setDoc(doc(firestore, 'groups', groupId, 'bills', billId), billData);
  
  return billId;
};

// Delete a bill
export const deleteBill = async (groupId, billId) => {
  await deleteDoc(doc(firestore, 'groups', groupId, 'bills', billId));
};

// Get a single bill (one-time read)
export const getBill = async (groupId, billId) => {
  const billRef = doc(firestore, 'groups', groupId, 'bills', billId);
  const billSnap = await getDoc(billRef);
  
  if (billSnap.exists()) {
    return { id: billSnap.id, ...billSnap.data() };
  } else {
    throw new Error('Bill not found');
  }
};
