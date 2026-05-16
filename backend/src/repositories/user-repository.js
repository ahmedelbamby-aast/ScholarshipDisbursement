import crypto from "node:crypto";
import { getPostgresPool } from "../postgres.js";
import { DependencyUnavailableError } from "../errors.js";

function getPoolOrThrow() {
  const pool = getPostgresPool();
  if (!pool) {
    throw new DependencyUnavailableError("PostgreSQL not configured");
  }
  return pool;
}

async function createUser(payload) {
  const pool = getPoolOrThrow();
  const sql = `
    insert into app_users (full_name, email, password_hash, role, wallet_address, is_verified)
    values ($1, $2, $3, $4, $5, $6)
    returning id, full_name, email, role, wallet_address, is_verified
  `;
  const params = [
    payload.fullName,
    payload.email,
    payload.passwordHash,
    payload.role,
    payload.walletAddress || null,
    payload.isVerified,
  ];
  const result = await pool.query(sql, params);
  return result.rows[0];
}

async function findUserByEmail(email) {
  const pool = getPoolOrThrow();
  const result = await pool.query("select * from app_users where email = $1", [email]);
  return result.rows[0] || null;
}

async function findUserById(id) {
  const pool = getPoolOrThrow();
  const result = await pool.query("select * from app_users where id = $1", [id]);
  return result.rows[0] || null;
}

async function findStudentByWallet(walletAddress) {
  const pool = getPoolOrThrow();
  const sql = `
    select * from app_users
    where role = 'student' and lower(wallet_address) = lower($1)
    limit 1
  `;
  const result = await pool.query(sql, [walletAddress]);
  return result.rows[0] || null;
}

async function listStudents() {
  const pool = getPoolOrThrow();
  const sql = `
    select id, full_name, email, wallet_address, is_verified, verified_at
    from app_users
    where role = 'student'
    order by created_at desc
  `;
  const result = await pool.query(sql);
  return result.rows || [];
}

async function verifyStudent(id) {
  const pool = getPoolOrThrow();
  const sql = `
    update app_users
    set is_verified = true, verified_at = now()
    where id = $1 and role = 'student'
    returning id, full_name, email, role, wallet_address, is_verified
  `;
  const result = await pool.query(sql, [id]);
  return result.rows[0] || null;
}

async function createSession(userId) {
  const pool = getPoolOrThrow();
  const token = crypto.randomBytes(24).toString("hex");
  const sql = `
    insert into app_sessions (user_id, session_token, expires_at)
    values ($1, $2, now() + interval '12 hours')
    returning session_token, expires_at
  `;
  const result = await pool.query(sql, [userId, token]);
  return result.rows[0];
}

async function findSession(token) {
  const pool = getPoolOrThrow();
  const sql = `
    select s.session_token, s.expires_at, u.id as user_id, u.email, u.role, u.is_verified, u.full_name
    from app_sessions s
    join app_users u on u.id = s.user_id
    where s.session_token = $1 and s.expires_at > now()
  `;
  const result = await pool.query(sql, [token]);
  return result.rows[0] || null;
}

async function saveWalletNonce(walletAddress, nonce) {
  const pool = getPoolOrThrow();
  const sql = `
    insert into app_wallet_nonces (wallet_address, nonce, expires_at)
    values (lower($1), $2, now() + interval '10 minutes')
    on conflict (wallet_address)
    do update set nonce = excluded.nonce, expires_at = excluded.expires_at
  `;
  await pool.query(sql, [walletAddress, nonce]);
}

async function getWalletNonce(walletAddress) {
  const pool = getPoolOrThrow();
  const sql = `
    select nonce, expires_at
    from app_wallet_nonces
    where wallet_address = lower($1) and expires_at > now()
  `;
  const result = await pool.query(sql, [walletAddress]);
  return result.rows[0] || null;
}

async function deleteWalletNonce(walletAddress) {
  const pool = getPoolOrThrow();
  await pool.query("delete from app_wallet_nonces where wallet_address = lower($1)", [walletAddress]);
}

export {
  createUser,
  findUserByEmail,
  findUserById,
  findStudentByWallet,
  listStudents,
  verifyStudent,
  createSession,
  findSession,
  saveWalletNonce,
  getWalletNonce,
  deleteWalletNonce,
};
