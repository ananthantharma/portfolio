export const BUDGET_CATEGORIES = {
  Housing: [
    'Rent / Mortgage',
    'Property Taxes',
    'Home Insurance',
    'Condo/HOA Fees',
    'Home Repairs & Maintenance',
    'Home Improvements',
    'Furniture & Appliances',
    'Garden / Lawn Care',
    'Security Systems',
    'Moving Costs',
  ],
  Utilities: [
    'Electricity',
    'Water',
    'Natural Gas / Heating',
    'Waste & Recycling',
    'Internet',
    'Phone (Cell + Landline)',
    'Cable / Streaming Services',
  ],
  Transportation: [
    'Car Payments',
    'Car Insurance',
    'Fuel',
    'Maintenance',
    'Repairs',
    'Parking Fees',
    'Public Transit',
    'Ride-Share',
    'Taxis',
    'License/Registration',
    'Vehicle Depreciation',
  ],
  'Food & Groceries': ['Groceries', 'Dining Out', 'Coffee Shops', 'Meal Delivery Services', 'Snacks', 'Work Lunches'],
  'Healthcare & Medical': [
    'Health Insurance Premiums',
    'Dental Insurance',
    'Vision Insurance',
    'Prescription Medications',
    'Doctor Visits',
    'Dentist',
    'Optometrist',
    'Specialist Visits',
    'Physiotherapy',
    'Chiropractic',
    'Mental Health / Therapy',
  ],
  Insurance: [
    'Life Insurance',
    'Disability Insurance',
    'Critical Illness Insurance',
    'Travel Insurance',
    'Pet Insurance',
  ],
  'Personal Spending': [
    'Clothing & Shoes',
    'Haircuts & Grooming',
    'Cosmetics / Skincare',
    'Gym Membership',
    'Personal Care Products',
    'Laundry / Dry Cleaning',
    'Hobbies',
    'Subscriptions',
  ],
  'Recreation & Entertainment': [
    'Movies / Shows',
    'Streaming Services',
    'Sports / Events',
    'Video Games',
    'Books / Magazines',
    'Vacations',
    'Hotel / Airfare',
    'Theme Parks',
    'Family Outings',
  ],
  'Child & Family': [
    'Childcare / Daycare',
    'School Fees',
    'School Supplies',
    'Kids Clothing',
    'Kids Activities',
    'Toys',
    'Baby Supplies',
    'Tutoring',
    'RESP Contributions',
  ],
  'Savings & Debt': [
    'Emergency Fund',
    'Retirement Savings (RRSP)',
    'TFSA Contributions',
    'Non-Registered Investments',
    'Credit Card Payments',
    'Loan Payments',
    'Student Loans',
    'Line of Credit',
    'Wealth Management Fees',
  ],
  Giving: ['Charitable Donations', 'Religious Contributions', 'Family Support', 'Gifts'],
  'Business/Work': [
    'Work Clothing',
    'Tools & Equipment',
    'Professional Fees',
    'Licensing & Certifications',
    'Education',
    'Union Dues',
    'Home Office Supplies',
    'Software Subscriptions',
  ],
  Pets: ['Pet Food', 'Pet Supplies', 'Grooming', 'Vet Visits', 'Medications', 'Boarding'],
  Miscellaneous: ['Bank Fees', 'Postage', 'Lost Items', 'Penalties', 'Misc Purchases'],
};

export const INCOME_CATEGORIES = [
  'Salary',
  'Bonuses',
  'Commission',
  'Overtime',
  'Rental Income',
  'Investment Income',
  'Dividends',
  'Capital Gains',
  'Side Hustle',
  'Child Benefits (CCB)',
  'Tax Refunds',
  'Other',
];

export const getParentCategory = (subCat: string): string => {
  // Check if it's a main category (Budget or Income)
  if (BUDGET_CATEGORIES[subCat as keyof typeof BUDGET_CATEGORIES]) return subCat;
  if (INCOME_CATEGORIES.includes(subCat)) return 'Income'; // Or distinct income types?

  // Find parent in Budget Categories
  for (const [mainCat, subCats] of Object.entries(BUDGET_CATEGORIES)) {
    if (subCats.includes(subCat)) return mainCat;
  }

  // Basic fallback or check if it IS a main category but passed as a "transaction category" (unlikely now)
  return 'Miscellaneous';
};

export const getCategoryEmoji = (cat: string): string => {
  // Try to find direct emoji for the category (if it's a main one)
  // or resolve parent if it's a subcategory
  const parent = getParentCategory(cat);
  const target = parent !== 'Miscellaneous' ? parent : cat; // Try parent first, else fallback to cat itself

  const map: { [key: string]: string } = {
    'Housing': '🏠',
    'Utilities': '💡',
    'Transportation': '🚗',
    'Food & Groceries': '🛒',
    'Healthcare & Medical': '💊',
    'Insurance': '🛡️',
    'Personal Spending': '🛍️',
    'Recreation & Entertainment': '🎬',
    'Child & Family': '🧸',
    'Savings & Debt': '🏦',
    'Giving': '🎁',
    'Business/Work': '💼',
    'Pets': '🐾',
    'Miscellaneous': '📦',
    // Income Categories
    'Salary': '💵',
    'Bonuses': '🎊',
    'Commission': '🤝',
    'Overtime': '⏱️',
    'Rental Income': '🏠',
    'Investment Income': '📈',
    'Dividends': '📊',
    'Capital Gains': '🚀',
    'Side Hustle': '🔨',
    'Child Benefits (CCB)': '👶',
    'Tax Refunds': '📄',
    'Other': '🏷️'
  };

  return map[target] || map[cat] || '🏷️';
};

export const TRANSACTION_CATEGORIES = [
  ...Object.values(BUDGET_CATEGORIES).flat(),
  ...INCOME_CATEGORIES
];
