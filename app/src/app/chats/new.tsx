import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCreateGroup, useOpenDirect } from '@/api/chat';
import { useSuggestions, useUserSearch } from '@/api/hooks';
import type { PublicUser } from '@/api/types';
import { useSession } from '@/auth/session';
import {
  Avatar,
  Button,
  Divider,
  Field,
  Notice,
  RowSkeleton,
  Screen,
  SearchField,
  Segmented,
  Skeleton,
  Text,
  colors,
  pressedStyle,
  radius,
  space,
} from '@/ui';

type Mode = 'direct' | 'group';

const modes: { value: Mode; label: string }[] = [
  { value: 'direct', label: 'One on one' },
  { value: 'group', label: 'Group' },
];

export default function NewChat() {
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>('direct');
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<PublicUser[]>([]);
  const search = useUserSearch(query);
  const suggestions = useSuggestions();
  const openDirect = useOpenDirect();
  const createGroup = useCreateGroup();

  const searching = query.trim().length >= 2;
  const people = (searching ? search.data : suggestions.data?.map((suggestion) => suggestion.user)) ?? [];
  const candidates = people.filter((person) => person.username !== user?.username);
  const loading = searching ? search.isLoading : suggestions.isLoading;
  const error = openDirect.error ?? createGroup.error;

  const choose = (person: PublicUser) => {
    if (mode === 'direct') {
      openDirect.mutate(person.username, {
        onSuccess: (conversation) => router.replace(`/chats/${conversation.id}`),
      });
      return;
    }
    setPicked((current) =>
      current.some((existing) => existing.id === person.id)
        ? current.filter((existing) => existing.id !== person.id)
        : [...current, person],
    );
  };

  const create = () =>
    createGroup.mutate(
      { title: title.trim(), usernames: picked.map((person) => person.username) },
      { onSuccess: (conversation) => router.replace(`/chats/${conversation.id}`) },
    );

  return (
    <Screen insetTop={false}>
      <Segmented label="Chat type" options={modes} value={mode} onChange={setMode} />

      {mode === 'group' ? (
        <View style={styles.group}>
          <Field label="Group name" value={title} onChangeText={setTitle} placeholder="Concert crew" maxLength={60} />
          {picked.length > 0 ? (
            <View style={styles.picked}>
              {picked.map((person) => (
                <Pressable
                  key={person.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${person.display_name}`}
                  onPress={() => choose(person)}
                  style={pressedStyle(styles.pill)}
                >
                  <Avatar name={person.display_name} seed={person.username} size={22} />
                  <Text variant="small">{person.display_name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Button
            label={`Create group${picked.length ? ` with ${picked.length + 1} people` : ''}`}
            disabled={!title.trim() || picked.length === 0}
            busy={createGroup.isPending}
            onPress={create}
          />
        </View>
      ) : null}

      {error ? <Notice tone="error" title="The chat could not start" body={error.message} /> : null}

      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or username"
        accessibilityLabel="Search people"
      />
      <Text variant="small" color={colors.muted}>
        {searching ? 'Results' : 'People with similar taste'}
      </Text>
      {loading ? (
        <Skeleton label="Loading people">
          <RowSkeleton />
          <RowSkeleton />
        </Skeleton>
      ) : null}
      {!loading && candidates.length === 0 ? (
        <Text color={colors.muted}>{searching ? 'Nobody matches that name.' : 'Search for someone by name.'}</Text>
      ) : null}
      <View>
        {candidates.map((person, index) => {
          const selected = picked.some((existing) => existing.id === person.id);
          return (
            <Fragment key={person.id}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole={mode === 'group' ? 'checkbox' : 'button'}
                accessibilityState={mode === 'group' ? { checked: selected } : undefined}
                onPress={() => choose(person)}
                style={pressedStyle(styles.person)}
              >
                <Avatar name={person.display_name} seed={person.username} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{person.display_name}</Text>
                  <Text variant="small" color={colors.muted}>
                    @{person.username}
                  </Text>
                </View>
                {mode === 'group' ? <View style={[styles.check, selected && styles.checkOn]} /> : null}
              </Pressable>
            </Fragment>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.md },
  picked: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingVertical: space.xs,
    paddingLeft: space.xs,
    paddingRight: space.md,
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faint },
  checkOn: { borderColor: colors.accent, backgroundColor: colors.accent },
});
