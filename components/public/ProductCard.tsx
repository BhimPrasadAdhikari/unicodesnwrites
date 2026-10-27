import Link from 'next/link';
import Image from 'next/image';

import { CoverPlaceholder } from '@/components/ui/CoverPlaceholder';
import { glyphFor } from '@/components/ui/Glyph';
import { formatCurrency } from '@/lib/utils/currency';
import { isAnimatableImage } from '@/lib/utils/media';

interface ProductCardProps {
  product: {
    _id: string;
    slug: string;
    title: string;
    shortDescription: string;
    price: number;
    currency: string;
    thumbnailImage: string;
    productType: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/40">
        <div className="relative aspect-[16/10] overflow-hidden border-b border-border">
          {product.thumbnailImage ? (
            <Image
              src={product.thumbnailImage}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              unoptimized={isAnimatableImage(product.thumbnailImage)}
              className="object-cover"
            />
          ) : (
            <CoverPlaceholder kind={glyphFor(product.productType)} label={product.productType.toUpperCase()} />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-5">
          <p className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground">{product.productType.toUpperCase()}</p>
          <h3 className="line-clamp-2 font-serif text-[21px] font-medium leading-[1.2] text-foreground group-hover:text-primary">{product.title}</h3>
          <p className="line-clamp-2 text-[15px] leading-[1.6] text-muted-foreground">{product.shortDescription}</p>
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="font-mono text-[15px] text-foreground">
              {product.price === 0 ? 'Free' : formatCurrency(product.price, product.currency)}
            </span>
            <span className="text-sm font-medium underline decoration-primary decoration-2 underline-offset-4">View tool</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
