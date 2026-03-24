'use client';

import type { NotificationData } from '@/types';

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
}

export default function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const isAccepted = notification.type === 'accepted';

  return (
    <button
      type="button"
      onClick={() => {
        if (!notification.isRead) onMarkRead(notification.id);
      }}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition hover:bg-gray-50 ${
        notification.isRead ? 'opacity-60' : 'bg-white'
      }`}
      aria-label={`${notification.storeName} ${notification.message}${notification.isRead ? '' : ' (읽지 않음)'}`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-lg" aria-hidden="true">
          {isAccepted ? '✅' : '❌'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {notification.storeName}
          </p>
          <p className={`text-sm ${isAccepted ? 'text-green-600' : 'text-red-600'}`}>
            {notification.message}
          </p>
          {notification.adminNote && (
            <p className="mt-1 text-xs text-gray-500">
              💬 {notification.adminNote}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {new Date(notification.createdAt).toLocaleString('ko-KR')}
          </p>
        </div>
        {!notification.isRead && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="읽지 않음" />
        )}
      </div>
    </button>
  );
}
