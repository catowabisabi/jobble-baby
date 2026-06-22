module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      // Needed for @react-native/jest-preset setup files which use Flow types
      '@babel/preset-flow',
    ],
    plugins: [
      // Strip Flow type annotations from node_modules/@react-native/jest-preset
      '@babel/plugin-transform-flow-strip-types',
    ],
  };
};
