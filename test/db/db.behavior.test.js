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
});
