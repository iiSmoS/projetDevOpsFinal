// planetPending.spec.js
const PendingPlanet = require('../models/PendingPlanet');
const db = require('../models/db_conf');

describe('PendingPlanet Model', () => {
    beforeEach(() => {
        spyOn(db, 'prepare').and.callFake((query) => {
            if (query.includes('SELECT * FROM pending_planets WHERE name = ?')) {
                return { 
                    get: () => null,
                    run: () => ({ changes: 1 })
                };
            }
            if (query.includes('SELECT * FROM planets WHERE name = ?')) {
                return { 
                    get: () => null
                };
            }
            if (query.includes('INSERT INTO pending_planets')) {
                return {
                    run: () => ({ changes: 1 })
                };
            }
            return {
                all: () => [{ id: 1, name: 'Earth' }],
                get: () => ({ id: 1, name: 'Earth' }),
                run: () => ({ changes: 1 })
            };
        });
    });

    it('should list all pending planets', () => {
        const planets = PendingPlanet.list();
        expect(planets).toEqual([{ id: 1, name: 'Earth' }]);
    });

    it('should find a pending planet by id', () => {
        const planet = PendingPlanet.findById(1);
        expect(planet).toEqual({ id: 1, name: 'Earth' });
    });

    it('should delete a pending planet by id', () => {
        const result = PendingPlanet.deleteById(1);
        expect(result).toBe(true);
    });

    it('should add a new pending planet', () => {
        const planetData = { 
            name: 'Mars', 
            size_km: 6779, 
            atmosphere: 'CO2', 
            type: 'Terrestrial', 
            distance_from_sun_km: 227943824 
        };
    
        const result = PendingPlanet.add(planetData);
        expect(result).toBe(true);
        expect(db.prepare).toHaveBeenCalled();
    });

    
});