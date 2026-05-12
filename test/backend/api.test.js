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
});
