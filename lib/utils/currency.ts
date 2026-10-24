export const formatCurrency = (amountInCents: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amountInCents / 100);
};

export const formatPrice = (amountInCents: number): string => {
  return (amountInCents / 100).toFixed(2);
};
