import { collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebaseConfig';

// Generate random invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create a new group
export const createGroup = async (groupName, user) => {
  const groupId = doc(collection(firestore, 'groups')).id;
  const inviteCode = generateInviteCode();

  // Create group document
  await setDoc(doc(firestore, 'groups', groupId), {
    name: groupName,
    ownerId: user.uid,
    inviteCode: inviteCode,
    createdAt: serverTimestamp(),
  });

  // Add owner as member
  await setDoc(doc(firestore, 'groups', groupId, 'members', user.uid), {
    role: 'owner',
    displayName: user.displayName || 'Anonymous',
    joinedAt: serverTimestamp(),
  });

  // Create membership link for user
  await setDoc(doc(firestore, 'users', user.uid, 'memberships', groupId), {
    groupId: groupId,
    groupName: groupName,
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  return groupId;
};

// Join a group by invite code
export const joinGroup = async (inviteCode, user) => {
  // Find group by invite code
  const groupsRef = collection(firestore, 'groups');
  const q = query(groupsRef, where('inviteCode', '==', inviteCode));
  const querySnapshot = await getDocs(q);
  
  let groupDoc = null;
  const groups = [];
  querySnapshot.forEach((doc) => {
    groups.push({ id: doc.id, ...doc.data() });
  });

  if (groups.length === 0) {
    throw new Error('Invalid invite code');
  }

  groupDoc = groups[0];

  // Check if already a member
  const memberDoc = await getDoc(doc(firestore, 'groups', groupDoc.id, 'members', user.uid));
  if (memberDoc.exists()) {
    throw new Error('You are already a member of this group');
  }

  // Add user as member
  await setDoc(doc(firestore, 'groups', groupDoc.id, 'members', user.uid), {
    role: 'member',
    displayName: user.displayName || 'Anonymous',
    joinedAt: serverTimestamp(),
  });

  // Create membership link for user
  await setDoc(doc(firestore, 'users', user.uid, 'memberships', groupDoc.id), {
    groupId: groupDoc.id,
    groupName: groupDoc.name,
    role: 'member',
    joinedAt: serverTimestamp(),
  });

  return groupDoc.id;
};

// Listen to user's groups in real-time
export const listenUserGroups = (uid, callback) => {
  const membershipsRef = collection(firestore, 'users', uid, 'memberships');
  const q = query(membershipsRef, orderBy('joinedAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const groups = [];
    snapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() });
    });
    callback(groups);
  });
};

// Listen to group members in real-time
export const listenGroupMembers = (groupId, callback) => {
  const membersRef = collection(firestore, 'groups', groupId, 'members');
  const q = query(membersRef, orderBy('joinedAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const members = [];
    snapshot.forEach((doc) => {
      members.push({ id: doc.id, ...doc.data() });
    });
    callback(members);
  });
};

// Get group by invite code
export const getGroupByInviteCode = async (inviteCode) => {
  const groupsRef = collection(firestore, 'groups');
  const q = query(groupsRef, where('inviteCode', '==', inviteCode));
  const querySnapshot = await getDocs(q);
  
  const groups = [];
  querySnapshot.forEach((doc) => {
    groups.push({ id: doc.id, ...doc.data() });
  });

  if (groups.length === 0) {
    throw new Error('Group not found');
  }

  return groups[0];
};
