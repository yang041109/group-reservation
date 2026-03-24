'use client';

import type { NotificationData } from '@/types';
import NotificationItem from './NotificationItem';

interface NotificationPanelProps {
  notifications: NotificationData[];
  onMarkRead: (id: string) => void;
  onClose: () => void;
}

export default function NotificationPanel({ notifications, onMarkRead, onClose }: NotificationPanelProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">알림</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="알림 패널 닫기"
        >
          ✕
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          알림이 없습니다
        </div>
      ) : (
        <div role="list">
          {notifications.map((n) => (
            <div role="listitem" key={n.id}>
              <NotificationItem notification={n} onMarkRead={onMarkRead} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
