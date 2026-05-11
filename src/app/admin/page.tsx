import { redirect } from 'next/navigation';

/** `/admin` 은 사용하지 않으며 예약 사이트 루트로 보냅니다. */
export default function AdminRootRedirect() {
  redirect('/');
}
