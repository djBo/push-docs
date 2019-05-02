#!/usr/bin/env node

var minimist = require('minimist');
var pushdocs = require('./');

var options = minimist(process.argv.slice(2), {
  boolean: ['ignore', 'update', 'verbose'],
  alias: { 'ignore': 'i', 'update': 'u', 'verbose': 'v' }
});
if (!options._.length) {
  console.log('Usage: push-docs [options] <db> [<dir>]');
  process.exit();
}

let db = options._[0];
let dir = options._[1] || process.cwd();

pushdocs(db, dir, options, (error) => {
	if (error) return console.error(error);
});
