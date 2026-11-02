import { Link } from 'expo-router';
import { useState } from 'react';

import { useSession } from '@/auth/session';
import { AuthLayout } from '@/features/AuthLayout';
import { useSubmit } from '@/features/useSubmit';
import { Button, Field, Notice, Text, colors } from '@/ui';

export default function SignIn() {
  const { signIn } = useSession();
  const { busy, error, run } = useSubmit();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthLayout title="Welcome back" intro="See what your friends have on repeat, and show them yours.">
      {error ? <Notice tone="error" title="Could not sign in" body={error} /> : null}
      <Field
        label="Username or email"
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
        autoComplete="username"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        onSubmitEditing={() => run(() => signIn(login, password))}
      />
      <Button label="Sign in" busy={busy} onPress={() => run(() => signIn(login, password))} />
      <Link href="/sign-up" asChild>
        <Text variant="bodyStrong" color={colors.accent} accessibilityRole="link">
          New here? Create an account
        </Text>
      </Link>
    </AuthLayout>
  );
}
