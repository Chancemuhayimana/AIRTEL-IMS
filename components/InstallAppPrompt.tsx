type InstallAppPromptProps = {
  canInstall: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  onInstall: () => void;
};

function InstallAppPrompt({ canInstall, isInstalled, isInstalling, onInstall }: InstallAppPromptProps) {
  if (isInstalled) {
    return (
      <div className="install-app-prompt is-installed">
        <div className="install-app-copy">
          <strong>App installed</strong>
          <span>Airtel IMS is ready from your desktop or taskbar.</span>
        </div>
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <div className="install-app-prompt">
      <div className="install-app-copy">
        <strong>Install Airtel IMS</strong>
        <span>Open it like a desktop app with a faster, focused workspace.</span>
      </div>
      <button className="primary-btn compact-btn install-app-button" type="button" onClick={onInstall} disabled={isInstalling}>
        {isInstalling ? "Installing..." : "Install app"}
      </button>
    </div>
  );
}

export default InstallAppPrompt;