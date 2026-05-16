import request from "supertest";
import { expect } from "chai";

import app from "../../backend/src/app.js";

describe("Backend API", function () {
  it("returns health status", async function () {
    const response = await request(app).get("/api/health");
    expect(response.status).to.equal(200);
    expect(response.body.ok).to.equal(true);
  });

  it("validates scholarship approval payload", async function () {
    const response = await request(app)
      .post("/api/scholarships/approve")
      .set("x-user-role", "admin")
      .send({
        studentAddress: "invalid",
        amountWei: "0",
        installments: 0,
        claimWindowSeconds: 0,
      });

    expect(response.status).to.equal(400);
    expect(response.body.error).to.be.a("string");
  });

  it("returns deterministic error for audit history when DB is not configured", async function () {
    // Expected dependency error ensures clients can distinguish infra vs input failures.
    const response = await request(app)
      .get("/api/audits/history?page=1&pageSize=5")
      .set("x-user-role", "auditor");
    expect(response.status).to.equal(503);
    expect(response.body.error).to.equal("PostgreSQL not configured");
  });

  it("blocks audit updates for non-admin role", async function () {
    const response = await request(app)
      .patch("/api/audits/approval/1")
      .set("x-user-role", "auditor")
      .send({ auditStatus: "reviewed", auditNote: "checked" });

    expect(response.status).to.equal(403);
    expect(response.body.error).to.equal("Forbidden for this role");
  });
});
