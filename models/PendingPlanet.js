const db = require('../models/db_conf');

class PendingPlanet {

    static list() {
        return db.prepare("SELECT * FROM pending_planets").all();
      }
    
    static findById(id) {
        return db.prepare("SELECT * FROM pending_planets WHERE id = ?").get(id);
      }

    static deleteById(id) {
        const stmt = db.prepare("DELETE FROM pending_planets WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
      }
    

}
module.exports = PendingPlanet;