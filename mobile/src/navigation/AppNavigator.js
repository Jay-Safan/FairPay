import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase/firebaseConfig';

// Import screens
import LoadingScreen from '../screens/LoadingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import GroupsListScreen from '../screens/groups/GroupsListScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import JoinGroupScreen from '../screens/groups/JoinGroupScreen';
import CreateBillScreen from '../screens/groups/CreateBillScreen';
import BillDetailScreen from '../screens/groups/BillDetailScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const AppNavigator = () => (
  <AppStack.Navigator screenOptions={{ headerShown: false }}>
    <AppStack.Screen name="GroupsList" component={GroupsListScreen} />
    <AppStack.Screen name="GroupDetail" component={GroupDetailScreen} />
    <AppStack.Screen name="CreateGroup" component={CreateGroupScreen} />
    <AppStack.Screen name="JoinGroup" component={JoinGroupScreen} />
    <AppStack.Screen name="CreateBill" component={CreateBillScreen} />
    <AppStack.Screen name="BillDetail" component={BillDetailScreen} />
    <AppStack.Screen name="Settings" component={SettingsScreen} />
  </AppStack.Navigator>
);

const RootNavigator = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? <AppNavigator /> : <AuthNavigator />;
};

export default RootNavigator;
