// The Firefox extension shares its sources with the Chrome one (../chrome/src); only the manifest differs.
module.exports = require('../chrome/webpack.factory')({target: 'firefox', dir: __dirname});
