import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertArray = (n: number): string => {
    if (n < 20) return a[n];
    const digit1 = Math.floor(n / 10);
    const digit2 = n % 10;
    return b[digit1] + (digit2 ? ' ' + a[digit2] : ' ');
  };

  const lakh = Math.floor(num / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;
  
  let res = '';
  if (lakh > 0) res += convertArray(lakh) + 'Lakh ';
  if (thousand > 0) res += convertArray(thousand) + 'Thousand ';
  
  const hundred = Math.floor(remainder / 100);
  const ten = remainder % 100;
  
  if (hundred > 0) res += convertArray(hundred) + 'Hundred ';
  if (ten > 0) res += convertArray(ten);
  
  return res.trim() + ' Taka Only';
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(amount).replace('BDT', 'TK');
};

export const generateSealCode = (): string => {
  const hex1 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const hex2 = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `SEAL-${hex1}-${hex2}`.toUpperCase();
};

export const generateReferenceCode = (): string => {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `INV-WAL-MIS-${ts}-${rand}`;
};
