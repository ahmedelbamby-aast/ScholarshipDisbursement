import request from "supertest";
import { expect } from "chai";
import app from "../../backend/src/app.js";

describe("Full-stack API surface", function () {
  it("returns runtime network metadata", async function () {
    const response = await request(app).get("/api/runtime/network");
    expect(response.status).to.equal(200);
    expect(response.body.ok).to.equal(true);
    expect(response.body.chainId).to.be.a("number");
  });

  it("rejects malformed metamask nonce request", async function () {
    const response = await request(app).post("/api/auth/metamask/nonce").send({ walletAddress: "x" });
    expect(response.status).to.equal(400);
  });
});
