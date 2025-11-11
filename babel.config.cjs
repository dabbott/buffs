module.exports = {
  presets: [
    [
      '@babel/preset-typescript',
      {
        allowDeclareFields: true,
      },
    ],
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs',
  ],
}
