import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChatNowPlaying, useConversation, useMarkRead, useMessages, useSendMessage } from '@/api/chat';
import { useSession } from '@/auth/session';
import { Composer } from '@/features/chat/Composer';
import { MessageBubble } from '@/features/chat/MessageBubble';
import { NowPlayingStrip } from '@/features/chat/NowPlayingStrip';
import { conversationTitle } from '@/features/chat/labels';
import { Notice, Text, colors, contentWidth, space } from '@/ui';

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const conversation = useConversation(id);
  const messages = useMessages(id);
  const nowPlaying = useChatNowPlaying(id);
  const send = useSendMessage(id);
  const markRead = useMarkRead(id);
  const latest = messages.data?.[0]?.id;

  useEffect(() => {
    if (latest) markRead();
  }, [latest]);

  const group = conversation.data?.kind === 'group';
  const title = conversation.data ? conversationTitle(conversation.data, user?.username) : '';
  const subtitle = group ? `${conversation.data?.members.length} people` : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.column}>
          {subtitle || (nowPlaying.data && nowPlaying.data.length > 0) ? (
            <View style={styles.top}>
              {subtitle ? (
                <Text variant="small" color={colors.muted}>
                  {subtitle}
                </Text>
              ) : null}
              <NowPlayingStrip listening={nowPlaying.data ?? []} />
            </View>
          ) : null}
          {messages.error ? (
            <Notice tone="error" title="Messages could not load" body={messages.error.message} />
          ) : null}
          <FlatList
            inverted
            data={messages.data ?? []}
            keyExtractor={(message) => message.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => {
              const older = messages.data?.[index + 1];
              return (
                <MessageBubble
                  message={item}
                  mine={item.sender.username === user?.username}
                  showSender={group && older?.sender.username !== item.sender.username}
                />
              );
            }}
            ListEmptyComponent={
              messages.isLoading ? undefined : (
                <View style={styles.empty}>
                  <Text color={colors.muted}>No messages yet. Share a song to start.</Text>
                </View>
              )
            }
          />
        </View>
        <View style={styles.column}>
          {send.error ? (
            <Text variant="small" color={colors.accent} style={{ paddingHorizontal: space.md }}>
              {send.error.message}
            </Text>
          ) : null}
          <Composer sending={send.isPending} onSend={(message) => send.mutate(message)} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  column: { width: '100%', maxWidth: contentWidth, alignSelf: 'center', flexShrink: 1 },
  top: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  list: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.xs, flexGrow: 1 },
  empty: { transform: [{ scaleY: -1 }], alignItems: 'center', padding: space.xl },
});
