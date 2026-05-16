import { expect } from "chai";
import { parseAuditHistoryQuery } from "../../backend/src/validators/pagination.js";
import { parseRegisterPayload } from "../../backend/src/validators/auth.js";

describe("DB/Input behavior", function () {
  it("caps audit page size to protect DB", function () {
    const result = parseAuditHistoryQuery({ page: "1", pageSize: "9999" });
    expect(result.pageSize).to.equal(50);
  });

  it("enforces wallet address for student registration", function () {
    expect(() =>
      parseRegisterPayload({
        fullName: "Student",
        email: "student@example.com",
        password: "secret123",
        role: "student",
        walletAddress: "invalid",
      })
    ).to.throw();
  });

  it("allows non-student registration without wallet address", function () {
    const result = parseRegisterPayload({
      fullName: "Auditor One",
      email: "auditor@example.com",
      password: "secret123",
      role: "auditor",
    });
    expect(result.role).to.equal("auditor");
    expect(result.walletAddress).to.equal("");
  });
});
