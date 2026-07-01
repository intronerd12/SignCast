import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyBD1oKTNnoqzytGgRrmljh8iUFy6hptmqU',
  authDomain: 'signcast-35f6f.firebaseapp.com',
  projectId: 'signcast-35f6f',
  storageBucket: 'signcast-35f6f.firebasestorage.app',
  messagingSenderId: '950435417126',
  appId: '1:950435417126:web:b2b3fd66e213980095eae7',
  measurementId: 'G-B1JVKWYB26',
}

const app = initializeApp(firebaseConfig)

let analytics = null
try {
  analytics = getAnalytics(app)
} catch {
}

const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

export { app, auth, analytics, googleProvider }