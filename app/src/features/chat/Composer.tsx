import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useRecentPlays } from '@/api/hooks';
import type { NewMessage, Period } from '@/api/types';
import { Cover, Icon, IconButton, Segmented, Text, colors, fonts, pressedStyle, radius, space } from '@/ui';

import { periodOptions } from '../format';

type Props = {
  sending: boolean;
  onSend: (message: NewMessage) => void;
};

type Panel = 'song' | 'stats';

const panels: { value: Panel; label: string }[] = [
  { value: 'song', label: 'Song' },
  { value: 'stats', label: 'Stats' },
];

export function Composer({ sending, onSend }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('song');
  const [period, setPeriod] = useState<Period>('week');

  const sendText = () => {
    const body = text.trim();
    if (!body || sending) return;
    onSend({ kind: 'text', body });
    setText('');
  };

  const sendAttachment = (message: NewMessage) => {
    onSend(message);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {open ? (
        <View style={styles.panel}>
          <Segmented label="What to share" options={panels} value={panel} onChange={setPanel} />
          {panel === 'song' ? (
            <SongPicker onPick={(trackId) => sendAttachment({ kind: 'track', track_id: trackId })} />
          ) : (
            <View style={{ gap: space.md }}>
              <Segmented label="Time range" options={periodOptions} value={period} onChange={setPeriod} />
              <Pressable
                accessibilityRole="button"
                onPress={() => sendAttachment({ kind: 'stats', period })}
                style={pressedStyle(styles.shareStats)}
              >
                <Text variant="bodyStrong" color={colors.onAccent}>
                  Share my top artists
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
      <View style={styles.bar}>
        <IconButton
          icon="plus"
          label={open ? 'Close sharing' : 'Share a song or stats'}
          onPress={() => setOpen(!open)}
        />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={Platform.OS === 'web' ? 1 : undefined}
          maxLength={2000}
          style={styles.input}
          onSubmitEditing={sendText}
          submitBehavior="submit"
          accessibilityLabel="Message"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!text.trim() || sending}
          onPress={sendText}
          style={pressedStyle(styles.send, (!text.trim() || sending) && styles.sendOff)}
        >
          <Icon name="send" size={20} color={colors.onAccent} filled />
        </Pressable>
      </View>
    </View>
  );
}

function SongPicker({ onPick }: { onPick: (trackId: number) => void }) {
  const plays = useRecentPlays(30);
  const songs = (plays.data ?? [])
    .filter((play, index, all) => all.findIndex((other) => other.track_id === play.track_id) === index)
    .slice(0, 10);
  if (plays.data && songs.length === 0) {
    return <Text color={colors.muted}>Import your history to share songs.</Text>;
  }
  return (
    <View style={{ maxHeight: 260 }}>
      {songs.map((song) => (
        <Pressable
          key={song.track_id}
          accessibilityRole="button"
          accessibilityLabel={`Share ${song.title} by ${song.artist}`}
          onPress={() => onPick(song.track_id)}
          style={pressedStyle(styles.song)}
        >
          <Cover seed={`${song.artist}|${song.title}`} style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {song.title}
            </Text>
            <Text variant="small" color={colors.muted} numberOfLines={1}>
              {song.artist}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  panel: { padding: space.md, gap: space.md },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.sm },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingTop: 10,
    paddingBottom: 10,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  sendOff: { opacity: 0.4 },
  shareStats: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.md,
  },
  song: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  thumb: { width: 40, borderRadius: radius.sm },
});
