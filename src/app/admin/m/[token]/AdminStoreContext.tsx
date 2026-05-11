'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface AdminStoreSession {
  id: string;
  name: string;
  depositAmount: number;
  /** URL 세그먼트 (링크에만 사용) */
  token: string;
}

const AdminStoreContext = createContext<AdminStoreSession | null>(null);

export function useAdminStore(): AdminStoreSession {
  const v = useContext(AdminStoreContext);
  if (!v) {
    throw new Error('useAdminStore는 /admin/m/[토큰] 안에서만 사용할 수 있습니다.');
  }
  return v;
}

export function AdminStoreProvider({
  value,
  children,
}: {
  value: AdminStoreSession;
  children: ReactNode;
}) {
  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}
