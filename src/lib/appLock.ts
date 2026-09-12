/**
 * App lock backed by the device's own credentials: biometrics when enrolled,
 * with automatic fallback to the device PIN / pattern / password. The app
 * never stores a secret of its own — Android's BiometricPrompt does the work.
 */
import { BiometricAuth, BiometryType, type CheckBiometryResult } from '@aparajita/capacitor-biometric-auth'
import { Capacitor } from '@capacitor/core'

const KEY = 'appLock'
/** Re-lock only if the app was in the background longer than this. */
export const RELOCK_AFTER_MS = 30_000

export function isLockEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setLockEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch { /* ignore */ }
}

let webSimulated = false
/** In the browser the plugin fakes biometry; pretend a fingerprint + PIN exist. */
async function simulateOnWeb(): Promise<void> {
  if (webSimulated || Capacitor.getPlatform() !== 'web') return
  webSimulated = true
  await BiometricAuth.setBiometryType(BiometryType.fingerprintAuthentication)
  await BiometricAuth.setBiometryIsEnrolled(true)
  await BiometricAuth.setDeviceIsSecure(true)
}

export interface LockCapability {
  available: boolean
  /** e.g. "fingerprint", "device PIN" — for the settings copy. */
  method: string
  reason: string
}

export async function canLock(): Promise<LockCapability> {
  await simulateOnWeb()
  const info: CheckBiometryResult = await BiometricAuth.checkBiometry()
  if (info.isAvailable) return { available: true, method: biometryName(info.biometryType), reason: '' }
  if (info.deviceIsSecure) return { available: true, method: 'device PIN / pattern', reason: '' }
  return { available: false, method: '', reason: info.reason || 'Set a screen lock on this device first.' }
}

function biometryName(t: BiometryType): string {
  switch (t) {
    case BiometryType.fingerprintAuthentication:
    case BiometryType.touchId:
      return 'fingerprint'
    case BiometryType.faceAuthentication:
    case BiometryType.faceId:
      return 'face unlock'
    case BiometryType.irisAuthentication:
      return 'iris'
    default:
      return 'biometrics'
  }
}

/** Resolves true on success, false on cancel/failure (never throws). */
export async function authenticate(): Promise<{ ok: boolean; message?: string }> {
  await simulateOnWeb()
  try {
    await BiometricAuth.authenticate({
      reason: 'Unlock HabEx',
      allowDeviceCredential: true,
      androidTitle: 'Unlock HabEx',
      androidSubtitle: 'Use your fingerprint or device PIN',
      androidConfirmationRequired: false,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}
