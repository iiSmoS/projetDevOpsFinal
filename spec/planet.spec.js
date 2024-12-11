
const Planet = require('../models/Planet');
const PendingPlanet = require('../models/PendingPlanet');
const planets_router = require('../routes/planets');
const db = require('../models/db_conf');

const mockPlanet1 = {
  name: 'Earth',
  size_km: 12742,
  atmosphere: 'Nitrogen, Oxygen',
  type: 'Terrestrial',
  distance_from_sun_km: 149600000
};

const mockPlanet2 = {
  id: 1,
  name: 'Mars',
  size_km: 6779,
  atmosphere: 'Carbon Dioxide',
  type: 'Terrestrial',
  distance_from_sun_km: 227900000
};

beforeEach(() => {
  spyOn(db, 'prepare').and.callFake((query) => {
    const mockData = [mockPlanet1, mockPlanet2];

    if (query === "SELECT * FROM planets") {
      return {
        all: () => mockData
      };
    }

    if (query.startsWith("SELECT * FROM planets WHERE name = ?")) {
      return {
        get: (name) => mockData.find(planet => planet.name === name) || null
      };
    }

    if (query.startsWith("INSERT INTO planets")) {
      return {
        run: (name, size_km, atmosphere, type, distance_from_sun_km) => {
          if (mockData.some(planet => planet.name === name)) {
            return { changes: 0 }; // Si la planète existe déjà, ne rien faire
          }
          mockData.push({ name, size_km, atmosphere, type, distance_from_sun_km });
          return { changes: 1 }; // Si la planète est ajoutée
        }
      };
    }

    return { run: () => undefined };
  });
});

describe('Planet.list', () => {
  it('should return all planets from the database', () => {
    const result = Planet.list();
    expect(db.prepare).toHaveBeenCalledWith("SELECT * FROM planets");
    expect(result).toEqual([mockPlanet1, mockPlanet2]);
  });
});

describe('Planet.add', () => {
  it('should add a new planet if it does not already exist', () => {
    const newPlanet = {
      name: 'Saturn-Unique', 
      size_km: 120536,
      atmosphere: 'Hydrogen, Helium',
      type: 'Gas Giant',
      distance_from_sun_km: 1433500000
    };

    const result = Planet.add(newPlanet);
    expect(db.prepare).toHaveBeenCalledWith("SELECT * FROM planets WHERE name = ?");
    expect(db.prepare).toHaveBeenCalledWith("INSERT INTO planets (name, size_km, atmosphere, type, distance_from_sun_km) VALUES (?, ?, ?, ?, ?)");
    expect(result).toBeTrue();
  });
});

describe('Planet.add method (rejecting existing planets)', () => {
  it('should not add a planet if it already exists', () => {
    const result = Planet.add(mockPlanet1);
    expect(result).toBeFalse();
    expect(db.prepare).toHaveBeenCalledWith("SELECT * FROM planets WHERE name = ?");
  });
});

describe('Planet.add method (validation tests)', () => {
  it('should not add a planet if any of the required fields is missing or invalid', () => {
    const invalidPlanet = {
      name: '', 
      size_km: 12104,
      atmosphere: 'Carbon Dioxide, Nitrogen',
      type: 'Terrestrial',
      distance_from_sun_km: 108200000
    };

    const result = Planet.add(invalidPlanet);
    expect(result).toBeFalse();
    expect(db.prepare).not.toHaveBeenCalledWith("SELECT * FROM planets WHERE name = ?");
  });
});

describe('Planet.findByName', () => {
  it('should return a planet by its name', () => {
    const result = Planet.findByName('Earth');
    expect(db.prepare).toHaveBeenCalledWith("SELECT * FROM planets WHERE name = ?");
    expect(result).toEqual({
      name: 'Earth',
      size_km: 12742,
      atmosphere: 'Nitrogen, Oxygen',
      type: 'Terrestrial',
      distance_from_sun_km: 149600000
    });
  });
});

describe('Planet.findByName method (planet not found)', () => {
  it('should return null if the planet is not found in the database', () => {
    const result = Planet.findByName('Pluto');
    expect(db.prepare).toHaveBeenCalledWith("SELECT * FROM planets WHERE name = ?");
    expect(result).toBeNull();
  });
});



describe('Planets Routes', () => {
    // Declare all spies
    let planetListSpy, planetAddSpy;
    let pendingPlanetListSpy, pendingPlanetFindByIdSpy, pendingPlanetDeleteByIdSpy;
    let dbPrepareSpy;

    beforeEach(() => {
        jasmine.getEnv().allowRespy(true);

        // Planet mock setup
        planetListSpy = spyOn(Planet, 'list').and.returnValue([
            { id: 1, name: 'Earth' }
        ]);
        planetAddSpy = spyOn(Planet, 'add').and.returnValue(true);

        // PendingPlanet mock setup
        pendingPlanetListSpy = spyOn(PendingPlanet, 'list').and.returnValue([
            { id: 2, name: 'Mars' }
        ]);
        pendingPlanetFindByIdSpy = spyOn(PendingPlanet, 'findById').and.returnValue({
            id: 2, 
            name: 'Mars', 
            size_km: 6779,
            atmosphere: 'CO2', 
            type: 'Terrestrial',
            distance_from_sun_km: 227943824
        });
        pendingPlanetDeleteByIdSpy = spyOn(PendingPlanet, 'deleteById').and.returnValue(true);

        // Database mock
        dbPrepareSpy = spyOn(db, 'prepare').and.callFake(() => ({
            get: () => null,
            run: () => ({ changes: 1 }),
            all: () => []
        }));
    });

    afterEach(() => {
        // Reset all spies
        [planetListSpy, planetAddSpy, 
         pendingPlanetListSpy, pendingPlanetFindByIdSpy, pendingPlanetDeleteByIdSpy,
         dbPrepareSpy].forEach(spy => {
            if (spy) spy.calls.reset();
        });
    });

    describe('GET /', () => {
        it('should render planets index', () => {
            const routeHandler = planets_router.stack
                .find(layer => layer.route?.path === '/')
                .route.stack[0].handle;

            const req = { query: {} };
            const res = { render: jasmine.createSpy('render') };

            routeHandler(req, res);

            expect(res.render).toHaveBeenCalledWith('planets/index', {
                planets: [{ id: 1, name: 'Earth' }],
                pendingPlanets: [{ id: 2, name: 'Mars' }],
                errors: undefined,
                message: undefined
            });
        });
    });

    describe('POST /add', () => {
        it('should add a new planet', () => {
            const routeHandler = planets_router.stack
                .find(layer => layer.route?.path === '/add')
                .route.stack[0].handle;

            const req = {
                body: {
                    name: 'Jupiter',
                    size_km: '139820',
                    atmosphere: 'H2/He',
                    type: 'Gas Giant',
                    distance_from_sun_km: '778500000'
                }
            };
            const res = { redirect: jasmine.createSpy('redirect') };

            routeHandler(req, res);

            expect(planetAddSpy).toHaveBeenCalled();
            expect(res.redirect).toHaveBeenCalledWith('/planets');
        });
    });

    describe('POST /submit', () => {
        it('should submit a pending planet with valid data', () => {
            const routeHandler = planets_router.stack
                .find(layer => layer.route?.path === '/submit')
                .route.stack[0].handle;

            const req = {
                body: {
                    name: 'Neptune',
                    size_km: '49244',
                    atmosphere: 'H2/He/CH4',
                    type: 'Ice Giant',
                    distance_from_sun_km: '4495000000'
                }
            };
            const res = { redirect: jasmine.createSpy('redirect') };

            routeHandler(req, res);

            expect(res.redirect).toHaveBeenCalledWith('/planets?message=Planet submitted successfully');
        });
    });

    describe('Admin Operations', () => {
        describe('POST /approve/:id', () => {
            it('should approve pending planet when admin', () => {
                const routeHandler = planets_router.stack
                    .find(layer => layer.route?.path === '/approve/:id')
                    .route.stack[0].handle;

                const req = {
                    params: { id: 2 },
                    session: { admin: true }
                };
                const res = { redirect: jasmine.createSpy('redirect') };

                routeHandler(req, res);

                expect(pendingPlanetFindByIdSpy).toHaveBeenCalledWith(2);
                expect(planetAddSpy).toHaveBeenCalled();
                expect(pendingPlanetDeleteByIdSpy).toHaveBeenCalledWith(2);
                expect(res.redirect).toHaveBeenCalledWith('/planets?message=Planet approved');
            });

            it('should redirect non-admin users', () => {
                const routeHandler = planets_router.stack
                    .find(layer => layer.route?.path === '/approve/:id')
                    .route.stack[0].handle;

                const req = {
                    params: { id: 2 },
                    session: { admin: false }
                };
                const res = { redirect: jasmine.createSpy('redirect') };

                routeHandler(req, res);

                expect(res.redirect).toHaveBeenCalledWith('/members');
            });
        });

        describe('POST /reject/:id', () => {
            it('should reject pending planet when admin', () => {
                const routeHandler = planets_router.stack
                    .find(layer => layer.route?.path === '/reject/:id')
                    .route.stack[0].handle;

                const req = {
                    params: { id: 2 },
                    session: { admin: true }
                };
                const res = { redirect: jasmine.createSpy('redirect') };

                routeHandler(req, res);

                expect(pendingPlanetDeleteByIdSpy).toHaveBeenCalledWith(2);
                expect(res.redirect).toHaveBeenCalledWith('/planets?message=Planet rejected');
            });

            it('should redirect non-admin users', () => {
                const routeHandler = planets_router.stack
                    .find(layer => layer.route?.path === '/reject/:id')
                    .route.stack[0].handle;

                const req = {
                    params: { id: 2 },
                    session: { admin: false }
                };
                const res = { redirect: jasmine.createSpy('redirect') };

                routeHandler(req, res);

                expect(res.redirect).toHaveBeenCalledWith('/members');
            });
        });
    });
});