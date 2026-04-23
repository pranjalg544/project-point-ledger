import { Suspense } from 'react';
import MarketplaceClient from './MarketplaceClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading marketplace...</div>}>
      <MarketplaceClient />
    </Suspense>
  );
}