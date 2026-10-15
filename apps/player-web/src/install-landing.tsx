import { useState, type ReactNode } from "react";

type InstallPlatform = "ios" | "android" | "desktop";

function getInstallPlatform(): InstallPlatform {
  const userAgent = navigator.userAgent;
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(userAgent) || isIPadOS) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export function InstallLanding({
  installPromptAvailable,
  onInstall,
  setupError,
}: {
  readonly installPromptAvailable: boolean;
  readonly onInstall: () => Promise<void>;
  readonly setupError: string;
}): ReactNode {
  const platform = getInstallPlatform();
  const [installError, setInstallError] = useState("");
  const install = async (): Promise<void> => {
    try {
      await onInstall();
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : "The install prompt could not be opened.");
    }
  };

  return (
    <main className="install-page">
      <div className="install-content">
        <header className="install-brand">
          <span className="install-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </span>
          <span>Offline Music</span>
        </header>

        <section className="install-card" aria-labelledby="install-title">
          <p className="install-eyebrow">Your music, on your device</p>
          <h1 id="install-title">Install Offline Music to get started</h1>
          <p className="install-intro">
            The music player opens from its installed app, keeping your library in its own app space.
            Install it once, then launch it from your Home Screen or app launcher.
          </p>
          {installPromptAvailable && (
            <button type="button" className="install-primary-button" onClick={() => void install()}>
              Install app
            </button>
          )}
          <a className="install-help-link" href="#install-help">
            {installPromptAvailable ? "Or follow the install steps" : "See install steps"}
            <span aria-hidden="true">↓</span>
          </a>

          <section id="install-help" className="install-help" aria-labelledby="install-help-title">
            <h2 id="install-help-title">Install on this device</h2>
            {platform === "ios" ? (
              <>
                <ol>
                  <li>Open this page in <strong>Safari</strong>. If it opened inside another app, copy the link and open it in Safari.</li>
                  <li>In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> to confirm.</li>
                  <li>Close this browser tab and open <strong>Offline Music</strong> from the Home Screen.</li>
                </ol>
                <p className="install-note">On iPhone and iPad, installation is available from Safari’s Share menu—not from the page itself.</p>
              </>
            ) : platform === "android" ? (
              <>
                <ol>
                  <li>Open this page in <strong>Chrome</strong>.</li>
                  <li>Open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>Confirm, then launch Offline Music from your Home Screen or app launcher.</li>
                </ol>
                <p className="install-note">If the install option is missing, try Chrome and make sure this page has finished loading.</p>
              </>
            ) : (
              <>
                <ol>
                  <li>In Chrome or Edge, select the install icon in the address bar, or open the browser menu and choose <strong>Install Offline Music</strong>.</li>
                  <li>Confirm installation, then launch Offline Music from your desktop or app launcher.</li>
                </ol>
                <p className="install-note">If your browser does not offer an install option, open this page in Chrome or Edge.</p>
              </>
            )}
          </section>

          {(setupError || installError) && (
            <p className="install-error" role="alert">{installError || setupError}</p>
          )}
        </section>
        <p className="install-footer">After installation, open the app icon to access your local music library.</p>
      </div>
    </main>
  );
}
