/**
 * Security authorization boundary tests.
 *
 * Scope:
 * - Confirms non-admin roles cannot access privileged export/verification actions.
 * - Confirms protected routes reject missing auth context.
 */
import request from "supertest";
import { expect } from "chai";
import app from "../../backend/src/app.js";

describe("Security: authorization boundaries", function () {
  it("blocks export endpoints for non-admin", async function () {
    const response = await request(app)
      .get("/api/exports/transactions.csv")
      .set("x-user-role", "auditor");
    expect(response.status).to.equal(403);
  });

  it("requires auth context for protected APIs", async function () {
    const response = await request(app).get("/api/audits/history?page=1&pageSize=5");
    expect(response.status).to.equal(403);
  });

  it("blocks role without admin privilege from verifying users", async function () {
    const response = await request(app)
      .patch("/api/users/2/verify")
      .set("x-user-role", "student");
    expect(response.status).to.equal(403);
  });
});
