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


// Routes tests
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

    it('should submit a new planet', () => {
        // Mock PendingPlanet.add
        spyOn(PendingPlanet, 'add').and.returnValue(true);

        // Get route handler function directly
        const routeHandler = pending_planet_router.stack
            .find(layer => layer.route && layer.route.path === '/submit')
            .route.stack[0].handle;

        // Create mock request and response
        const req = {
            body: {
                name: 'Mars',
                size_km: '6779',
                atmosphere: 'CO2',
                type: 'Terrestrial',
                distance_from_sun_km: '227943824'
            }
        };
        
        const res = {
            redirect: jasmine.createSpy('redirect')
        };

        // Call handler directly
        routeHandler(req, res);

        // Verify redirect was called with success message
        expect(res.redirect).toHaveBeenCalledWith('/planets?message=Planet submitted successfully');
        expect(PendingPlanet.add).toHaveBeenCalled();
    });
    
   // planetPending.spec.js
it('should not submit a duplicate planet', () => {
    // Mock PendingPlanet.add to simulate duplicate planet error
    spyOn(PendingPlanet, 'add').and.returnValue(false);

    // Get route handler function directly
    const routeHandler = pending_planet_router.stack
        .find(layer => layer.route && layer.route.path === '/submit')
        .route.stack[0].handle;

    // Create mock request and response
    const req = {
        body: {
            name: 'Earth',
            size_km: '12742',
            atmosphere: 'N2/O2',
            type: 'Terrestrial',
            distance_from_sun_km: '149598262'
        }
    };
    
    const res = {
        redirect: jasmine.createSpy('redirect')
    };

    // Call handler directly
    routeHandler(req, res);

    // Verify redirect was called with error message
    expect(res.redirect).toHaveBeenCalledWith('/planets?errors=Planet already exists in pending or published list');
    expect(PendingPlanet.add).toHaveBeenCalled();
    });

    // planetPending.spec.js - Add to existing route tests
it('should return 404 for unknown routes', () => {
    // Get catch-all route handler
    const notFoundHandler = pending_planet_router.stack
        .find(layer => !layer.route)
        .handle;

    // Create mock request and response
    const req = {
        method: 'GET',
        url: '/nonexistent'
    };

    // Create mock response with spies
    const send = jasmine.createSpy('send');
    const res = {
        status: jasmine.createSpy('status').and.returnValue({
            send: send
        })
    };

    const next = jasmine.createSpy('next');

    // Call handler directly
    notFoundHandler(req, res, next);

    // Verify response
    expect(res.status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith('Not Found');
    expect(next).not.toHaveBeenCalled();
});
it('should return 400 if required fields are missing', () => {
    // Get submit route handler
    const routeHandler = pending_planet_router.stack
        .find(layer => layer.route && layer.route.path === '/submit')
        .route.stack[0].handle;

    // Create mock request with missing required fields
    const req = {
        body: { 
            name: 'Mars' 
            // Missing size_km, atmosphere, type, distance_from_sun_km
        }
    };

    // Create mock response with chained spies
    const sendSpy = jasmine.createSpy('send');
    const res = {
        status: jasmine.createSpy('status').and.returnValue({
            send: sendSpy
        })
    };

    // Execute handler
    routeHandler(req, res);

    // Verify response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendSpy).toHaveBeenCalledWith('All fields are required');
});

it('should handle errors', () => {
    // Mock console.error
    spyOn(console, 'error');

    // Get error handler middleware
    const errorHandler = pending_planet_router.stack
        .find(layer => layer.route === undefined && layer.handle.length === 4)
        .handle;

    // Create mock request and response
    const req = {
        method: 'GET',
        url: '/planets'
    };

    const sendSpy = jasmine.createSpy('send');
    const res = {
        status: jasmine.createSpy('status').and.returnValue({
            send: sendSpy
        })
    };

    // Create mock error
    const err = new Error('Test Error');
    const next = jasmine.createSpy('next');

    // Execute error handler
    errorHandler(err, req, res, next);

    // Verify response using string matching for error message
    expect(res.status).toHaveBeenCalledWith(500);
    expect(sendSpy).toHaveBeenCalledWith('Something broke!');
    expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching('Error: Test Error')
    );
});
// planetPending.spec.js
it('should handle database errors', () => {
    // Setup spy for PendingPlanet.add
    spyOn(PendingPlanet, 'add').and.callFake(() => {
        throw new Error('Database error');
    });
    
    // Get submit route handler
    const routeHandler = pending_planet_router.stack
        .find(layer => layer.route && layer.route.path === '/submit')
        .route.stack[0].handle;

    // Create mock request
    const req = {
        body: { 
            name: 'Mars', 
            size_km: '6779', 
            atmosphere: 'CO2', 
            type: 'Terrestrial', 
            distance_from_sun_km: '227943824' 
        }
    };

    // Create mock response
    const res = {
        redirect: jasmine.createSpy('redirect')
    };

    // Execute handler
    try {
        routeHandler(req, res);
        // Should redirect with error message
        expect(res.redirect).toHaveBeenCalledWith('/planets?errors=Error adding planet');
    } catch (error) {
        // Verify error was thrown with correct message
        expect(error.message).toBe('Database error');
    }
});
});
