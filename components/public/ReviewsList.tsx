import { Star, CheckCircle, MessageSquare } from 'lucide-react';
import dbConnect from '@/lib/db/connection';
import Review from '@/lib/models/Review';

interface ReviewsListProps {
  productId: string;
}

export default async function ReviewsList({ productId }: ReviewsListProps) {
  await dbConnect();
  
  const reviews = await Review.find({ 
    product: productId, 
    approved: true 
  }).sort({ createdAt: -1 });

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No reviews yet. Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review: any) => (
        <div key={review._id} className="pb-6 border-b border-border last:border-b-0">
          <div className="flex items-start justify-between mb-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-border bg-card text-foreground flex items-center justify-center font-serif text-base">
                  {review.customerName.charAt(0)}
                </div>
                <div>
                   <h4 className="font-bold">{review.customerName}</h4>
                   <div className="flex items-center gap-2">
                      <div className="flex text-warning">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} className={i < review.rating ? '' : 'text-muted-foreground/30'} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                   </div>
                </div>
             </div>
             {review.verified && (
               <div className="flex items-center gap-1 text-xs text-success">
                 <CheckCircle size={12} />
                 <span>Verified</span>
               </div>
             )}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {review.comment}
          </p>
        </div>
      ))}
    </div>
  );
}
