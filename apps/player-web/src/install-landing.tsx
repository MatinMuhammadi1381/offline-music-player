import { useState, type ReactNode } from "react";
import { Icon } from "./icon";

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
        <section className="install-card" aria-labelledby="install-title">
          <header className="install-brand">
            <span className="install-brand-mark" aria-hidden="true"><Icon name="music" size={23} /></span>
            <h1 id="install-title">Offline Music</h1>
          </header>
          <ol className="install-steps">
            {platform === "ios" ? (
              <>
                <li><span className="install-step-number">1</span><span className="install-step-content">Open this page in <span className="install-step-action"><Icon name="globe" size={17} />Safari</span></span></li>
                <li><span className="install-step-number">2</span><span className="install-step-content">Tap <span className="install-step-action"><Icon name="share" size={17} />Share</span>, then <span className="install-step-action"><Icon name="plus" size={17} />Add to Home Screen</span></span></li>
                <li><span className="install-step-number">3</span><span className="install-step-content">Tap <span className="install-step-action"><Icon name="plus" size={17} />Add</span></span></li>
                <li><span className="install-step-number">4</span><span className="install-step-content">Open <span className="install-step-action"><Icon name="home" size={17} />Offline Music</span> from your Home Screen</span></li>
              </>
            ) : platform === "android" ? (
              <>
                <li><span className="install-step-number">1</span><span className="install-step-content">Open this page in <span className="install-step-action"><Icon name="globe" size={17} />Chrome</span></span></li>
                <li><span className="install-step-number">2</span><span className="install-step-content">Tap the browser <span className="install-step-action"><Icon name="menu" size={17} />menu</span></span></li>
                <li><span className="install-step-number">3</span><span className="install-step-content">Choose <span className="install-step-action"><Icon name="download" size={17} />Install app</span> or <span className="install-step-action"><Icon name="plus" size={17} />Add to Home screen</span></span></li>
                <li>
                  <span className="install-step-number">4</span>
                  <span className="install-step-content">
                    {installPromptAvailable ? (
                      <button type="button" className="install-step-button" onClick={() => void install()}><Icon name="download" size={17} />Install app</button>
                    ) : (
                      <>Tap <span className="install-step-action"><Icon name="check" size={17} />Install</span></>
                    )}
                    , then open <span className="install-step-action"><Icon name="home" size={17} />Offline Music</span>
                  </span>
                </li>
              </>
            ) : (
              <>
                <li><span className="install-step-number">1</span><span className="install-step-content">Open this page in <span className="install-step-action"><Icon name="globe" size={17} />Chrome or Edge</span></span></li>
                <li><span className="install-step-number">2</span><span className="install-step-content">Open the browser <span className="install-step-action"><Icon name="menu" size={17} />menu</span> or select its install icon</span></li>
                <li><span className="install-step-number">3</span><span className="install-step-content">Choose <span className="install-step-action"><Icon name="download" size={17} />Install Offline Music</span></span></li>
                <li>
                  <span className="install-step-number">4</span>
                  <span className="install-step-content">
                    {installPromptAvailable ? (
                      <button type="button" className="install-step-button" onClick={() => void install()}><Icon name="download" size={17} />Install app</button>
                    ) : (
                      <span className="install-step-action"><Icon name="check" size={17} />Confirm install</span>
                    )}
                    , then open <span className="install-step-action"><Icon name="home" size={17} />Offline Music</span>
                  </span>
                </li>
              </>
            )}
          </ol>
          {(setupError || installError) && (
            <p className="install-error" role="alert">{installError || setupError}</p>
          )}
        </section>
        <p className="install-footer">Matin Muhammadi</p>
      </div>
    </main>
  );
}
