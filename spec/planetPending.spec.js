// FILE: models/PendingPlanet.test.js

const PendingPlanet = require("../models/PendingPlanet");
const db = require("../models/db_conf");

describe("PendingPlanet", () => {
  beforeEach(() => {
    // Mock the db.prepare method
    spyOn(db, "prepare").and.returnValue({
      all: jasmine
        .createSpy("all")
        .and.returnValue([{ id: 1, name: "Planet1" }]),
      get: jasmine.createSpy("get").and.returnValue({ id: 1, name: "Planet1" }),
      run: jasmine.createSpy("run").and.returnValue({ changes: 1 }),
    });
  });

  it("should return a list of pending planets", () => {
    const planets = PendingPlanet.list();
    expect(planets).toEqual([{ id: 1, name: "Planet1" }]);
  });

  it("should return a pending planet by id", () => {
    const planet = PendingPlanet.findById(1);
    expect(planet).toEqual({ id: 1, name: "Planet1" });
  });

  it("should delete a pending planet by id", () => {
    const result = PendingPlanet.deleteById(1);
    expect(result).toBe(true);
    expect(db.prepare().run).toHaveBeenCalledWith(1);
  });

  it("should add a basic pending planet", () => {
    const planetData = {
      name: "Mars",
      size_km: 6779,
      distance_from_sun_km: 227943824,
    };
    const result = PendingPlanet.add(planetData);
    expect(result).toBe(true);
    expect(db.prepare().run).toHaveBeenCalledWith(
      planetData.name,
      planetData.size_km,
      planetData.distance_from_sun_km
    );
  });
  it("should reject incomplete planet data", () => {
    const incompleteData = { name: "Mars" };
    const result = PendingPlanet.add(incompleteData);
    expect(result).toBe(false);
    // No run call should be made for incomplete data
    expect(db.prepare().run).not.toHaveBeenCalled();
  });
});