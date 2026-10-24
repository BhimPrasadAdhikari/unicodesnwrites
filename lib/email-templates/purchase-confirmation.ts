import { formatCurrency } from '@/lib/utils/currency';

interface PurchaseConfirmationProps {
  customerName: string;
  productName: string;
  orderId: string;
  amount: number;
  currency: string;
  date: Date;
  downloadLink: string;
  supportEmail: string;
}

export const getPurchaseConfirmationHtml = ({
  customerName,
  productName,
  orderId,
  amount,
  currency,
  date,
  downloadLink,
  supportEmail,
}: PurchaseConfirmationProps): string => {
  const formattedPrice = formatCurrency(amount, currency);
  const formattedDate = new Date(date).toLocaleDateString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #2c3e50; margin: 0; }
        .content { margin-bottom: 20px; }
        .order-details { background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee; margin: 20px 0; }
        .order-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .order-row:last-child { margin-bottom: 0; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { background-color: #3498db; color: white !important; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; }
        .footer { text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .warning { color: #e67e22; font-size: 13px; text-align: center; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thanks for your order!</h1>
        </div>
        
        <div class="content">
          <p>Hi ${customerName},</p>
          <p>Thank you for purchasing <strong>${productName}</strong>. Your order has been confirmed and your digital content is ready for download.</p>
          
          <div class="order-details">
            <div class="order-row">
              <span>Product:</span>
              <span>${productName}</span>
            </div>
            <div class="order-row">
              <span>Order ID:</span>
              <span>${orderId}</span>
            </div>
             <div class="order-row">
              <span>Date:</span>
              <span>${formattedDate}</span>
            </div>
            <div class="order-row">
              <span>Total:</span>
              <span>${formattedPrice}</span>
            </div>
          </div>
          
          <div class="button-container">
            <a href="${downloadLink}" class="button">Download Files</a>
            <div class="warning">Link expires in 24 hours</div>
          </div>
          
          <p>If you have any issues with your download, please reply to this email or contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} unicodesnwrites. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
