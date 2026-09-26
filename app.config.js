// Extends app.json. Set EXPO_BASE_URL (e.g. "/Table-Games") when the PWA is hosted under a sub-path,
// such as a GitHub Pages project site. scripts/build-pwa.mjs reads the same variable.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
