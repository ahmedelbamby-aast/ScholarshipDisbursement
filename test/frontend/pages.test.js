/**
 * Frontend static page presence tests.
 *
 * Scope:
 * - Guards critical UI text/navigation anchors against accidental regressions.
 * - Validates key registration page elements required by role onboarding.
 */
import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Frontend pages", function () {
  it("landing page links to admin and student dashboards", function () {
    // Static smoke checks catch accidental regressions in navigation contract.
    const html = fs.readFileSync(path.join(__dirname, "../../frontend/index.html"), "utf8");
    expect(html).to.include("Admin Dashboard");
    expect(html).to.include("Student Dashboard");
  });

  it("admin page contains approval and release sections", function () {
    const html = fs.readFileSync(path.join(__dirname, "../../frontend/admin.html"), "utf8");
    expect(html).to.include("Approve Scholarship");
    expect(html).to.include("Release Installment");
  });

  it("student register page includes wallet generator button", function () {
    const html = fs.readFileSync(path.join(__dirname, "../../frontend/student-register.html"), "utf8");
    expect(html).to.include("Student Wallet Generator");
    expect(html).to.include("id=\"walletAddress\"");
  });

  it("auditor register page exists", function () {
    const html = fs.readFileSync(path.join(__dirname, "../../frontend/auditor-register.html"), "utf8");
    expect(html).to.include("Auditor Register");
  });
});
