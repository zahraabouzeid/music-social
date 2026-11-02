import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSuggestions, useUserSearch } from '@/api/hooks';
import { listing, percent } from '@/features/format';
import { FollowButton } from '@/features/people/FollowButton';
import { UserRow } from '@/features/people/UserRow';
import { Card, Field, Notice, Screen, Text, colors, space } from '@/ui';

export default function Discover() {
  const [query, setQuery] = useState('');
  const search = useUserSearch(query);
  const suggestions = useSuggestions();
  const searching = query.trim().length >= 2;

  return (
    <Screen refreshing={suggestions.isRefetching} onRefresh={suggestions.refetch}>
      <Text variant="title">Discover</Text>
      <Field
        label="Find people"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        placeholder="Name or username"
        accessibilityLabel="Find people by name or username"
      />

      {searching ? (
        <View style={styles.section}>
          {search.isLoading ? <ActivityIndicator color={colors.accent} /> : null}
          {search.data?.length === 0 ? <Text color={colors.muted}>Nobody matches “{query.trim()}”.</Text> : null}
          {search.data?.map((user) => (
            <UserRow key={user.id} username={user.username} displayName={user.display_name} />
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text variant="heading">People who hear it like you</Text>
          {suggestions.isLoading ? <ActivityIndicator color={colors.accent} /> : null}
          {suggestions.error ? (
            <Notice tone="error" title="Suggestions could not load" body={suggestions.error.message} />
          ) : null}
          {suggestions.data?.length === 0 ? (
            <Notice
              title="No matches yet"
              body="Matches come from the artists you play. Import your history and check back."
            />
          ) : null}
          {suggestions.data?.map((suggestion) => (
            <Card key={suggestion.user.id}>
              <UserRow
                username={suggestion.user.username}
                displayName={suggestion.user.display_name}
                trailing={<FollowButton username={suggestion.user.username} />}
              />
              <View style={styles.match}>
                <Text variant="number" color={colors.accent}>
                  {percent(suggestion.similarity)}
                </Text>
                <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
                  taste match
                  {suggestion.shared_artists.length
                    ? `, both play ${listing(suggestion.shared_artists.slice(0, 3))}`
                    : ''}
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  match: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
