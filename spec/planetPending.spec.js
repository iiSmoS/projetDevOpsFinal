const PendingPlanet = require('../models/PendingPlanet');
const Planet = require('../models/Planet');
const pending_planet_router = require('../routes/pending_planet');
const db = require('../models/db_conf');

describe('PendingPlanet Model', () => {
  let prepareSpy;

  beforeEach(() => {
    // Allow respying in Jasmine
    jasmine.getEnv().allowRespy(true);
    
    // Create spy for db.prepare
    prepareSpy = spyOn(db, 'prepare').and.callFake((query) => {
      // Handle different query types
      if (query.includes('SELECT * FROM pending_planets WHERE name = ?')) {
        return {
          get: () => null // Default: no duplicates
        };
      }
      if (query.includes('SELECT * FROM planets WHERE name = ?')) {
        return {
          get: () => null // Default: no existing planets
        };
      }
      if (query.includes('INSERT INTO pending_planets')) {
        return {
          run: () => ({ changes: 1 }) // Default: successful insert
        };
      }
      if (query.includes('DELETE FROM pending_planets WHERE id = ?')) {
        return {
          run: () => ({ changes: 1 }) // Default: successful delete
        };
      }
      // Default behaviors
      return {
        all: () => [{ id: 1, name: 'Earth' }],
        get: () => ({ id: 1, name: 'Earth' }),
        run: () => ({ changes: 1 })
      };
    });
  });

  afterEach(() => {
    // Clean up spies
    if (prepareSpy) {
      prepareSpy.calls.reset();
    }
  });

  // List planets
  it('should list all pending planets', () => {
    const planets = PendingPlanet.list();
    expect(planets).toEqual([{ id: 1, name: 'Earth' }]);
    expect(prepareSpy).toHaveBeenCalledWith('SELECT * FROM pending_planets');
  });

  // Find planet by ID
  it('should find a pending planet by id', () => {
    const planet = PendingPlanet.findById(1);
    expect(planet).toEqual({ id: 1, name: 'Earth' });
    expect(prepareSpy).toHaveBeenCalledWith('SELECT * FROM pending_planets WHERE id = ?');
  });

  // Delete planet
  it('should delete a pending planet by id', () => {
    const result = PendingPlanet.deleteById(1);
    expect(result).toBe(true);
    expect(prepareSpy).toHaveBeenCalledWith('DELETE FROM pending_planets WHERE id = ?');
  });

  // Add new planet
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
    expect(prepareSpy).toHaveBeenCalled();
  });

  // planetPending.spec.js

  it('should not add a duplicate pending planet', () => {
    // Spy on console.error to verify error message
    spyOn(console, 'error');
  
    // Override spy for duplicate check
    prepareSpy.and.callFake((query) => {
      if (query.includes('SELECT * FROM pending_planets WHERE name = ?')) {
        return { 
          get: () => ({ id: 1, name: 'Mars' }) // Simulate existing planet
        };
      }
      if (query.includes('SELECT * FROM planets WHERE name = ?')) {
        return {
          get: () => null
        };
      }
      return {
        get: () => null,
        run: () => ({ changes: 0 })
      };
    });
  
    const planetData = {
      name: 'Mars',
      size_km: 6779,
      atmosphere: 'CO2',
      type: 'Terrestrial',
      distance_from_sun_km: 227943824
    };
  
    const result = PendingPlanet.add(planetData);
    
    // Verify result and error message
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      'Error adding pending planet:',
      'Planet with this name already exists in the database'
    );
    expect(prepareSpy).toHaveBeenCalledWith('SELECT * FROM pending_planets WHERE name = ?');
  });

  // Add test for finding planet by name
it('should find a pending planet by name', () => {
    // Setup spy behavior for name lookup
    prepareSpy.and.callFake((query) => {
      if (query.includes('SELECT * FROM pending_planets WHERE name = ?')) {
        return {
          get: () => ({
            id: 2,
            name: 'Mars',
            size_km: 6779,
            atmosphere: 'CO2',
            type: 'Terrestrial',
            distance_from_sun_km: 227943824
          })
        };
      }
      return {
        get: () => null
      };
    });
  
    // Execute test
    const planet = PendingPlanet.findByName('Mars');
  
    // Verify results
    expect(planet).toEqual({
      id: 2,
      name: 'Mars',
      size_km: 6779,
      atmosphere: 'CO2',
      type: 'Terrestrial',
      distance_from_sun_km: 227943824
    });
    expect(prepareSpy).toHaveBeenCalledWith('SELECT * FROM pending_planets WHERE name = ?');
  });

  it('should remove a pending planet by name', () => {
    const result = PendingPlanet.remove('Earth');
    expect(result).toBe(true);
});

it('should handle failed database operations', () => {
    // Spy on console.error
    spyOn(console, 'error');
  
    // Override spy to simulate database failure
    prepareSpy.and.callFake((query) => {
      if (query.includes('INSERT INTO pending_planets')) {
        return {
          run: () => { throw new Error('Database error: connection lost') }
        };
      }
      return {
        get: () => null,
        run: () => ({ changes: 0 })
      };
    });
  
    const planetData = {
      name: 'Mars',
      size_km: 6779,
      atmosphere: 'CO2',
      type: 'Terrestrial',
      distance_from_sun_km: 227943824
    };
  
    const result = PendingPlanet.add(planetData);
    
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      'Error adding pending planet:',
      'Database error: connection lost'
    );
  });
  

});


// routes test 
// Routes tests
// planetPending.spec.js


describe('Planet Pending Routes', () => {
    let planetListSpy;

    beforeEach(() => {
        planetListSpy = spyOn(Planet, 'list').and.returnValue([
            { id: 1, name: 'Earth' }
        ]);
    });

    afterEach(() => {
        if (planetListSpy) {
            planetListSpy.calls.reset();
        }
    });
    

    it('should render planets index', () => {
        // Get route handler function directly from the router
        const routeHandler = pending_planet_router.stack
            .find(layer => layer.route && layer.route.path === '/planets')
            .route.stack[0].handle;

        // Create mock request and response objects
        const req = { 
            query: {},
            method: 'GET'
        };
        
        const res = {
            render: jasmine.createSpy('render')
        };

        // Call handler directly
        routeHandler(req, res);

        // Verify render was called with correct parameters
        expect(res.render).toHaveBeenCalledWith('planets/index', {
            planets: [{ id: 1, name: 'Earth' }],
            errors: undefined,
            message: undefined
        });
        expect(planetListSpy).toHaveBeenCalled();
    });
});