import { notFound } from 'next/navigation';
import { AdminStoreProvider } from './AdminStoreContext';
import { getStoreByAdminToken } from '@/lib/admin-token';

export default async function AdminTokenLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const store = await getStoreByAdminToken(token);
  if (!store) {
    notFound();
  }

  return (
    <AdminStoreProvider
      value={{
        id: store.id,
        name: store.name,
        depositAmount: store.depositAmount,
        token,
      }}
    >
      {children}
    </AdminStoreProvider>
  );
}
