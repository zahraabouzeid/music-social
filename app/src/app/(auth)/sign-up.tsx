import { Link } from 'expo-router';
import { useState } from 'react';

import { useSession } from '@/auth/session';
import { AuthLayout } from '@/features/AuthLayout';
import { useSubmit } from '@/features/useSubmit';
import { Button, Field, Notice, Text, colors } from '@/ui';

export default function SignUp() {
  const { signUp } = useSession();
  const { busy, error, run } = useSubmit();
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '' });
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <AuthLayout title="Create your account" intro="Bring your listening history and find people who hear things the way you do.">
      {error ? <Notice tone="error" title="Could not create the account" body={error} /> : null}
      <Field label="Name" value={form.display_name} onChangeText={update('display_name')} autoComplete="name" />
      <Field
        label="Username"
        value={form.username}
        onChangeText={update('username')}
        autoCapitalize="none"
        autoComplete="username-new"
        placeholder="letters, digits, dots, underscores"
      />
      <Field label="Email" value={form.email} onChangeText={update('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={form.password} onChangeText={update('password')} secureTextEntry autoComplete="new-password" placeholder="at least 8 characters" />
      <Button label="Create account" busy={busy} onPress={() => run(() => signUp(form))} />
      <Link href="/sign-in" asChild>
        <Text variant="bodyStrong" color={colors.red} accessibilityRole="link">
          Already have an account? Sign in
        </Text>
      </Link>
    </AuthLayout>
  );
}
