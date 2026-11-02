import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Avatar, Icon, IconName, colors, fonts } from '@/ui';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Icon name={name} filled={focused} color={focused ? colors.text : colors.muted} />;
}

export default function TabsLayout() {
  const { user } = useSession();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: { backgroundColor: 'rgba(11, 11, 12, 0.72)', borderTopWidth: 0, position: 'absolute' },
        tabBarBackground: () => <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} />,
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
