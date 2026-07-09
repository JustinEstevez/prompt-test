const { withXcodeProject } = require('expo/config-plugins');

/**
 * Xcode 16/26 enables User Script Sandboxing by default, which blocks the
 * React Native / Expo dev-client build scripts (e.g. writing `ip.txt` into the
 * .app bundle) and can break EAS/production builds too. This plugin forces
 * ENABLE_USER_SCRIPT_SANDBOXING = NO on every build configuration so the
 * setting survives `expo prebuild` and EAS Build regenerating the native project.
 */
module.exports = function withDisableScriptSandbox(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(buildConfigs)) {
      const buildSettings = buildConfigs[key] && buildConfigs[key].buildSettings;
      if (buildSettings) {
        buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return config;
  });
};
