const Planet = require('../models/Planet');
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
