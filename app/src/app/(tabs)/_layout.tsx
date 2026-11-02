import { Tabs } from 'expo-router';

import { colors, fonts } from '@/ui';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontFamily: fonts.displayMedium, fontSize: 15 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 64 },
        tabBarItemStyle: { justifyContent: 'center' },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="boards" options={{ title: 'Boards' }} />
      <Tabs.Screen name="me" options={{ title: 'You' }} />
    </Tabs>
  );
}
