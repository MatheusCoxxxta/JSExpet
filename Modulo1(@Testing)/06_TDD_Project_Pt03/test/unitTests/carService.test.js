const { describe, it, before, beforeEach, afterEach } = require("mocha");
const CarService = require("../../src/services/carService");
const { join } = require("path");
const { expect } = require("chai");
const sinon = require("sinon");
const Transaction = require("../../src/entities/transaction");

const mocks = {
  validCar: require("../mocks/valid-car.json"),
  validCarCategory: require("../mocks/valid-carCategory.json"),
  validCustomer: require("../mocks/valid-customer.json"),
};

const carsDatabase = join(__dirname, "./../../database/cars.json");

describe("CarService Suite", () => {
  let carService = {};
  let sandbox = {};

  before(() => {
    carService = new CarService({
      cars: carsDatabase,
    });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should retrive a random position from an array", () => {
    const data = [0, 1, 2, 3, 4];
    const result = carService.getRandomPositionFromArray(data);

    expect(result).to.be.lte(data.length).and.be.gte(0);
  });

  it("should choose the first id from carIds in carCategory", () => {
    const carCategory = mocks.validCarCategory;
    const carIdIndex = 0;

    sandbox
      .stub(carService, carService.getRandomPositionFromArray.name)
      .returns(carIdIndex);

    const result = carService.chooseRandomCar(carCategory);

    const expected = carCategory.carIds[carIdIndex];

    expect(carService.getRandomPositionFromArray.calledOnce).to.be.ok;
    expect(result).to.be.equal(expected);
  });

  it("should return an available car given a carCategory", async () => {
    const car = mocks.validCar;

    const carCategory = Object.create(mocks.validCarCategory);
    carCategory.carIds = [car.id];

    sandbox
      .stub(carService.carRepository, carService.carRepository.find.name)
      .resolves(car);

    sandbox.spy(carService, carService.chooseRandomCar.name);

    const result = await carService.getAvailableCar(carCategory);

    const expected = car;

    expect(result).to.be.deep.equal(expected);
    expect(carService.chooseRandomCar.calledOnce).to.be.ok;
    expect(carService.carRepository.find.calledWithExactly(car.id));
  });

  it("should calculate the final amount in real when given a carCategory, customer and numberOfDays", async () => {
    const customer = Object.create(mocks.validCustomer);
    customer.age = 50;

    const carCategory = Object.create(mocks.validCarCategory);
    carCategory.price = 37.6;

    const numberOfDays = 5;

    sandbox
      .stub(carService, "taxesBasedOnAge")
      .get(() => [{ from: 40, to: 50, then: 1.3 }]);

    const expected = carService.currencyFormat.format(244.4);

    const result = carService.calculateFinalPrice(
      carCategory,
      customer,
      numberOfDays
    );

    expect(result).to.be.deep.equal(expected);
  });

  it("should return a transaction receipt when given a customer, carCategory, numberOfDays", async () => {
    const car = mocks.validCar;
    const carCategory = {
      ...mocks.validCarCategory,
      price: 37.6,
      carIds: [car.id],
    };

    const customer = Object.create(mocks.validCustomer);
    customer.age = 20;

    const numberOfDays = 5;

    const dueDate = "10 de novembro de 2020";

    const staticDate = new Date(2020, 10, 5);

    sandbox.useFakeTimers(staticDate.getTime());

    sandbox
      .stub(carService.carRepository, carService.carRepository.find.name)
      .resolves(car);

    const expectedAmount = carService.currencyFormat.format(206.8);

    const expected = new Transaction({
      customer,
      car,
      amount: expectedAmount,
      dueDate,
    });

    const result = await carService.rent(customer, carCategory, numberOfDays);

    expect(result).to.be.deep.equal(expected);
  });
});
