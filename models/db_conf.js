// file db_conf.js in models

const db = require('better-sqlite3')('C:/last/ProjetDevops2/db/exoplanets (2) (2).db', { verbose: console.log });
// const db = require('better-sqlite3')('/home/olivier/exoplanets.db', { verbose: console.log });

module.exports = db;
