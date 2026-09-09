import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const { demoEmail, demoPassword, isAuthenticated, login, register, tableNumber } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [error, setError] = useState('');

  const title = mode === 'login' ? 'Bem-vindo ao restaurante X!' : 'Bem-vindo ao restaurante X!';
  const actionLabel = mode === 'login' ? 'Entrar' : 'Cadastrar';
  const actionIcon = mode === 'login' ? 'log-in' : 'user-plus';
  const googleAuthLabel = mode === 'login' ? 'Entrar com o Google' : 'Cadastrar com o Google';

  const isFormReady = useMemo(() => {
    if (mode === 'login') {
      return email.trim().length > 0 && password.length > 0;
    }

    return name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;
  }, [email, mode, name, password]);

  if (isAuthenticated) {
    return <Redirect href={tableNumber ? '/' : '/mesa'} />;
  }

  const handleSubmit = () => {
    setError('');

    if (mode === 'login') {
      const didLogin = login(email, password);

      if (!didLogin) {
        setError(`Use ${demoEmail} e a senha ${demoPassword}.`);
        return;
      }

      router.replace('/mesa');
      return;
    }

    if (!isFormReady) {
      setError('Preencha os dados para continuar.');
      return;
    }

    register(name, email, password);
    router.replace('/mesa');
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
  };

  const fillDemoCredentials = () => {
    setName('Cliente Demo');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  const handleGoogleAuth = () => {
    console.log(`${mode === 'login' ? 'Login' : 'Cadastro'} com Google - integração pendente`);
    Alert.alert('Em breve', 'A integração com Google será adicionada em uma próxima etapa.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.hero}>
            <LinearGradient
              colors={[Colors.cardOrange, '#E67E22']}
              style={styles.foodFrame}
            >
              <Image
                source={require('@/assets/images/foods/meatburger.webp')}
                resizeMode="cover"
                style={styles.foodImage}
              />
            </LinearGradient>

            <View style={styles.brandMark}>
              <Ionicons name="restaurant" size={26} color={Colors.white} />
            </View>
          </View>

          <View style={styles.formPanel}>
            <View style={styles.heading}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Entre para continuar seu pedido.</Text>
            </View>

            <View style={styles.modeSelector}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => switchMode('login')}
                style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
              >
                <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>
                  Entrar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => switchMode('register')}
                style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}
              >
                <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>
                  Cadastro
                </Text>
              </TouchableOpacity>
            </View>

            <GoogleAuthButton
              label={googleAuthLabel}
              onPress={handleGoogleAuth}
              testID="google-auth-button"
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              accessibilityLabel="Preencher dados de teste"
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={fillDemoCredentials}
              style={styles.demoButton}
              testID="fill-demo-credentials"
            >
              <Feather name="zap" size={17} color={Colors.cardOrange} />
              <Text style={styles.demoButtonText}>Preencher dados de teste</Text>
            </TouchableOpacity>

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome</Text>
                <View style={styles.inputShell}>
                  <Feather name="user" size={20} color="#888" />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Cliente Demo"
                    placeholderTextColor="#888"
                    style={styles.input}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputShell}>
                <Feather name="mail" size={20} color="#888" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={demoEmail}
                  placeholderTextColor="#888"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputShell}>
                <Feather name="lock" size={20} color="#888" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={demoPassword}
                  placeholderTextColor="#888"
                  secureTextEntry={securePassword}
                  style={styles.input}
                />
                <TouchableOpacity
                  accessibilityLabel={securePassword ? 'Mostrar senha' : 'Ocultar senha'}
                  onPress={() => setSecurePassword(current => !current)}
                  style={styles.passwordButton}
                >
                  <Feather name={securePassword ? 'eye' : 'eye-off'} size={20} color={Colors.accentRed} />
                </TouchableOpacity>
              </View>
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color={Colors.accentRed} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!isFormReady}
              onPress={handleSubmit}
              style={[styles.submitShadow, !isFormReady && styles.submitDisabled]}
            >
              <LinearGradient
                colors={[Colors.accentRed, '#C90000']}
                style={styles.submitButton}
              >
                <Feather name={actionIcon} size={21} color={Colors.white} />
                <Text style={styles.submitText}>{actionLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 26,
  },
  foodFrame: {
    width: 168,
    height: 168,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.white,
    overflow: 'hidden',
    transform: [{ rotate: '-4deg' }],
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.accentRed,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -32,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  formPanel: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#242424',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  heading: {
    marginBottom: 20,
  },
  title: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: Colors.textGray,
    fontSize: 15,
    marginTop: 6,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#151515',
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: Colors.cardOrange,
  },
  modeText: {
    color: Colors.textGray,
    fontSize: 14,
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#111',
  },
  demoButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.45)',
    backgroundColor: '#1B1B1B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  dividerLine: {
    backgroundColor: '#3A3A3A',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: Colors.textGray,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  demoButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    color: '#111',
    fontSize: 16,
    marginLeft: 10,
    minWidth: 0,
  },
  passwordButton: {
    padding: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#331818',
    borderRadius: 14,
    padding: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  errorText: {
    color: Colors.white,
    flex: 1,
    fontSize: 13,
  },
  submitShadow: {
    borderRadius: 16,
    elevation: 8,
    shadowColor: Colors.accentRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitButton: {
    minHeight: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '900',
  },
});
