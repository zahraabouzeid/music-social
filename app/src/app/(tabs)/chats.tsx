import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useConversations } from '@/api/chat';
import { useSession } from '@/auth/session';
import { ConversationRow } from '@/features/chat/ConversationRow';
import { Button, IconButton, Notice, RowSkeleton, Screen, Skeleton, Text, space } from '@/ui';

export default function Chats() {
  const { user } = useSession();
  const conversations = useConversations();

  return (
    <Screen refreshing={conversations.isRefetching} onRefresh={conversations.refetch}>
      <View style={styles.top}>
        <Text variant="title" style={{ flex: 1 }}>
          Chats
        </Text>
        <IconButton icon="plus" label="New chat" tone="accent" onPress={() => router.push('/chats/new')} />
      </View>
      {conversations.isLoading ? (
        <Skeleton label="Loading chats">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </Skeleton>
      ) : null}
      {conversations.error ? (
        <Notice tone="error" title="Chats could not load" body={conversations.error.message} />
      ) : null}
      {conversations.data?.length === 0 ? (
        <Notice
          title="No chats yet"
          body="Start a chat with a friend or a group, then trade songs and stats."
          action={<Button label="New chat" compact tone="secondary" onPress={() => router.push('/chats/new')} />}
        />
      ) : null}
      <View>
        {conversations.data?.map((conversation) => (
          <ConversationRow key={conversation.id} conversation={conversation} me={user?.username} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
