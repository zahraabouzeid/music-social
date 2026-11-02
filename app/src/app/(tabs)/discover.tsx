import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSuggestions, useUserSearch } from '@/api/hooks';
import type { Suggestion } from '@/api/types';
import { listing, percent } from '@/features/format';
import { FollowButton } from '@/features/people/FollowButton';
import { UserRow } from '@/features/people/UserRow';
import { Divider, Notice, RowSkeleton, Screen, SearchField, Skeleton, Text, colors, space } from '@/ui';

export default function Discover() {
  const [query, setQuery] = useState('');
  const search = useUserSearch(query);
  const suggestions = useSuggestions();
  const searching = query.trim().length >= 2;

  return (
    <Screen refreshing={suggestions.isRefetching} onRefresh={suggestions.refetch}>
      <Text variant="title">Discover</Text>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Find people by name or username"
        accessibilityLabel="Find people by name or username"
      />

      {searching ? (
        <View style={styles.section}>
          {search.isLoading ? (
            <Skeleton label="Searching">
              <RowSkeleton />
              <RowSkeleton />
            </Skeleton>
          ) : null}
          {search.data?.length === 0 ? <Text color={colors.muted}>Nobody matches “{query.trim()}”.</Text> : null}
          {search.data?.map((user, index) => (
            <Fragment key={user.id}>
              {index > 0 ? <Divider /> : null}
              <UserRow username={user.username} displayName={user.display_name} />
            </Fragment>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.heading}>
            <Text variant="heading">People who hear it like you</Text>
            <Text variant="small" color={colors.muted}>
              Matched by the artists you both play.
            </Text>
          </View>
          {suggestions.isLoading ? (
            <Skeleton label="Finding people">
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </Skeleton>
          ) : null}
          {suggestions.error ? (
            <Notice tone="error" title="Suggestions could not load" body={suggestions.error.message} />
          ) : null}
          {suggestions.data?.length === 0 ? (
            <Notice title="No matches yet" body="Import your listening history and check back." />
          ) : null}
          {suggestions.data?.map((suggestion, index) => (
            <Fragment key={suggestion.user.id}>
              {index > 0 ? <Divider /> : null}
              <SuggestionRow suggestion={suggestion} />
            </Fragment>
          ))}
        </View>
      )}
    </Screen>
  );
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const shared = suggestion.shared_artists.slice(0, 3);
  return (
    <View style={styles.suggestion}>
      <UserRow
        username={suggestion.user.username}
        displayName={suggestion.user.display_name}
        detail={shared.length ? `Both play ${listing(shared)}` : undefined}
        trailing={<FollowButton username={suggestion.user.username} />}
      />
      <View style={styles.meterRow}>
        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width: `${Math.round(suggestion.similarity * 100)}%` }]} />
        </View>
        <Text variant="small" color={colors.highlight}>
          {percent(suggestion.similarity)} match
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  heading: { gap: 2 },
  suggestion: { gap: space.sm, paddingVertical: space.sm },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: 56 },
  meterTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  meterFill: { height: 4, borderRadius: 2, backgroundColor: colors.highlight },
});
