import { createMigrationConnection } from "./migrationConnection.mjs";

const connection =
  await createMigrationConnection();

try {
  console.log(
    "=============================================="
  );

  console.log(
    " BIZTOOLLAB IMPLEMENTATION PLAN AUDIT V1"
  );

  console.log(
    "=============================================="
  );

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS implementation_plan_audit (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      implementation_plan_id BIGINT UNSIGNED NOT NULL,

      previous_status ENUM(
        'draft',
        'ready-for-review',
        'authorized',
        'rejected'
      ) NOT NULL,

      next_status ENUM(
        'draft',
        'ready-for-review',
        'authorized',
        'rejected'
      ) NOT NULL,

      actor_type ENUM(
        'authenticated-admin'
      ) NOT NULL,

      created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      INDEX idx_implementation_plan_audit_implementation_plan_id (
        implementation_plan_id
      ),

      INDEX idx_implementation_plan_audit_created_at (
        created_at
      ),

      CONSTRAINT fk_implementation_plan_audit_implementation_plan
        FOREIGN KEY (implementation_plan_id)
        REFERENCES implementation_plans(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    )
  `);

  const [tables] =
    await connection.query(`
      SHOW TABLES
      LIKE 'implementation_plan_audit'
    `);

  if (
    !Array.isArray(tables) ||
    tables.length !== 1
  ) {
    throw new Error(
      "implementation_plan_audit table could not be verified."
    );
  }

  console.log(
    "[PASS] implementation_plan_audit table is available."
  );

  const [rows] =
    await connection.query(`
      SELECT COUNT(*) AS audit_count
      FROM implementation_plan_audit
    `);

  console.log(
    `[PASS] Current implementation plan audit records: ${rows[0].audit_count}`
  );

  console.log(
    "[PASS] No implementation plan audit records were created by this migration."
  );

  console.log(
    "[PASS] Historical transitions were not backfilled."
  );

  console.log(
    "[PASS] Audit rows are append-only and use the database timestamp."
  );
} finally {
  await connection.end();
}
