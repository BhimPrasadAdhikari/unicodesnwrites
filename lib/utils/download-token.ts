import crypto from 'crypto';

export const generateDownloadToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const getExpiryDate = (hours: number = 24): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};
