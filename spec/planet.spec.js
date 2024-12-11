const Planet = require('../models/Planet');
const db = require('../models/db_conf');

const mockPlanet = {
  name: 'Earth',
  size_km: 12742,
  atmosphere: 'Nitrogen, Oxygen',
  type: 'Terrestrial',
  distance_from_sun_km: 149600000
};

const mockPendingPlanet = {
  id: 1,
  name: 'Mars',
  size_km: 6779,
  atmosphere: 'Carbon Dioxide',
  type: 'Terrestrial',
  distance_from_sun_km: 227900000
};

beforeEach(() => {
  spyOn(db, 'prepare').and.callFake((query) => {
    let mockData = [
      { name: 'Earth', size_km: 12742, atmosphere: 'Nitrogen, Oxygen', type: 'Terrestrial', distance_from_sun_km: 149600000 },
      { name: 'Mars', size_km: 6779, atmosphere: 'Carbon Dioxide', type: 'Terrestrial', distance_from_sun_km: 227900000 }
    ];

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
            return { changes: 0 };
          }
          mockData.push({ name, size_km, atmosphere, type, distance_from_sun_km });
          return { changes: 1 };
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
    expect(result).toEqual([
      { name: 'Earth', size_km: 12742, atmosphere: 'Nitrogen, Oxygen', type: 'Terrestrial', distance_from_sun_km: 149600000 },
      { name: 'Mars', size_km: 6779, atmosphere: 'Carbon Dioxide', type: 'Terrestrial', distance_from_sun_km: 227900000 }
    ]);
  });
});
