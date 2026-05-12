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
    const response = await request(app).post("/api/scholarships/approve").send({
      studentAddress: "invalid",
      amountWei: "0",
      installments: 0,
      claimWindowSeconds: 0,
    });

    expect(response.status).to.equal(400);
    expect(response.body.error).to.be.a("string");
  });

  it("returns deterministic error for audit history when DB is not configured", async function () {
    const response = await request(app).get("/api/audits/history?page=1&pageSize=5");
    expect(response.status).to.equal(503);
    expect(response.body.error).to.equal("PostgreSQL not configured");
  });
});
