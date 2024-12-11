const PendingPlanet = require('../models/PendingPlanet');
const db = require('../models/db_conf');

// FILE: models/PendingPlanet.test.js

describe('PendingPlanet', () => {
    beforeEach(() => {
        // Mock the db.prepare method
        spyOn(db, 'prepare').and.returnValue({
            all: jasmine.createSpy('all').and.returnValue([
                { id: 1, name: 'Planet1' },
            ])
        });
    });

    it('should return a list of pending planets', () => {
        const planets = PendingPlanet.list();
        console.log(planets);
        expect(planets).toEqual([
            { id: 1, name: 'Planet1' },
        ]);
    });
});