import GoogleIcon from '@/assets/images/google.svg';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

type GoogleAuthButtonProps = {
  label: string;
  onPress: () => void;
  testID?: string;
};

export function GoogleAuthButton({
  label,
  onPress,
  testID,
}: GoogleAuthButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.button}
      testID={testID}
    >
      <GoogleIcon width={20} height={20} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderColor: '#E7E7E7',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
  },
  text: {
    color: '#181818',
    fontSize: 15,
    fontWeight: '900',
  },
});
