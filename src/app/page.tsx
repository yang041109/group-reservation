import type { Metadata } from 'next';
import LandingPageClient from './LandingPageClient';

export const metadata: Metadata = {
  title: '우르르 · 전화 없이 끝내는 단체예약',
  description:
    '단체 예약을 전화 없이 날짜·인원만 정하고 가게를 고르세요. 예약금·메뉴·시간까지 한곳에서 정리합니다.',
};

export default function LandingPage() {
  return <LandingPageClient />;
}
