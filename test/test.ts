import { expect } from "chai";
import sinon from "sinon";
import { Request, Response, NextFunction } from "express";
import * as expressValidator from "express-validator";
import * as xssModule from "xss";
import * as updateFunctions from "../controllers/manager"; // Adjust the path accordingly
import { AppDataSource } from "../data-source"; // Adjust the path accordingly
import { postUpdateEmployeePresentEarnings } from "../controllers/manager"; // Adjust the path accordingly

describe("postUpdateEmployeePresentEarnings", () => {
  let req: any
  let res: any
  let next: any
  let logger: any;
  let validationResultStub: sinon.SinonStub;
  let xssStub: sinon.SinonStub;
  let updateSalaryStub: sinon.SinonStub;
  let updateBonusStub: sinon.SinonStub;
  let createQueryRunnerStub: sinon.SinonStub;
  let queryRunner: any;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      session: {
        user: {
          authorized_employees_ids: [],
        },
      },
    };

    res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      redirect: sinon.stub(),
    };

    next = sinon.stub();

    logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
    };

    res.locals.logger = logger;

    validationResultStub = sinon.stub(expressValidator, "validationResult");
    xssStub = sinon.stub(xssModule, "default");

    updateSalaryStub = sinon.stub(updateFunctions, "updatePresentMonthEmployeeSalary");
    updateBonusStub = sinon.stub(updateFunctions, "updatePresentMonthEmployeeSalaryHistoryByBonus");

    queryRunner = {
      connect: sinon.stub().resolves(),
      startTransaction: sinon.stub(),
      commitTransaction: sinon.stub(),
      rollbackTransaction: sinon.stub(),
      release: sinon.stub(),
    };

    createQueryRunnerStub = sinon.stub(AppDataSource, "createQueryRunner").returns(queryRunner);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should handle validation errors", async () => {
    validationResultStub.returns({
      isEmpty: () => false,
      array: () => [{ msg: "Validation error" }],
    });

    await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

    expect(logger.error.calledWith(sinon.match.string)).to.be.true;
    expect(res.status.calledWith(400)).to.be.true;
    expect(next.calledOnce).to.be.true;
    expect((next as sinon.SinonStub).args[0][0].message).to.equal("Bad request: Validation error");
  });

  it("should handle unauthorized access", async () => {
    validationResultStub.returns({ isEmpty: () => true });

    req.params.employee_id = "123";
    xssStub.withArgs("123").returns("123");
    req.session!.user!.authorized_employees_ids = [456];

    await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

    expect(logger.warn.calledWith("Unauthorized")).to.be.true;
    expect(res.status.calledWith(403)).to.be.true;
    expect(next.calledOnce).to.be.true;
    expect((next as sinon.SinonStub).args[0][0].message).to.equal("Unauthorized");
  });

  it("should handle missing type", async () => {
    validationResultStub.returns({ isEmpty: () => true });

    req.params.employee_id = "123";
    xssStub.withArgs("123").returns("123");
    req.session!.user!.authorized_employees_ids = [123];
    req.body = {};

    await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

    expect(logger.error.calledWith("Type is required")).to.be.true;
    expect(res.status.calledWith(500)).to.be.true;
    expect(next.calledOnce).to.be.true;
    expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
  });

  it("should handle invalid type", async () => {
    validationResultStub.returns({ isEmpty: () => true });

    req.params.employee_id = "123";
    xssStub.withArgs("123").returns("123");
    req.session!.user!.authorized_employees_ids = [123];
    req.body = { type: "invalid_type" };

    await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

    expect(logger.error.calledWith("Invalid type")).to.be.true;
    expect(res.status.calledWith(500)).to.be.true;
    expect(next.calledOnce).to.be.true;
    expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
  });

  it("should handle missing hours_change when type is hours_change", async () => {
    validationResultStub.returns({ isEmpty: () => true });

    req.params.employee_id = "123";
    xssStub.withArgs("123").returns("123");
    req.session!.user!.authorized_employees_ids = [123];
    req.body = { type: "hours_change" };

    await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

    expect(logger.error.calledWith("Hours change is required")).to.be.true;
    expect(res.status.calledWith(500)).to.be.true;
    expect(next.calledOnce).to.be.true;
    expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
  });

  it("should handle missing salary or bonus when type is salary_update", async () => {
    validationResultStub.returns({ isEmpty: () => true });

    req.params.employee_id = "123";
    xssStub.withArgs("123").returns("123");
    req.session!.user!.authorized_employees_ids = [123];
    req.body = { type: "salary_update" };

    await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

    expect(logger.error.calledWith("Salary and bonus are required")).to.be.true;
    expect(res.status.calledWith(500)).to.be.true;
    expect(next.calledOnce).to.be.true;
    expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
  });

  it("should update salary and bonus successfully", async () => {
    validationResultStub.returns({ isEmpty: () => true });

    req.params.employee_id = "123";
    xssStub.withArgs("123").returns("123");
    req.session!.user!.authorized_employees_ids = [123];
    req.body = { type: "salary_update", salary: 5000, bonus: 500 };

    updateSalaryStub.resolves();
    updateBonusStub.resolves();

    await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

    expect(queryRunner.connect.calledOnce).to.be.true;
    expect(queryRunner.startTransaction.calledOnce).to.be.true;
    expect(updateSalaryStub.calledWith("123", 5000, logger)).to.be.true;
    expect(updateBonusStub.calledWith("123", 500, logger)).to.be.true;
    expect(queryRunner.commitTransaction.calledOnce).to.be.true;
    expect(res.redirect.calledWith("/manager/single-emp-details/123")).to.be.true;
  });

  it("should handle error during salary update", async () => {
    validationResultStub.returns({ isEmpty: () => true });

    req.params.employee_id = "123";
    xssStub.withArgs("123").returns("123");
    req.session!.user!.authorized_employees_ids = [123];
    req.body = { type: "salary_update", salary: 5000, bonus: 500 };

    const error = new Error("Database error");
    updateSalaryStub.rejects(error);

    await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

    expect(queryRunner.connect.calledOnce).to.be.true;
    expect(queryRunner.startTransaction.calledOnce).to.be.true;
    expect(updateSalaryStub.calledWith("123", 5000, logger)).to.be.true;
    expect(queryRunner.rollbackTransaction.calledOnce).to.be.true;
    expect(logger.error.calledWith(sinon.match("Error updating present employee details:"))).to.be.true;
    expect(res.status.calledWith(500)).to.be.true;
    expect(next.calledOnce).to.be.true;
    expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
  });
});
