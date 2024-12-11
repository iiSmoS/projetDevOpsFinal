const db = require('../models/db_conf');

class PendingPlanet {

    static list() {
        return db.prepare("SELECT * FROM pending_planets").all();
      }
    
    static findById(id) {
        return db.prepare("SELECT * FROM pending_planets WHERE id = ?").get(id);
      }

}
module.exports = PendingPlanet;