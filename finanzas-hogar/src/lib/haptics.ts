import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let enabled = true;
export function setHapticsEnabled(v: boolean): void {
  enabled = v;
}

const native = Capacitor.isNativePlatform();

export function tap(): void {
  if (!enabled || !native) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function success(): void {
  if (!enabled || !native) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export function warn(): void {
  if (!enabled || !native) return;
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}
