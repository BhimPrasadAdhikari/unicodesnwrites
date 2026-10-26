// Prices are stored in paise (₹1 = 100 paise) and sold in INR only.
export const formatCurrency = (amountInPaise: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amountInPaise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountInPaise / 100);
};

export const formatPrice = (amountInPaise: number): string => {
  return (amountInPaise / 100).toFixed(2);
};
