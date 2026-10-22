export function isInstalledPwa(
  displayModeStandalone: boolean,
  navigatorStandalone: boolean,
): boolean {
  return displayModeStandalone || navigatorStandalone;
}

export function isMobilePhone(userAgent: string): boolean {
  return /iPhone|iPod|Android.*Mobile/i.test(userAgent);
}

export function shouldShowStartupSplash(
  installedStandalone: boolean,
  mobilePhone: boolean,
): boolean {
  return installedStandalone && mobilePhone;
}
