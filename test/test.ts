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
      body: {},
    });

    const response = buildResponse();
    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 400);

    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request");
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
          company_id: 1,
        },
      },
      body: {},
    });

    const response = buildResponse();
    const next = sinon.stub();

    await postEmployeeJoinRequest(request, response, next);

    sinon.assert.calledWith(response.status as sinon.SinonSpy, 400);

    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Bad request");
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
  });

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

    expect(response.statusCode).to.equal(500);
    expect(next.calledOnce).to.be.true;
    expect(next.firstCall.args[0]).to.be.an("error");
    expect(next.firstCall.args[0].message).to.equal("Internal server error");
  });
});
