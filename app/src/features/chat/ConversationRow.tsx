import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Conversation } from '@/api/types';
import { Avatar, Text, colors, pressedStyle, space } from '@/ui';

import { ago } from '../format';
import { conversationAvatar, conversationTitle, previewText } from './labels';

export function ConversationRow({ conversation, me }: { conversation: Conversation; me?: string }) {
  const avatar = conversationAvatar(conversation, me);
  const unread = conversation.unread > 0;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${conversationTitle(conversation, me)}${unread ? `, ${conversation.unread} unread` : ''}`}
      onPress={() => router.push(`/chats/${conversation.id}`)}
      style={pressedStyle(styles.row)}
    >
      <Avatar name={avatar.name} seed={avatar.seed} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.line}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
            {conversationTitle(conversation, me)}
          </Text>
          {conversation.last_message ? (
            <Text variant="small" color={unread ? colors.accent : colors.muted}>
              {ago(conversation.last_message.created_at)}
            </Text>
          ) : null}
        </View>
        <View style={styles.line}>
          <Text numberOfLines={1} color={unread ? colors.text : colors.muted} style={{ flex: 1 }}>
            {conversation.last_message
              ? previewText(conversation.last_message, me)
              : conversation.kind === 'group'
                ? `${conversation.members.length} people`
                : 'Say hi'}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text variant="small" color={colors.onAccent}>
                {conversation.unread > 99 ? '99+' : conversation.unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
