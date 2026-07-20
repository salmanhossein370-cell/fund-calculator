export interface ReceiptEntry {
  id: string;
  type: 'plus' | 'minus';
  amount: number;
  note: string;
  time: string; // Format: HH:MM
  currencySymbol: string;
}

export interface Currency {
  id: string;
  symbol: string;
  name: string;
}

export const PRESET_CURRENCIES: Currency[] = [
  { id: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { id: 'USD', symbol: '$', name: 'US Dollar' },
  { id: 'EUR', symbol: '€', name: 'Euro' },
  { id: 'GBP', symbol: '£', name: 'British Pound' },
  { id: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { id: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { id: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { id: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { id: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { id: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
];
