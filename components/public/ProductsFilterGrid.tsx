'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/public/ProductCard';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export type ProductListItem = {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string;
  price: number;
  currency: string;
  productType: string;
  licenseType: string;
  featured?: boolean;
  thumbnailImage: string;
  createdAt?: string;
  tags?: string[];
  category?: string;
};

const priceRanges = [
  { id: 'all', label: 'Any price', min: null, max: null },
  { id: 'under-50', label: 'Under $50', min: 0, max: 5000 },
  { id: '50-150', label: '$50–$150', min: 5000, max: 15000 },
  { id: '150-300', label: '$150–$300', min: 15000, max: 30000 },
  { id: '300-plus', label: '$300+', min: 30000, max: null },
];

const sortOptions = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
];

function getTime(value?: string) {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

export default function ProductsFilterGrid({ products }: { products: ProductListItem[] }) {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const urlType = searchParams.get('type') || 'all';
  const urlLicense = searchParams.get('license') || 'all';
  const urlPrice = searchParams.get('price') || 'all';
  const urlSort = searchParams.get('sort') || 'featured';

  const [query, setQuery] = useState(urlQuery);
  const [typeFilter, setTypeFilter] = useState(urlType);
  const [licenseFilter, setLicenseFilter] = useState(urlLicense);
  const [priceFilter, setPriceFilter] = useState(urlPrice);
  const [sortBy, setSortBy] = useState(urlSort);

  const updateUrlParams = useCallback(
    (qVal: string, typeVal: string, licenseVal: string, priceVal: string, sortVal: string) => {
      const next = new URLSearchParams();

      if (typeVal && typeVal !== 'all') next.set('type', typeVal);
      if (licenseVal && licenseVal !== 'all') next.set('license', licenseVal);
      if (priceVal && priceVal !== 'all') next.set('price', priceVal);
      if (sortVal && sortVal !== 'featured') next.set('sort', sortVal);

      const trimmed = qVal.trim();
      if (trimmed) next.set('q', trimmed);

      const nextQueryString = next.toString();
      const targetUrl = `/products${nextQueryString ? `?${nextQueryString}` : ''}`;

      if (typeof window !== 'undefined') {
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl !== targetUrl) {
          window.history.replaceState(null, '', targetUrl);
        }
      }
    },
    []
  );

  // Sync URL query parameters on filter changes without triggering Next.js page re-fetch loops
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrlParams(query, typeFilter, licenseFilter, priceFilter, sortBy);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, typeFilter, licenseFilter, priceFilter, sortBy, updateUrlParams]);

  const productTypes = useMemo(() => {
    const values = new Set(products.map((product) => product.productType).filter(Boolean));
    return ['all', ...Array.from(values).sort()];
  }, [products]);

  const licenseTypes = useMemo(() => {
    const values = new Set(products.map((product) => product.licenseType).filter(Boolean));
    return ['all', ...Array.from(values).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const range = priceRanges.find((option) => option.id === priceFilter) ?? priceRanges[0];

    const filtered = products.filter((product) => {
      if (typeFilter !== 'all' && product.productType !== typeFilter) return false;
      if (licenseFilter !== 'all' && product.licenseType !== licenseFilter) return false;

      if (range.min !== null && product.price < range.min) return false;
      if (range.max !== null && product.price > range.max) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        product.title,
        product.shortDescription,
        product.category,
        product.tags?.join(' '),
        product.productType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    const sorted = [...filtered];

    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        sorted.sort(
          (a, b) =>
            Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
            getTime(b.createdAt) - getTime(a.createdAt)
        );
        break;
    }

    return sorted;
  }, [products, query, typeFilter, licenseFilter, priceFilter, sortBy]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    typeFilter !== 'all' ||
    licenseFilter !== 'all' ||
    priceFilter !== 'all';

  const resetFilters = () => {
    setQuery('');
    setTypeFilter('all');
    setLicenseFilter('all');
    setPriceFilter('all');
    setSortBy('featured');
    updateUrlParams('', 'all', 'all', 'all', 'featured');
  };

  return (
    <div className="space-y-10">
      <div className="space-y-6 pb-8 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredProducts.length} of {products.length} products
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))_auto]">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground"
          >
            {productTypes.map((type) => (
              <option key={type} value={type} className="bg-background text-foreground">
                {type === 'all' ? 'All types' : type}
              </option>
            ))}
          </select>

          <select
            value={licenseFilter}
            onChange={(event) => setLicenseFilter(event.target.value)}
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground"
          >
            {licenseTypes.map((type) => (
              <option key={type} value={type} className="bg-background text-foreground">
                {type === 'all' ? 'All licenses' : `${type} license`}
              </option>
            ))}
          </select>

          <select
            value={priceFilter}
            onChange={(event) => setPriceFilter(event.target.value)}
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground"
          >
            {priceRanges.map((range) => (
              <option key={range.id} value={range.id} className="bg-background text-foreground">
                {range.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-12 rounded-xl border border-border bg-background px-4 text-sm text-foreground [&>option]:bg-background [&>option]:text-foreground"
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-background text-foreground">
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Refine results to find the right fit.</span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 text-sm text-foreground transition hover:text-foreground/70"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div key={product._id.toString()} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <h3 className="text-xl font-medium text-foreground">No matching products</h3>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your filters or clearing the search to see all products.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex items-center gap-2 text-sm text-foreground transition hover:text-foreground/70"
            >
              <X className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
