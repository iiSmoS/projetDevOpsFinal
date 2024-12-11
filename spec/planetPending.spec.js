const PendingPlanet = require('../models/PendingPlanet');
const Planet = require('../models/Planet');
const pending_planet_router = require('../routes/pending_planet');
const db = require('../models/db_conf');

//--------------------- MODEL TESTS ---------------------
describe('PendingPlanet Model', () => {
  let prepareSpy;

  beforeEach(() => {
    jasmine.getEnv().allowRespy(true);
    spyOn(console, 'error'); // Suppress console errors
    
    prepareSpy = spyOn(db, 'prepare').and.callFake((query) => {
      if (query.includes('SELECT * FROM pending_planets WHERE LOWER(name) = LOWER(?)')) {
        return { get: () => null };
      }
      if (query.includes('SELECT * FROM planets WHERE LOWER(name) = LOWER(?)')) {
        return { get: () => null };
      }
      if (query.includes('INSERT INTO pending_planets')) {
        return { run: () => ({ changes: 1 }) };
      }
      if (query.includes('DELETE FROM pending_planets')) {
        return { run: () => ({ changes: 1 }) };
      }
      return {
        all: () => [{ id: 1, name: 'Earth' }],
        get: () => ({ id: 1, name: 'Earth' }),
        run: () => ({ changes: 1 })
      };
    });
  });

  afterEach(() => {
    if (prepareSpy) {
      prepareSpy.calls.reset();
    }
  });

  describe('Basic CRUD Operations', () => {
    it('should list all pending planets', () => {
      const planets = PendingPlanet.list();
      expect(planets).toEqual([{ id: 1, name: 'Earth' }]);
      expect(prepareSpy).toHaveBeenCalledWith('SELECT * FROM pending_planets');
    });

    it('should find a pending planet by id', () => {
      const planet = PendingPlanet.findById(1);
      expect(planet).toEqual({ id: 1, name: 'Earth' });
      expect(prepareSpy).toHaveBeenCalledWith('SELECT * FROM pending_planets WHERE id = ?');
    });

    it('should delete a pending planet by id', () => {
      const result = PendingPlanet.deleteById(1);
      expect(result).toBe(true);
      expect(prepareSpy).toHaveBeenCalledWith('DELETE FROM pending_planets WHERE id = ?');
    });

    it('should find a pending planet by name', () => {
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

      const planet = PendingPlanet.findByName('Mars');
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
  });

  describe('Planet Addition and Validation', () => {
    it('should add a new pending planet', () => {
      prepareSpy.and.callFake((query) => {
        if (query.includes('SELECT * FROM pending_planets WHERE LOWER(name) = LOWER(?)')) {
          return { get: () => null };
        }
        if (query.includes('INSERT INTO pending_planets')) {
          return { run: () => ({ changes: 1 }) };
        }
        return {
          get: () => null,
          run: () => ({ changes: 1 })
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
      expect(result).toBe(true);
      expect(prepareSpy).toHaveBeenCalled();
    });

    it('should not add a duplicate pending planet', () => {
      spyOn(console, 'error');

      prepareSpy.and.callFake((query) => {
        if (query.includes('SELECT * FROM pending_planets WHERE LOWER(name) = LOWER(?)')) {
          return { 
            get: () => ({ id: 1, name: 'Mars' })
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
        'Planet with this name already exists in the database'
      );
      expect(prepareSpy).toHaveBeenCalledWith('SELECT * FROM pending_planets WHERE LOWER(name) = LOWER(?)');
    });

    it('should handle failed database operations', () => {
      spyOn(console, 'error');

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

  describe('Distance Validation', () => {
    it('should reject a planet with a distance that is too small', () => {
      const smallDistancePlanet = {
        name: 'TinyStar',
        size_km: 1000,
        atmosphere: 'None',
        type: 'Dwarf',
        distance_from_sun_km: 999
      };
      const result = PendingPlanet.add(smallDistancePlanet);
      expect(result).toBeFalse();
    });

    it('should reject a planet with a distance of zero', () => {
      const zeroDistancePlanet = {
        name: 'ZeroStar',
        size_km: 5000,
        atmosphere: 'None',
        type: 'Giant',
        distance_from_sun_km: 0
      };
      const result = PendingPlanet.add(zeroDistancePlanet);
      expect(result).toBeFalse();
    });

    it('should reject a planet with a negative distance', () => {
      const negativeDistancePlanet = {
        name: 'NegativeStar',
        size_km: 8000,
        atmosphere: 'CO2',
        type: 'Giant',
        distance_from_sun_km: -100000
      };
      const result = PendingPlanet.add(negativeDistancePlanet);
      expect(result).toBeFalse();
    });

    it('should reject a planet with an unrealistically large distance', () => {
      const hugeDistancePlanet = {
        name: 'FarAway',
        size_km: 100000,
        atmosphere: 'Hydrogen',
        type: 'Gas Giant',
        distance_from_sun_km: 1e15
      };
      const result = PendingPlanet.add(hugeDistancePlanet);
      expect(result).toBeFalse();
    });

    it('should accept a planet with a realistic distance', () => {
      prepareSpy.and.callFake((query) => {
        if (query.includes('SELECT * FROM pending_planets WHERE LOWER(name) = LOWER(?)')) {
          return { get: () => null };
        }
        if (query.includes('INSERT INTO pending_planets')) {
          return { run: () => ({ changes: 1 }) };
        }
        return {
          get: () => null,
          run: () => ({ changes: 1 })
        };
      });

      const realisticDistancePlanet = {
        name: 'TerraNova',
        size_km: 12742,
        atmosphere: 'N2/O2',
        type: 'Terrestrial',
        distance_from_sun_km: 149600000
      };
      const result = PendingPlanet.add(realisticDistancePlanet);
      expect(result).toBeTrue();
    });
  });

  describe('Case-Insensitive Name Validation', () => {
    beforeEach(() => {
      prepareSpy.and.callFake((query) => {
        if (query.includes('LOWER(name)')) {
          return { get: () => null };
        }
        return { get: () => null, run: () => ({ changes: 1 }) };
      });
    });

    it('should reject a planet with a duplicate name regardless of case', () => {
      prepareSpy.and.callFake((query) => {
        if (query.includes('LOWER(name)')) {
          return { get: () => ({ id: 1, name: 'EARTH' }) };
        }
        return { get: () => null, run: () => ({ changes: 1 }) };
      });

      const duplicatePlanet = {
        name: 'earth',
        size_km: 12742,
        atmosphere: 'N2/O2',
        type: 'Terrestrial',
        distance_from_sun_km: 149598262
      };
      const result = PendingPlanet.add(duplicatePlanet);
      expect(result).toBeFalse();
    });

    it('should accept a planet with a unique name ignoring case sensitivity', () => {
      prepareSpy.and.callFake((query) => {
        if (query.includes('LOWER(name)')) {
          return { get: () => null };
        }
        return { get: () => null, run: () => ({ changes: 1 }) };
      });

      const uniquePlanet = {
        name: 'UniquePlanet',
        size_km: 12742,
        atmosphere: 'N2/O2',
        type: 'Terrestrial',
        distance_from_sun_km: 149598262
      };
      const result = PendingPlanet.add(uniquePlanet);
      expect(result).toBeTrue();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', () => {
      spyOn(console, 'error');

      prepareSpy.and.callFake(() => {
        throw new Error('Database connection lost');
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
      expect(console.error).toHaveBeenCalled();
    });
  });
});

//--------------------- ROUTE TESTS ---------------------
describe('Planet Pending Routes', () => {
  let planetListSpy;

  beforeEach(() => {
    spyOn(console, 'error'); // Suppress console errors
    planetListSpy = spyOn(Planet, 'list').and.returnValue([
      { id: 1, name: 'Earth' }
    ]);
  });

  afterEach(() => {
    if (planetListSpy) {
      planetListSpy.calls.reset();
    }
  });

  describe('GET Routes', () => {
    it('should render planets index', () => {
      const routeHandler = pending_planet_router.stack
        .find(layer => layer.route && layer.route.path === '/planets')
        .route.stack[0].handle;

      const req = { 
        query: {},
        method: 'GET'
      };
      
      const res = {
        render: jasmine.createSpy('render')
      };

      routeHandler(req, res);

      expect(res.render).toHaveBeenCalledWith('planets/index', {
        planets: [{ id: 1, name: 'Earth' }],
        errors: undefined,
        message: undefined
      });
      expect(planetListSpy).toHaveBeenCalled();
    });

    it('should return 404 for unknown routes', () => {
      const notFoundHandler = pending_planet_router.stack
        .find(layer => !layer.route)
        .handle;

      const req = {
        method: 'GET',
        url: '/nonexistent'
      };

      const send = jasmine.createSpy('send');
      const res = {
        status: jasmine.createSpy('status').and.returnValue({
          send: send
        })
      };

      const next = jasmine.createSpy('next');

      notFoundHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(send).toHaveBeenCalledWith('Not Found');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('POST Routes', () => {
    it('should submit a new planet', () => {
      spyOn(PendingPlanet, 'add').and.returnValue(true);

      const routeHandler = pending_planet_router.stack
        .find(layer => layer.route && layer.route.path === '/submit')
        .route.stack[0].handle;

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

      routeHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/planets?message=Planet submitted successfully');
      expect(PendingPlanet.add).toHaveBeenCalled();
    });

    it('should not submit a duplicate planet', () => {
      spyOn(PendingPlanet, 'add').and.returnValue(false);

      const routeHandler = pending_planet_router.stack
        .find(layer => layer.route && layer.route.path === '/submit')
        .route.stack[0].handle;

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

      routeHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith('/planets?errors=check that the planet does not already exist and that the fields are valid');
      expect(PendingPlanet.add).toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', () => {
      const routeHandler = pending_planet_router.stack
        .find(layer => layer.route && layer.route.path === '/submit')
        .route.stack[0].handle;

      const req = {
        body: { 
          name: 'Mars' 
        }
      };

      const sendSpy = jasmine.createSpy('send');
      const res = {
        status: jasmine.createSpy('status').and.returnValue({
          send: sendSpy
        })
      };

      routeHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith('All fields are required');
    });

    it('should handle database errors', () => {
      spyOn(PendingPlanet, 'add').and.callFake(() => {
        throw new Error('Database error');
      });
      
      const routeHandler = pending_planet_router.stack
        .find(layer => layer.route && layer.route.path === '/submit')
        .route.stack[0].handle;

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

      try {
        routeHandler(req, res);
        expect(res.redirect).toHaveBeenCalledWith('/planets?errors=Error adding planet');
      } catch (error) {
        expect(error.message).toBe('Database error');
      }
    });
  });

 

  describe('Error Handling', () => {
    it('should handle errors', () => {
      spyOn(console, 'error');

      const errorHandler = pending_planet_router.stack
        .find(layer => layer.route === undefined && layer.handle.length === 4)
        .handle;

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

      const err = new Error('Test Error');
      const next = jasmine.createSpy('next');

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(sendSpy).toHaveBeenCalledWith('Something broke!');
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringMatching('Error: Test Error')
      );
    });

    it('should handle invalid URLs', () => {
      const notFoundHandler = pending_planet_router.stack
        .find(layer => !layer.route)
        .handle;

      const req = {
        method: 'GET',
        url: '/invalid/url'
      };

      const sendSpy = jasmine.createSpy('send');
      const res = {
        status: jasmine.createSpy('status').and.returnValue({
          send: sendSpy
        })
      };

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(sendSpy).toHaveBeenCalledWith('Not Found');
    });
  });

  
});