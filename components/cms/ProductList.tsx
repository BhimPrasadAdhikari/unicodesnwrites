'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, ExternalLink, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { ConfirmDeleteButton } from '@/components/cms/ConfirmDeleteButton';
import { Alert } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface Product {
  _id: string;
  title: string;
  slug: string;
  price: number;
  currency: string;
  productType: string;
  category: string;
  totalSales: number;
  totalRevenue: number;
  published: boolean;
  thumbnailImage: string;
  createdAt: string;
}

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Product could not be deleted.');
    router.refresh();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/70">
      {feedback && <Alert variant="destructive" className="m-4">{feedback}</Alert>}
      <div className="overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader>
            <tr className="border-b border-border bg-muted/35">
              <TableHead className="p-4">Product</TableHead>
              <TableHead className="p-4">Type</TableHead>
              <TableHead className="p-4">Price</TableHead>
              <TableHead className="p-4">Sales</TableHead>
              <TableHead className="p-4">Revenue</TableHead>
              <TableHead className="p-4">Status</TableHead>
              <TableHead className="p-4 text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
               <TableRow>
                <TableCell colSpan={7} className="p-12 text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-secondary">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No products found. Create your first product to get started.</p>
                </TableCell>
               </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                        {product.thumbnailImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={product.thumbnailImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-foreground">
                            {product.title.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground truncate max-w-[200px]">{product.title}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-4">
                    <span className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                      {product.productType}
                    </span>
                  </TableCell>
                  <TableCell className="p-4 text-sm font-medium text-foreground">
                    {formatCurrency(product.price, product.currency)}
                  </TableCell>
                  <TableCell className="p-4 text-sm text-muted-foreground">
                    {product.totalSales}
                  </TableCell>
                   <TableCell className="p-4 text-sm text-success font-medium">
                    {formatCurrency(product.totalRevenue, product.currency)}
                  </TableCell>
                  <TableCell className="p-4">
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${
                        product.published
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {product.published ? 'Published' : 'Draft'}
                    </span>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                       <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                         className="touch-target rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                         title="View Public Page"
                       >
                         <ExternalLink className="h-4 w-4" />
                       </Link>
                      <Link
                        href={`/dashboard/products/${product._id}/edit`}
                        className="touch-target rounded-lg p-2 text-foreground transition-colors hover:bg-secondary"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <ConfirmDeleteButton compact label={product.title} onConfirm={() => handleDelete(product._id)} onError={setFeedback} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
