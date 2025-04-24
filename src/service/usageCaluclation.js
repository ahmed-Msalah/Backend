exports.calculateBill = usage => {
  let cost = 0;

  if (usage <= 50) {
    cost = usage * 0.58;
  } else if (usage <= 100) {
    cost = 50 * 0.58 + (usage - 50) * 0.68;
  } else if (usage <= 200) {
    cost = 50 * 0.58 + 50 * 0.68 + (usage - 100) * 0.77;
  } else if (usage <= 350) {
    cost = 50 * 0.58 + 50 * 0.68 + 100 * 0.77 + (usage - 200) * 1.06;
  } else if (usage <= 650) {
    cost = 50 * 0.58 + 50 * 0.68 + 100 * 0.77 + 150 * 1.06 + (usage - 350) * 1.28;
  } else if (usage <= 1000) {
    cost = 50 * 0.58 + 50 * 0.68 + 100 * 0.77 + 150 * 1.06 + 300 * 1.28 + (usage - 650) * 1.4;
  } else {
    cost = usage * 1.45;
  }

  return parseFloat(cost.toFixed(2));
};

exports.getTier = usage => {
  if (usage <= 50) return 'Tier 1';
  if (usage <= 100) return 'Tier 2';
  if (usage <= 200) return 'Tier 3';
  if (usage <= 350) return 'Tier 4';
  if (usage <= 650) return 'Tier 5';
  if (usage <= 1000) return 'Tier 6';
  return 'Tier 7';
};
