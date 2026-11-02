import { useSession } from '@/auth/session';
import { ProfileView } from '@/features/profile/ProfileView';

export default function Me() {
  const { user } = useSession();
  return user ? <ProfileView username={user.username} /> : null;
}
