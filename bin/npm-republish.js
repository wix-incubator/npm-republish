#!/usr/bin/env node
const { republishPackage } = require('../index');

republishPackage(process.argv[2], process.argv[3], process.argv.slice(4));