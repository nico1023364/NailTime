/**
 * Expo config wrapper.
 *
 * `app.json` holds the public configuration. This file only injects secrets
 * from environment variables, so the Google Maps key never lands in git.
 *
 * Docs: https://docs.expo.dev/versions/v58.0.0/sdk/map-view/#deploy-app-with-google-maps
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const plugins = [...(config.plugins ?? [])];

  if (googleMapsApiKey) {
    plugins.push([
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
        iosGoogleMapsApiKey: googleMapsApiKey,
      },
    ]);
  }

  return {
    ...config,
    plugins,
    extra: {
      ...(config.extra ?? {}),
      mapsEnabled: Boolean(googleMapsApiKey),
    },
  };
};
