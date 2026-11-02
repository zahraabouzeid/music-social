import { Children, Fragment, ReactNode, isValidElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Divider } from './Divider';
import { Icon } from './Icon';
import { Text } from './Text';
import { colors, radius, space } from './theme';

type GroupProps = {
  title?: string;
  footer?: string;
  children: ReactNode;
};

export function Group({ title, footer, children }: GroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {title ? (
        <Text variant="small" color={colors.muted} style={styles.title}>
          {title}
        </Text>
      ) : null}
      {rows.length > 0 ? (
        <View style={styles.box}>
          {rows.map((row, index) => (
            <Fragment key={row.key ?? index}>
              {index > 0 ? (
                <View style={styles.inset}>
                  <Divider />
                </View>
              ) : null}
              {row}
            </Fragment>
          ))}
        </View>
      ) : null}
      {footer ? (
        <Text variant="small" color={colors.muted} style={styles.title}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

type RowProps = {
  label: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  tone?: 'default' | 'accent';
  trailing?: ReactNode;
  showChevron?: boolean;
};

export function GroupRow({ label, detail, value, onPress, tone = 'default', trailing, showChevron }: RowProps) {
  const content = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" color={tone === 'accent' ? colors.accent : colors.text}>
          {label}
        </Text>
        {detail ? (
          <Text variant="small" color={colors.muted}>
            {detail}
          </Text>
        ) : null}
      </View>
      {value ? <Text color={colors.muted}>{value}</Text> : null}
      {trailing}
      {showChevron ? <Icon name="chevron" size={18} color={colors.faint} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function GroupContent({ children }: { children: ReactNode }) {
  return <View style={styles.content}>{children}</View>;
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  title: { paddingHorizontal: space.lg },
  box: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  inset: { paddingLeft: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  pressed: { backgroundColor: colors.raised },
  content: { padding: space.lg, gap: space.md },
});
