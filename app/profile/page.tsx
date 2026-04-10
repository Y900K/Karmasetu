import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLearnerRole } from '@/lib/auth/learnerRoles';

export default async function ProfilePage() {
  const headersList = await headers();
  const cookie = headersList.get('cookie') || '';

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/me`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!res.ok) {
    return redirect('/login');
  }

  const data = await res.json().catch(() => ({}));

  if (data?.ok && data?.user?.role === 'admin') {
    return redirect('/admin/profile');
  }

  if (data?.ok && isLearnerRole(data?.user?.role)) {
    return redirect('/trainee/profile');
  }

  return redirect('/login');
}
