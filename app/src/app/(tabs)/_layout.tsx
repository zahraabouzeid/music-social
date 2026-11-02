import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useConversations } from '@/api/chat';
import { useSession } from '@/auth/session';
import { GlassTabBar } from '@/features/navigation/GlassTabBar';
import { Avatar, Icon, IconName, colors } from '@/ui';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Icon name={name} filled={focused} color={focused ? colors.text : colors.muted} />;
}

export default function TabsLayout() {
  const { user } = useSession();
  const conversations = useConversations();
  const unread = (conversations.data ?? []).reduce((total, conversation) => total + conversation.unread, 0);
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Feed', tabBarIcon: ({ focused }) => <TabIcon name="feed" focused={focused} /> }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover', tabBarIcon: ({ focused }) => <TabIcon name="discover" focused={focused} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} />,
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
        }}
      />
      <Tabs.Screen
        name="boards"
        options={{ title: 'Boards', tabBarIcon: ({ focused }) => <TabIcon name="boards" focused={focused} /> }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'You',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.avatarRing, focused && styles.avatarRingActive]}>
              <Avatar name={user?.display_name ?? '?'} seed={user?.username ?? ''} size={22} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatarRing: { borderRadius: 99, borderWidth: 1.5, borderColor: 'transparent', padding: 1 },
  avatarRingActive: { borderColor: colors.text },
});
