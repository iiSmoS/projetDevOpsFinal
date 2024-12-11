// FILE: models/PendingPlanet.test.js

const PendingPlanet = require('../models/PendingPlanet');
const db = require('../models/db_conf');

describe('PendingPlanet', () => {
    beforeEach(() => {
        // Mock the db.prepare method
        spyOn(db, 'prepare').and.returnValue({
            all: jasmine.createSpy('all').and.returnValue([
                { id: 1, name: 'Planet1' },
            ]),
            get: jasmine.createSpy('get').and.returnValue(
                { id: 1, name: 'Planet1' }
            )
        });
    });

    it('should return a list of pending planets', () => {
        const planets = PendingPlanet.list();
        expect(planets).toEqual([
            { id: 1, name: 'Planet1' },
        ]);
    });

    it('should return a pending planet by id', () => {
        const planet = PendingPlanet.findById(1);
        expect(planet).toEqual({ id: 1, name: 'Planet1' });
    });
});