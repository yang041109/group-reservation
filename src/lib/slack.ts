import type { SlackReservationNotification } from '@/types';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const MAX_RETRIES = 3;

/**
 * Slack Incoming Webhook 메시지를 구성한다.
 *
 * 포함 정보:
 * - 가게 이름, 인원수, 시간, 메뉴 목록, 총 금액
 * - 수락/거절 버튼 및 추가 안내사항 입력 필드
 *
 * Requirements: 6.2, 6.3, 6.6
 */
export function buildSlackMessage(data: SlackReservationNotification): object {
  const menuText = data.menuItems
    .map((m) => `• ${m.name} x${m.quantity} (${(m.price * m.quantity).toLocaleString()}원)`)
    .join('\n');

  return {
    text: `🔔 새 예약 신청 도착!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔔 새 예약 신청 도착!*`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*가게:* ${data.storeName}`,
            `*단체명:* ${data.groupName || '-'}`,
            `*대표자:* ${data.representativeName} (${data.phone})`,
            `*인원:* ${data.headcount}명`,
            `*날짜:* ${data.date}`,
            `*시간:* ${data.time}`,
            `*총 금액:* ${data.totalAmount.toLocaleString()}원`,
            `*최소 주문 금액:* ${data.minOrderAmount.toLocaleString()}원`,
          ].join('\n'),
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*선택 메뉴:*\n${menuText}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ 수락' },
            action_id: 'accept_reservation',
            value: data.reservationId,
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ 거절' },
            action_id: 'reject_reservation',
            value: data.reservationId,
            style: 'danger',
          },
        ],
      },
      {
        type: 'input',
        element: {
          type: 'plain_text_input',
          action_id: 'admin_note',
          placeholder: { type: 'plain_text', text: '추가 안내사항을 입력하세요...' },
        },
        label: { type: 'plain_text', text: '추가 안내사항' },
        optional: true,
      },
    ],
  };
}

/**
 * Slack Webhook으로 메시지를 발송한다.
 * 실패 시 최대 3회 재시도 (지수 백오프).
 *
 * Requirements: 6.1, 6.6
 */
export async function sendSlackNotification(
  data: SlackReservationNotification,
): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL이 설정되지 않았습니다. Slack 알림을 건너뜁니다.');
    return;
  }

  const message = buildSlackMessage(data);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        return;
      }

      console.error(
        `Slack 알림 발송 실패 (시도 ${attempt + 1}/${MAX_RETRIES}): ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      console.error(
        `Slack 알림 발송 오류 (시도 ${attempt + 1}/${MAX_RETRIES}):`,
        error,
      );
    }

    // 지수 백오프: 1초, 2초, 4초
    if (attempt < MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  console.error('Slack 알림 발송 최종 실패: 최대 재시도 횟수 초과');
}
