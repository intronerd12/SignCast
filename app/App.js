import { useEffect, useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { clearSession, getSavedSession, loginUser, registerUser } from './src/auth/authClient'

const INITIAL_LOGIN = {
  email: '',
  password: '',
  accessType: 'user',
  remember: true,
}

const INITIAL_REGISTER = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

// Visual Illustration Components
function HandIllustration() {
  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.illustrationCircle, styles.illustrationCircle1]} />
      <View style={[styles.illustrationCircle, styles.illustrationCircle2]} />
      <View style={[styles.illustrationCircle, styles.illustrationCircle3]} />
      <View style={[styles.illustrationSquare, styles.illustrationSquare1]} />
      <View style={[styles.illustrationSquare, styles.illustrationSquare2]} />
    </View>
  )
}

function RecognitionFlow() {
  return (
    <View style={styles.flowContainer}>
      <View style={styles.flowStep}>
        <View style={styles.flowCircle} />
      </View>
      <View style={styles.flowLine} />
      <View style={styles.flowStep}>
        <View style={[styles.flowCircle, styles.flowCircleActive]} />
      </View>
      <View style={styles.flowLine} />
      <View style={styles.flowStep}>
        <View style={[styles.flowCircle, styles.flowCircleComplete]} />
      </View>
    </View>
  )
}

function FeatureIcon({ type }) {
  const getIconStyle = () => {
    switch (type) {
      case 'camera':
        return styles.iconCamera
      case 'text':
        return styles.iconText
      case 'sound':
        return styles.iconSound
      default:
        return styles.iconDefault
    }
  }

  return (
    <View style={[styles.featureIcon, getIconStyle()]}>
      {type === 'camera' && <View style={styles.cameraLens} />}
      {type === 'text' && <View style={styles.textLines} />}
      {type === 'sound' && <View style={styles.soundWaves} />}
    </View>
  )
}

function Header({ route, setRoute }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => setRoute('landing')} style={styles.brandBlock}>
        <Text style={styles.title}>SignCast</Text>
        <Text style={styles.subtitle}>Filipino Sign Language mapper</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('login')} style={[styles.headerLoginButton, route === 'login' && styles.headerLoginButtonActive]}>
        <Text style={styles.headerLoginText}>Login</Text>
      </Pressable>
    </View>
  )
}

function LandingScreen({ session, onLogout, setRoute }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.pageStack}>
        {/* Hero Section */}
        <View style={[styles.card, styles.heroCard]}>
          <Text style={styles.eyebrow}>🎯 Filipino Sign Language Mapper</Text>
          <Text style={styles.cardTitle}>Bridge communication barriers with instant FSL recognition</Text>
          
          <HandIllustration />
          
          <Text style={styles.cardBody}>
            SignCast recognizes and translates Filipino Sign Language in real time. Whether you're a learner, interpreter, or educator, get instant feedback on your signs and build your phrase library with confidence.
          </Text>

          <Pressable onPress={() => setRoute('login')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Get started with login</Text>
          </Pressable>
        </View>

        {/* What We Do Section */}
        <View style={styles.card}>
          <Text style={styles.eyebrow}>👁️ What we do</Text>
          <Text style={styles.cardTitle}>Real-time FSL recognition</Text>
          
          <RecognitionFlow />
          
          <Text style={styles.cardBody}>
            SignCast uses advanced computer vision to identify hand landmarks, track gesture motion, and translate FSL signs into readable text. You get live camera recognition, confidence scores, and instant feedback on every sign you make.
          </Text>

          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>✓ <Text style={styles.bulletText}>21-point hand landmark detection</Text></Text>
            <Text style={styles.bulletItem}>✓ <Text style={styles.bulletText}>Live confidence metrics for each sign</Text></Text>
            <Text style={styles.bulletItem}>✓ <Text style={styles.bulletText}>Build phrases from recognized signs</Text></Text>
            <Text style={styles.bulletItem}>✓ <Text style={styles.bulletText}>Text transcripts and speech synthesis</Text></Text>
          </View>
        </View>

        {/* What We Want to Achieve Section */}
        <View style={styles.card}>
          <Text style={styles.eyebrow}>🎯 What we want to achieve</Text>
          <Text style={styles.cardTitle}>Make FSL accessible to everyone</Text>
          <Text style={styles.cardBody}>
            We believe sign language should be as accessible as spoken language. Our mission is to remove barriers for learners, support interpreters, and help educators teach FSL more effectively. We're building a future where Deaf and Hard of Hearing communities can communicate seamlessly.
          </Text>

          <View style={styles.audienceGrid}>
            <View style={styles.audienceCard}>
              <Text style={styles.audienceLabel}>🎓 For learners</Text>
              <Text style={styles.audienceText}>Practice and master FSL with instant feedback from our recognition engine.</Text>
            </View>
            <View style={styles.audienceCard}>
              <Text style={styles.audienceLabel}>🗣️ For interpreters</Text>
              <Text style={styles.audienceText}>Speed up workflows with AI-assisted transcription and phrase management.</Text>
            </View>
            <View style={styles.audienceCard}>
              <Text style={styles.audienceLabel}>📚 For educators</Text>
              <Text style={styles.audienceText}>Teach FSL effectively with mobile tools that track student progress.</Text>
            </View>
          </View>
        </View>

        {/* How We Help Section */}
        <View style={styles.card}>
          <Text style={styles.eyebrow}>💡 How we help you</Text>
          <Text style={styles.cardTitle}>Everything you need to master FSL</Text>
          <Text style={styles.cardBody}>
            SignCast is designed for you. Open the app, point your camera at someone signing, and watch as the system recognizes each gesture. Get confidence scores, build complete sentences, and learn at your own pace.
          </Text>

          <View style={styles.helpCards}>
            <View style={styles.helpCard}>
              <FeatureIcon type="camera" />
              <Text style={styles.helpCardTitle}>📱 Mobile-first design</Text>
              <Text style={styles.helpCardBody}>Recognize signs anytime, anywhere with your phone camera.</Text>
            </View>
            <View style={styles.helpCard}>
              <FeatureIcon type="text" />
              <Text style={styles.helpCardTitle}>⚡ Instant feedback</Text>
              <Text style={styles.helpCardBody}>See confidence scores and get audio output for every phrase.</Text>
            </View>
            <View style={styles.helpCard}>
              <FeatureIcon type="sound" />
              <Text style={styles.helpCardTitle}>🎯 Learn at your pace</Text>
              <Text style={styles.helpCardBody}>Practice signs independently or follow guided lessons.</Text>
            </View>
          </View>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <Text style={styles.featureValue}>21</Text>
            <Text style={styles.featureTitle}>Hand Landmarks</Text>
            <Text style={styles.featureBody}>Precise hand-tracking technology for accurate recognition.</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureValue}>⚡</Text>
            <Text style={styles.featureTitle}>Real-time</Text>
            <Text style={styles.featureBody}>Get instant feedback as you sign and improve your technique.</Text>
          </View>
        </View>

        {/* CTA Section */}
        <View style={[styles.card, styles.ctaCard]}>
          <View style={styles.ctaVisualContainer}>
            <View style={styles.ctaVisualElement1} />
            <View style={styles.ctaVisualElement2} />
            <View style={styles.ctaVisualElement3} />
          </View>
          <Text style={styles.ctaTitle}>Ready to master Filipino Sign Language?</Text>
          <Text style={styles.ctaBody}>
            Join learners, interpreters, and educators using SignCast to improve FSL communication.
          </Text>
          <Pressable onPress={() => setRoute('login')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Log in to your account</Text>
          </Pressable>
          <Pressable onPress={() => setRoute('register')} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Create a new account</Text>
          </Pressable>
        </View>

        {/* Active Session Card */}
        {session && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active session found</Text>
            <Text style={styles.cardBody}>{`Signed in as ${session.email || 'user'} (${session.accessType}).`}</Text>
            <View style={styles.buttonRow}>
              <Pressable onPress={() => setRoute(session?.isAdmin ? 'admin-home' : 'app-home')} style={[styles.primaryButton, styles.buttonHalf]}>
                <Text style={styles.primaryButtonText}>{session?.isAdmin ? 'Open admin home' : 'Open app home'}</Text>
              </Pressable>
              <Pressable onPress={onLogout} style={[styles.secondaryButton, styles.buttonHalf]}>
                <Text style={styles.secondaryButtonText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function LoggedInHomeScreen({ session, onLogout, setRoute }) {
  return (
    <View style={styles.pageStack}>
      <View style={[styles.card, styles.darkCard]}>
        <Text style={styles.darkEyebrow}>Dashboard</Text>
        <Text style={styles.darkTitle}>Welcome back to SignCast</Text>
        <Text style={styles.darkBody}>{`Logged in as ${session?.email || 'user'} with ${session?.accessType || 'user'} access.`}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Profile</Text>
            <Text style={styles.statValue}>{session?.isAdmin ? 'Admin' : 'User'}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={styles.statValue}>Connected</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Mode</Text>
            <Text style={styles.statValue}>Mobile</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Text style={styles.cardBody}>Choose the next step for your mobile workflow.</Text>
        <View style={styles.buttonColumn}>
          <Pressable onPress={() => setRoute('landing')} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Back to landing</Text>
          </Pressable>
          <Pressable onPress={() => setRoute(session?.isAdmin ? 'admin-home' : 'app-home')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{session?.isAdmin ? 'Open admin home' : 'Open app home'}</Text>
          </Pressable>
          <Pressable onPress={onLogout} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Logout</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

function LoginScreen({ onSuccess }) {
  const [form, setForm] = useState(INITIAL_LOGIN)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const submitLogin = async () => {
    setStatus({ type: '', message: '' })
    setIsLoading(true)

    try {
      const session = await loginUser({
        email: form.email.trim(),
        password: form.password,
        accessType: form.accessType,
        rememberMe: form.remember,
      })

      setStatus({
        type: 'success',
        message: session.isAdmin
          ? 'Admin login successful. Redirecting to admin home.'
          : 'Login successful. Redirecting to home page.',
      })
      onSuccess(session)
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to login.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Login to SignCast</Text>
      <Text style={styles.cardBody}>Users can enter the FSL recognition app, while admins can access the web management area.</Text>

      <View style={styles.segmentRow}>
        <Pressable onPress={() => setField('accessType', 'user')} style={[styles.segmentButton, form.accessType === 'user' && styles.segmentActive]}>
          <Text style={[styles.segmentText, form.accessType === 'user' && styles.segmentTextActive]}>User app</Text>
        </Pressable>
        <Pressable onPress={() => setField('accessType', 'admin')} style={[styles.segmentButton, form.accessType === 'admin' && styles.segmentActive]}>
          <Text style={[styles.segmentText, form.accessType === 'admin' && styles.segmentTextActive]}>Admin web</Text>
        </Pressable>
      </View>

      <TextInput
        value={form.email}
        onChangeText={(value) => setField('email', value)}
        placeholder="Email address"
        placeholderTextColor="#6f7f82"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        value={form.password}
        onChangeText={(value) => setField('password', value)}
        placeholder="Password"
        placeholderTextColor="#6f7f82"
        secureTextEntry
        style={styles.input}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Remember me</Text>
        <Switch value={form.remember} onValueChange={(value) => setField('remember', value)} />
      </View>

      <Pressable disabled={isLoading} onPress={submitLogin} style={[styles.primaryButton, isLoading && styles.disabledButton]}>
        <Text style={styles.primaryButtonText}>{isLoading ? 'Signing in...' : 'Sign in'}</Text>
      </Pressable>

      <Pressable onPress={() => onSuccess(null, 'register')} style={styles.inlineLinkWrap}>
        <Text style={styles.inlineLinkText}>No account yet? Register here</Text>
      </Pressable>

      {!!status.message && (
        <Text style={[styles.message, status.type === 'error' ? styles.error : styles.success]}>{status.message}</Text>
      )}
    </View>
  )
}

function AdminHomeScreen({ session, onLogout, setRoute }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Admin home</Text>
      <Text style={styles.cardBody}>{`Signed in as ${session?.email || 'admin'} with admin access.`}</Text>
      <View style={styles.buttonColumn}>
        <Pressable onPress={() => setRoute('app-home')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Go to home</Text>
        </Pressable>
        <Pressable onPress={onLogout} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  )
}

function RegisterScreen({ onSuccess }) {
  const [form, setForm] = useState(INITIAL_REGISTER)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const canSubmit = useMemo(() => {
    return form.name && form.email && form.phone && form.password && form.confirmPassword
  }, [form])

  const submitRegistration = async () => {
    setStatus({ type: '', message: '' })

    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' })
      return
    }

    setIsLoading(true)

    try {
      await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      })

      setStatus({ type: 'success', message: 'Registration successful. You can now login.' })
      setForm(INITIAL_REGISTER)
      onSuccess()
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to create account.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Register for SignCast</Text>
      <Text style={styles.cardBody}>Create a user account for the Filipino Sign Language recognition app.</Text>

      <TextInput
        value={form.name}
        onChangeText={(value) => setField('name', value)}
        placeholder="Full name"
        placeholderTextColor="#6f7f82"
        style={styles.input}
      />
      <TextInput
        value={form.email}
        onChangeText={(value) => setField('email', value)}
        placeholder="Email address"
        placeholderTextColor="#6f7f82"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        value={form.phone}
        onChangeText={(value) => setField('phone', value)}
        placeholder="Phone number"
        placeholderTextColor="#6f7f82"
        keyboardType="phone-pad"
        style={styles.input}
      />
      <TextInput
        value={form.password}
        onChangeText={(value) => setField('password', value)}
        placeholder="Password"
        placeholderTextColor="#6f7f82"
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        value={form.confirmPassword}
        onChangeText={(value) => setField('confirmPassword', value)}
        placeholder="Confirm password"
        placeholderTextColor="#6f7f82"
        secureTextEntry
        style={styles.input}
      />

      <Pressable disabled={!canSubmit || isLoading} onPress={submitRegistration} style={[styles.primaryButton, (!canSubmit || isLoading) && styles.disabledButton]}>
        <Text style={styles.primaryButtonText}>{isLoading ? 'Creating account...' : 'Create account'}</Text>
      </Pressable>

      <Pressable onPress={() => onSuccess(false)} style={styles.inlineLinkWrap}>
        <Text style={styles.inlineLinkText}>Already have an account? Login</Text>
      </Pressable>

      {!!status.message && (
        <Text style={[styles.message, status.type === 'error' ? styles.error : styles.success]}>{status.message}</Text>
      )}
    </View>
  )
}

export default function App() {
  const [route, setRoute] = useState('landing')
  const [session, setSession] = useState(null)

  useEffect(() => {
    const restoreSession = async () => {
      const saved = await getSavedSession()
      if (saved) setSession(saved)
    }

    restoreSession()
  }, [])

  const logout = async () => {
    await clearSession()
    setSession(null)
    setRoute('landing')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Header route={route} setRoute={setRoute} />

          {route === 'login' && (
            <LoginScreen
              onSuccess={(newSession, nextRoute) => {
                if (nextRoute === 'register') {
                  setRoute('register')
                  return
                }

                if (!newSession) return
                setSession(newSession)
                setRoute(newSession.isAdmin ? 'admin-home' : 'app-home')
              }}
            />
          )}
          {route === 'register' && (
            <RegisterScreen
              onSuccess={(isRegistered = true) => {
                if (isRegistered) {
                  setRoute('login')
                  return
                }
                setRoute('login')
              }}
            />
          )}
          {route === 'landing' && <LandingScreen session={session} onLogout={logout} setRoute={setRoute} />}
          {route === 'app-home' && <LoggedInHomeScreen session={session} onLogout={logout} setRoute={setRoute} />}
          {route === 'admin-home' && <AdminHomeScreen session={session} onLogout={logout} setRoute={setRoute} />}

          <Text style={styles.footerNote}>
            Tip: set EXPO_PUBLIC_API_URL in app/.env so Expo Go can reach your backend over LAN.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f9f7',
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 18,
    paddingBottom: 32,
  },
  pageStack: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0ebe8',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  brandBlock: {
    flexShrink: 1,
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f766e',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#7a8a87',
    fontSize: 12,
    fontWeight: '500',
  },
  headerLoginButton: {
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  headerLoginButtonActive: {
    backgroundColor: '#0a5e55',
  },
  headerLoginText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0ebe8',
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroCard: {
    backgroundColor: '#f5fbf9',
    borderColor: '#dce9e6',
    shadowOpacity: 0.08,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: '#0f3a37',
    borderColor: '#0f3a37',
    shadowOpacity: 0.15,
    elevation: 4,
  },
  eyebrow: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f3a37',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  darkEyebrow: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  darkTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  darkBody: {
    color: '#d1dbd7',
    lineHeight: 22,
    fontSize: 15,
  },
  cardBody: {
    color: '#667472',
    lineHeight: 22,
    fontSize: 15,
  },
  featureGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce9e6',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 6,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  featureValue: {
    color: '#0f766e',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  featureTitle: {
    color: '#0f3a37',
    fontSize: 15,
    fontWeight: '700',
  },
  featureBody: {
    color: '#7a8a87',
    fontSize: 13,
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    padding: 10,
    gap: 4,
  },
  statLabel: {
    color: '#c2d5e7',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#ffffff',
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#dce9e6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f3a37',
    backgroundColor: '#f7fbfa',
    fontSize: 15,
    fontWeight: '500',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#eef6f4',
    borderRadius: 10,
    padding: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    color: '#7a8a87',
    fontWeight: '600',
    fontSize: 14,
  },
  segmentTextActive: {
    color: '#0f766e',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: '#667472',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonColumn: {
    gap: 12,
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#dce9e6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    color: '#0f3a37',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.5,
  },
  message: {
    fontWeight: '600',
    fontSize: 15,
  },
  inlineLinkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  inlineLinkText: {
    color: '#0f766e',
    fontWeight: '700',
    fontSize: 14,
  },
  error: {
    color: '#dc2626',
  },
  success: {
    color: '#059669',
  },
  bulletList: {
    gap: 10,
    marginTop: 12,
  },
  bulletItem: {
    color: '#0f766e',
    fontWeight: '700',
    lineHeight: 22,
    fontSize: 14,
  },
  bulletText: {
    color: '#667472',
    fontWeight: '500',
  },
  audienceGrid: {
    gap: 12,
    marginTop: 14,
  },
  audienceCard: {
    backgroundColor: '#f0f9f7',
    borderWidth: 1,
    borderColor: '#d9ecea',
    borderRadius: 11,
    padding: 14,
    gap: 8,
  },
  audienceLabel: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  audienceText: {
    color: '#667472',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  helpCards: {
    gap: 12,
    marginTop: 14,
  },
  helpCard: {
    backgroundColor: '#f0f9f7',
    borderWidth: 1,
    borderColor: '#d9ecea',
    borderRadius: 11,
    padding: 14,
    gap: 8,
    alignItems: 'flex-start',
  },
  helpCardTitle: {
    color: '#0f3a37',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  helpCardBody: {
    color: '#667472',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  ctaCard: {
    backgroundColor: '#e6f9f6',
    borderColor: '#d9ecea',
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1.5,
    paddingVertical: 24,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  ctaTitle: {
    color: '#0f3a37',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  ctaBody: {
    color: '#667472',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
    fontWeight: '500',
  },
  outlineButton: {
    minHeight: 52,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#dce9e6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
  },
  outlineButtonText: {
    color: '#0f766e',
    fontWeight: '700',
    fontSize: 15,
  },
  statTile: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    gap: 6,
  },
  statLabel: {
    color: '#c2d5e7',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statValue: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  footerNote: {
    color: '#7a8a87',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  // Illustration Styles
  illustrationContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  illustrationCircle: {
    borderRadius: 50,
    position: 'absolute',
  },
  illustrationCircle1: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(15, 118, 110, 0.15)',
    top: 10,
    left: 20,
  },
  illustrationCircle2: {
    width: 45,
    height: 45,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    top: 30,
    right: 30,
  },
  illustrationCircle3: {
    width: 35,
    height: 35,
    backgroundColor: 'rgba(15, 118, 110, 0.2)',
    bottom: 15,
    left: 50,
  },
  illustrationSquare: {
    position: 'absolute',
  },
  illustrationSquare1: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    top: 20,
    right: 60,
    transform: [{ rotate: '15deg' }],
  },
  illustrationSquare2: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
    bottom: 20,
    right: 25,
    transform: [{ rotate: '-20deg' }],
  },
  // Recognition Flow Styles
  flowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginVertical: 8,
  },
  flowStep: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  flowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0ebe8',
    borderWidth: 2,
    borderColor: '#d9ecea',
  },
  flowCircleActive: {
    backgroundColor: '#d9ecea',
    borderColor: '#0f766e',
    borderWidth: 3,
  },
  flowCircleComplete: {
    backgroundColor: '#0f766e',
  },
  flowLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#dce9e6',
    marginHorizontal: 4,
    zIndex: 1,
  },
  // Feature Icon Styles
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCamera: {
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(15, 118, 110, 0.2)',
  },
  iconText: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.15)',
  },
  iconSound: {
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(15, 118, 110, 0.2)',
  },
  iconDefault: {
    backgroundColor: '#e6f9f6',
  },
  cameraLens: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f766e',
  },
  textLines: {
    width: 22,
    height: 16,
    justifyContent: 'space-between',
  },
  soundWaves: {
    width: 24,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // CTA Visual Elements
  ctaVisualContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ctaVisualElement1: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 118, 110, 0.15)',
  },
  ctaVisualElement2: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  ctaVisualElement3: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 118, 110, 0.2)',
  },
})

