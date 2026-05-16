import crypto from "node:crypto";
import { Pool } from "pg";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.DOCKER_DATABASE_URL) {
    // Host-side fallback for docker compose default network.
    return process.env.DOCKER_DATABASE_URL.replace("@postgres:", "@localhost:");
  }
  return "postgresql://scholarship:scholarship@localhost:5432/scholarship";
}

function makeUsers() {
  const stamp = Date.now().toString().slice(-6);
  const defaultPassword = "Pass@12345";
  return {
    defaultPassword,
    students: [
      {
        fullName: "Omar Hassan",
        email: `student.omar.${stamp}@scholar.local`,
        role: "student",
        walletAddress: ethers.Wallet.createRandom().address,
        isVerified: true,
      },
      {
        fullName: "Mariam Nasser",
        email: `student.mariam.${stamp}@scholar.local`,
        role: "student",
        walletAddress: ethers.Wallet.createRandom().address,
        isVerified: true,
      },
      {
        fullName: "Youssef Adel",
        email: `student.youssef.${stamp}@scholar.local`,
        role: "student",
        walletAddress: ethers.Wallet.createRandom().address,
        isVerified: false,
      },
    ],
    auditors: [
      {
        fullName: "Nour Ibrahim",
        email: `auditor.nour.${stamp}@scholar.local`,
        role: "auditor",
        walletAddress: null,
        isVerified: true,
      },
      {
        fullName: "Karim Fathy",
        email: `auditor.karim.${stamp}@scholar.local`,
        role: "auditor",
        walletAddress: null,
        isVerified: false,
      },
    ],
  };
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });
  const { students, auditors, defaultPassword } = makeUsers();
  const users = [...students, ...auditors];

  try {
    for (const user of users) {
      const passwordHash = hashPassword(defaultPassword);
      await pool.query(
        `insert into app_users (full_name, email, password_hash, role, wallet_address, is_verified, verified_at)
         values ($1, $2, $3, $4, $5, $6, case when $6 then now() else null end)
         on conflict (email) do nothing`,
        [
          user.fullName,
          user.email,
          passwordHash,
          user.role,
          user.walletAddress,
          user.isVerified,
        ]
      );
    }

    console.log("Seeded users:");
    console.log(`Password for all seeded users: ${defaultPassword}`);
    for (const user of users) {
      console.log(
        `${user.role.toUpperCase()} | ${user.fullName} | ${user.email} | verified=${user.isVerified} | wallet=${user.walletAddress || "-"}`
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("User seed failed:", error.message);
  process.exit(1);
});
