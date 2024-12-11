const db = require('../models/db_conf');

class PendingPlanet {

    static list() {
        return db.prepare("SELECT * FROM pending_planets").all();
      }

}
module.exports = PendingPlanet;