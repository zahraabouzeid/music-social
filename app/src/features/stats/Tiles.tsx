import { StyleSheet, View } from 'react-native';

import { Cover, Text, colors, fonts, space } from '@/ui';

import { count } from '../format';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function ArtistTile({ name, plays }: { name: string; plays: number }) {
  return (
    <View style={styles.artist}>
      <View style={styles.artistImage}>
        <Cover seed={name} round plain style={styles.artistImage} />
        <View style={styles.initials} pointerEvents="none">
          <Text style={styles.initialsText}>{initials(name)}</Text>
        </View>
      </View>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.center}>
        {name}
      </Text>
      <Text variant="small" color={colors.muted} style={styles.center}>
        {count(plays)} plays
      </Text>
    </View>
  );
}

export function AlbumTile({ name, artist, plays }: { name: string; artist: string; plays: number }) {
  return (
    <View style={styles.album}>
      <Cover seed={`${artist}|${name}`} style={styles.albumImage} />
      <Text variant="bodyStrong" numberOfLines={1}>
        {name}
      </Text>
      <Text variant="small" color={colors.muted} numberOfLines={1}>
        {artist}, {count(plays)} plays
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  artist: { width: 120, gap: space.xs },
  artistImage: { width: 120 },
  album: { width: 140, gap: space.xs },
  albumImage: { width: 140 },
  center: { textAlign: 'center' },
  initials: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.text, letterSpacing: -1 },
});
