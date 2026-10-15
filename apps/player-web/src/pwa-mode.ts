export function isInstalledPwa(
  displayModeStandalone: boolean,
  navigatorStandalone: boolean,
): boolean {
  return displayModeStandalone || navigatorStandalone;
}
