const db = require('../models/db_conf');

module.exports.list = () => {
  return db.prepare("SELECT * FROM planets").all();
};