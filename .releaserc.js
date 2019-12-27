module.exports = {
    branch: 'master',
    plugins: [
      '@semantic-release/commit-analyzer',
      '@semantic-release/changelog',
      '@semantic-release/release-notes-generator',
      '@semantic-release/npm',
      '@semantic-release/github'
    ],
  };