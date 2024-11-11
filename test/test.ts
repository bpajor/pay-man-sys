import * as httpMocks from "node-mocks-http";
import events from "events";
import { expect } from "chai";
import { postEmployeeJoinRequest } from "../controllers/employee";
import sinon from "sinon";
import { MockTypeORM } from "mock-typeorm";
import { Company } from "../entity/Company";
import { User } from "../entity/User";
import { JoinRequest } from "../entity/JoinRequest";
import { AppDataSource } from "../data-source";
import { Employee } from "../entity/Employee";

const buildResponse = () => {
  const res = httpMocks.createResponse({
    eventEmitter: events.EventEmitter,
    locals: {
      logger: {
        info: sinon.stub(),
        error: sinon.stub(),
        warn: sinon.stub(),
      },
    },
  });
  // Sprawdzenie statusu za pomocą szpiegowania
  sinon.spy(res, "status");
  return res;
};

describe("PostEmployeeJoinRequest", () => {
  let typeorm: MockTypeORM;

  const mock_employee = {
    id: 1,
  };

  const mock_company = {
    id: 1,
    name: "Test Company",
    hours_per_day: 8,
    max_days_per_month: 20,
    managerId: 1,
    created_at: new Date(),
    sick_leave_percent_factor: 0.8,
    vacation_percent_factor: 0.8,
    on_demand_percent_factor: 0,
    retirement_rate: 0.0976,
    disability_rate: 0.05,
    healthcare_rate: 0.02,
    income_tax_rate: 0.19,
    employees: [],
    join_requests: [],
  };
  beforeEach(async () => {
    typeorm = new MockTypeORM();
  });

  afterEach(async () => {
    typeorm.restore();
  });

  it("should end up in error middleware when uid is not defined with code 400", async () => {
    const request = httpMocks.createRequest({
      method: "POST",
      url: "/employee/join-request",
      session: {
        user: {
          account_type: "employee",
          id: 1,
          email: "test@test.com",
        },
      },
      body: {}, // Ustaw brakujące dane, by wymusić błąd
    });

    const response = buildResponse();
    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 400);
    // Sprawdź, czy `next` zostało wywołane z błędem
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request"); // lub odpowiednia wiadomość błędu
  });

  it("should end up in error middleware when user is entitled to company with code 400", async () => {
    const request = httpMocks.createRequest({
      method: "POST",
      url: "/employee/join-request",
      session: {
        user: {
          account_type: "employee",
          id: 1,
          email: "test@test.com",
          company_id: 1
        },
      },
      body: {}, // Ustaw brakujące dane, by wymusić błąd
    });

    const response = buildResponse();
    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 400);
    // Sprawdź, czy `next` zostało wywołane z błędem
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request"); // lub odpowiednia wiadomość błędu
  });

  it("should end up in error middleware when user in not entitled to any company with code 400", async () => {
    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          id: 1,
        },
      },
    });

    const response = buildResponse();
    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 400);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request");
  });

  it("should end up in error middleware when company name was not passed in body with code 400", async () => {
    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
    });

    const response = buildResponse();
    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 400);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request");
  });

  it("should end up in error middleware when employee already exists, with code 400", async () => {
    typeorm.onMock(Employee).toReturn(true, "exists");
    
    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 400);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request");
  })

  it("should end up in error middleware when company has not been found in db, with code 404", async () => {
    typeorm.onMock(Employee).toReturn(false, "exists");
    typeorm.onMock(Company).toReturn(undefined, "findOneBy");

    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 404);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request");
  });

  it("should end up in error middleware when user with uid from session has not been found in db, with code 404", async () => {
    typeorm.onMock(Employee).toReturn(false, "exists");
    typeorm.onMock(Company).toReturn(mock_company, "findOneBy");
    typeorm.onMock(User).toReturn(undefined, "findOneBy");

    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 404);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request");
  });

  it("should end up in error middleware when join request for user with uid from session has already been sent, with code 400", async () => {
    typeorm.onMock(Employee).toReturn(false, "exists");
    typeorm.onMock(Company).toReturn(mock_company, "findOneBy");
    typeorm.onMock(User).toReturn(mock_employee, "findOneBy");
    typeorm.onMock(JoinRequest).toReturn(true, "exists");

    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 400);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request");
  });

  it("should return http status code 302 with redirect", async () => {
    typeorm.onMock(Employee).toReturn(false, "exists");
    typeorm.onMock(Company).toReturn(mock_company, "findOneBy");
    typeorm.onMock(User).toReturn(mock_employee, "findOneBy");
    typeorm.onMock(JoinRequest).toReturn(false, "exists");
    typeorm.onMock(JoinRequest).toReturn({ rowsAffected: 1 }, "save");

    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    response.on("end", () => {
      expect(response._getRedirectUrl()).to.equal("/employee/dashboard");
    });

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    // sinon.assert.calledWith(response.status as sinon.SinonSpy, 302);
    expect(response.statusCode).to.equal(302);
  });

  it("should end up in error middleware with Internal Server Error message when checking if employee exists in db fails, with code 500", async () => {
    typeorm.onMock(Employee).toReturn(new Error(), "exists");

    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    // sinon.assert.calledWith(response.status as sinon.SinonSpy, 302);
    expect(response.statusCode).to.equal(500);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Internal server error");
  });


  it("should end up in error middleware with Internal Server Error message when getting company from db throws an error, with code 500", async () => {
    typeorm.onMock(Employee).toReturn(false, "exists");
    typeorm.onMock(Company).toReturn(new Error(), "findOneBy");
    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    // sinon.assert.calledWith(response.status as sinon.SinonSpy, 302);
    expect(response.statusCode).to.equal(500);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Internal server error");
  });

  it("should end up in error middleware with Internal Server Error message when getting user from db throws an error, with code 500", async () => {
    typeorm.onMock(Employee).toReturn(false, "exists");
    typeorm.onMock(Company).toReturn(mock_company, "findOneBy");
    typeorm.onMock(User).toReturn(new Error(), "findOneBy");

    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    // sinon.assert.calledWith(response.status as sinon.SinonSpy, 302);
    expect(response.statusCode).to.equal(500);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Internal server error");
  });

  it("should end up in error middleware with Internal Server Error message when checking if join request exists at db throws an error, with code 500", async () => {
    typeorm.onMock(Employee).toReturn(false, "exists");
    typeorm.onMock(Company).toReturn(mock_company, "findOneBy");
    typeorm.onMock(User).toReturn(mock_employee, "findOneBy");
    typeorm.onMock(JoinRequest).toReturn(new Error(), "exists");

    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    // sinon.assert.calledWith(response.status as sinon.SinonSpy, 302);
    expect(response.statusCode).to.equal(500);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Internal server error");
  });

  it("should end up in error middleware with Internal Server Error message when saving join request to db throws an error, with code 500", async () => {
    typeorm.onMock(Employee).toReturn(false, "exists");
    typeorm.onMock(Company).toReturn(mock_company, "findOneBy");
    typeorm.onMock(User).toReturn(mock_employee, "findOneBy");
    typeorm.onMock(JoinRequest).toReturn(false, "exists");
    typeorm.onMock(JoinRequest).toReturn(new Error(), "save");

    const request = httpMocks.createRequest({
      url: "/employee/join-request",
      method: "POST",
      session: {
        user: {
          account_type: "employee",
          email: "test@test.com",
          uid: 1,
        },
      },
      body: {
        company_name: "Test Company",
      },
    });

    const response = buildResponse();

    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    // sinon.assert.calledWith(response.status as sinon.SinonSpy, 302);
    expect(response.statusCode).to.equal(500);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Internal server error");
  });
});

// import { expect } from "chai";
// import sinon from "sinon";
// import { Request, Response, NextFunction } from "express";
// import * as expressValidator from "express-validator";
// import * as xssModule from "xss";
// import * as updateFunctions from "../controllers/manager"; // Adjust the path accordingly
// import { AppDataSource } from "../data-source"; // Adjust the path accordingly
// import { postUpdateEmployeePresentEarnings } from "../controllers/manager"; // Adjust the path accordingly

// describe("postUpdateEmployeePresentEarnings", () => {
//   let req: any
//   let res: any
//   let next: any
//   let logger: any;
//   let validationResultStub: sinon.SinonStub;
//   let xssStub: sinon.SinonStub;
//   let updateSalaryStub: sinon.SinonStub;
//   let updateBonusStub: sinon.SinonStub;
//   let createQueryRunnerStub: sinon.SinonStub;
//   let queryRunner: any;

//   beforeEach(() => {
//     req = {
//       params: {},
//       body: {},
//       session: {
//         user: {
//           authorized_employees_ids: [],
//         },
//       },
//     };

//     res = {
//       locals: {},
//       status: sinon.stub().returnsThis(),
//       redirect: sinon.stub(),
//     };

//     next = sinon.stub();

//     logger = {
//       info: sinon.stub(),
//       error: sinon.stub(),
//       warn: sinon.stub(),
//     };

//     res.locals.logger = logger;

//     validationResultStub = sinon.stub(expressValidator, "validationResult");
//     xssStub = sinon.stub(xssModule, "default");

//     updateSalaryStub = sinon.stub(updateFunctions, "updatePresentMonthEmployeeSalary");
//     updateBonusStub = sinon.stub(updateFunctions, "updatePresentMonthEmployeeSalaryHistoryByBonus");

//     queryRunner = {
//       connect: sinon.stub().resolves(),
//       startTransaction: sinon.stub(),
//       commitTransaction: sinon.stub(),
//       rollbackTransaction: sinon.stub(),
//       release: sinon.stub(),
//     };

//     createQueryRunnerStub = sinon.stub(AppDataSource, "createQueryRunner").returns(queryRunner);
//   });

//   afterEach(() => {
//     sinon.restore();
//   });

//   it("should handle validation errors", async () => {
//     validationResultStub.returns({
//       isEmpty: () => false,
//       array: () => [{ msg: "Validation error" }],
//     });

//     await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

//     expect(logger.error.calledWith(sinon.match.string)).to.be.true;
//     expect(res.status.calledWith(400)).to.be.true;
//     expect(next.calledOnce).to.be.true;
//     expect((next as sinon.SinonStub).args[0][0].message).to.equal("Bad request: Validation error");
//   });

//   it("should handle unauthorized access", async () => {
//     validationResultStub.returns({ isEmpty: () => true });

//     req.params.employee_id = "123";
//     xssStub.withArgs("123").returns("123");
//     req.session!.user!.authorized_employees_ids = [456];

//     await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

//     expect(logger.warn.calledWith("Unauthorized")).to.be.true;
//     expect(res.status.calledWith(403)).to.be.true;
//     expect(next.calledOnce).to.be.true;
//     expect((next as sinon.SinonStub).args[0][0].message).to.equal("Unauthorized");
//   });

//   it("should handle missing type", async () => {
//     validationResultStub.returns({ isEmpty: () => true });

//     req.params.employee_id = "123";
//     xssStub.withArgs("123").returns("123");
//     req.session!.user!.authorized_employees_ids = [123];
//     req.body = {};

//     await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

//     expect(logger.error.calledWith("Type is required")).to.be.true;
//     expect(res.status.calledWith(500)).to.be.true;
//     expect(next.calledOnce).to.be.true;
//     expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
//   });

//   it("should handle invalid type", async () => {
//     validationResultStub.returns({ isEmpty: () => true });

//     req.params.employee_id = "123";
//     xssStub.withArgs("123").returns("123");
//     req.session!.user!.authorized_employees_ids = [123];
//     req.body = { type: "invalid_type" };

//     await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

//     expect(logger.error.calledWith("Invalid type")).to.be.true;
//     expect(res.status.calledWith(500)).to.be.true;
//     expect(next.calledOnce).to.be.true;
//     expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
//   });

//   it("should handle missing hours_change when type is hours_change", async () => {
//     validationResultStub.returns({ isEmpty: () => true });

//     req.params.employee_id = "123";
//     xssStub.withArgs("123").returns("123");
//     req.session!.user!.authorized_employees_ids = [123];
//     req.body = { type: "hours_change" };

//     await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

//     expect(logger.error.calledWith("Hours change is required")).to.be.true;
//     expect(res.status.calledWith(500)).to.be.true;
//     expect(next.calledOnce).to.be.true;
//     expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
//   });

//   it("should handle missing salary or bonus when type is salary_update", async () => {
//     validationResultStub.returns({ isEmpty: () => true });

//     req.params.employee_id = "123";
//     xssStub.withArgs("123").returns("123");
//     req.session!.user!.authorized_employees_ids = [123];
//     req.body = { type: "salary_update" };

//     await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

//     expect(logger.error.calledWith("Salary and bonus are required")).to.be.true;
//     expect(res.status.calledWith(500)).to.be.true;
//     expect(next.calledOnce).to.be.true;
//     expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
//   });

//   it("should update salary and bonus successfully", async () => {
//     validationResultStub.returns({ isEmpty: () => true });

//     req.params.employee_id = "123";
//     xssStub.withArgs("123").returns("123");
//     req.session!.user!.authorized_employees_ids = [123];
//     req.body = { type: "salary_update", salary: 5000, bonus: 500 };

//     updateSalaryStub.resolves();
//     updateBonusStub.resolves();

//     await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

//     expect(queryRunner.connect.calledOnce).to.be.true;
//     expect(queryRunner.startTransaction.calledOnce).to.be.true;
//     expect(updateSalaryStub.calledWith("123", 5000, logger)).to.be.true;
//     expect(updateBonusStub.calledWith("123", 500, logger)).to.be.true;
//     expect(queryRunner.commitTransaction.calledOnce).to.be.true;
//     expect(res.redirect.calledWith("/manager/single-emp-details/123")).to.be.true;
//   });

//   it("should handle error during salary update", async () => {
//     validationResultStub.returns({ isEmpty: () => true });

//     req.params.employee_id = "123";
//     xssStub.withArgs("123").returns("123");
//     req.session!.user!.authorized_employees_ids = [123];
//     req.body = { type: "salary_update", salary: 5000, bonus: 500 };

//     const error = new Error("Database error");
//     updateSalaryStub.rejects(error);

//     await postUpdateEmployeePresentEarnings(req as Request, res as Response, next);

//     expect(queryRunner.connect.calledOnce).to.be.true;
//     expect(queryRunner.startTransaction.calledOnce).to.be.true;
//     expect(updateSalaryStub.calledWith("123", 5000, logger)).to.be.true;
//     expect(queryRunner.rollbackTransaction.calledOnce).to.be.true;
//     expect(logger.error.calledWith(sinon.match("Error updating present employee details:"))).to.be.true;
//     expect(res.status.calledWith(500)).to.be.true;
//     expect(next.calledOnce).to.be.true;
//     expect((next as sinon.SinonStub).args[0][0].message).to.equal("Internal server error");
//   });
// });
