// Utility functions for bill calculations

// Round to 2 decimal places safely
export const roundCurrency = (amount) => {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

// Compute equal shares
export const computeEqualShares = (totalAmount, participants) => {
  const equalShare = roundCurrency(totalAmount / participants.length);
  const shares = {};
  
  participants.forEach(uid => {
    shares[uid] = equalShare;
  });
  
  // Adjust for rounding errors
  const totalShares = Object.values(shares).reduce((sum, share) => sum + share, 0);
  const difference = roundCurrency(totalAmount - totalShares);
  
  if (difference !== 0 && participants.length > 0) {
    // Add the difference to the first participant
    const firstParticipant = participants[0];
    shares[firstParticipant] = roundCurrency(shares[firstParticipant] + difference);
  }
  
  return shares;
};

// Compute custom shares
export const computeCustomShares = (totalAmount, participants, customShares) => {
  const shares = {};
  const totalCustomShares = Object.values(customShares).reduce((sum, share) => sum + share, 0);
  
  // Validate custom shares sum
  if (Math.abs(totalCustomShares - totalAmount) > 0.01) {
    throw new Error('Custom shares must sum to total amount');
  }
  
  participants.forEach(uid => {
    shares[uid] = roundCurrency(customShares[uid] || 0);
  });
  
  return shares;
};

// Compute breakdown (owes, paid, net for each person)
export const computeBreakdown = (totalAmount, participants, paidBy, splitMethod, customShares = null) => {
  let shares;
  
  if (splitMethod === 'equal') {
    shares = computeEqualShares(totalAmount, participants);
  } else if (splitMethod === 'custom') {
    shares = computeCustomShares(totalAmount, participants, customShares);
  } else {
    throw new Error('Invalid split method');
  }
  
  const breakdown = {};
  
  participants.forEach(uid => {
    const owes = shares[uid] || 0;
    const paid = uid === paidBy ? totalAmount : 0;
    const net = roundCurrency(paid - owes);
    
    breakdown[uid] = {
      owes: roundCurrency(owes),
      paid: roundCurrency(paid),
      net: roundCurrency(net)
    };
  });
  
  return breakdown;
};

// Compute minimal settlements from breakdown
export const computeSettlements = (breakdown) => {
  const debtors = []; // People who owe money (net < 0)
  const creditors = []; // People who are owed money (net > 0)
  
  Object.entries(breakdown).forEach(([uid, { net }]) => {
    if (net < -0.01) {
      debtors.push({ uid, amount: Math.abs(net) });
    } else if (net > 0.01) {
      creditors.push({ uid, amount: net });
    }
  });
  
  const settlements = [];
  
  // Greedy algorithm to minimize transfers
  let debtorIndex = 0;
  let creditorIndex = 0;
  
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount >= 0.01) {
      settlements.push({
        from: debtor.uid,
        to: creditor.uid,
        amount: roundCurrency(amount)
      });
    }
    
    debtor.amount = roundCurrency(debtor.amount - amount);
    creditor.amount = roundCurrency(creditor.amount - amount);
    
    if (debtor.amount <= 0.01) {
      debtorIndex++;
    }
    if (creditor.amount <= 0.01) {
      creditorIndex++;
    }
  }
  
  return settlements;
};

// Format currency for display
export const formatCurrency = (amount, currency = 'RM') => {
  return `${currency}${amount.toFixed(2)}`;
};

// Validate bill data
export const validateBillData = (billData) => {
  const errors = [];
  
  if (!billData.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (!billData.totalAmount || billData.totalAmount <= 0) {
    errors.push('Total amount must be greater than 0');
  }
  
  if (!billData.splitMethod || !['equal', 'custom'].includes(billData.splitMethod)) {
    errors.push('Valid split method is required');
  }
  
  if (!billData.participants || billData.participants.length < 2) {
    errors.push('At least 2 participants are required');
  }
  
  if (!billData.paidBy) {
    errors.push('Paid by is required');
  }
  
  if (billData.participants && !billData.participants.includes(billData.paidBy)) {
    errors.push('Paid by must be one of the participants');
  }
  
  if (billData.splitMethod === 'custom') {
    if (!billData.customShares) {
      errors.push('Custom shares are required for custom split method');
    } else {
      const totalCustomShares = Object.values(billData.customShares).reduce((sum, share) => sum + share, 0);
      if (Math.abs(totalCustomShares - billData.totalAmount) > 0.01) {
        errors.push('Custom shares must sum to total amount');
      }
    }
  }
  
  return errors;
};
