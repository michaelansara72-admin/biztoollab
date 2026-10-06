import { createMigrationConnection } from "./migrationConnection.mjs";

const connection =
  await createMigrationConnection();

try {
  console.log(
    "=============================================="
  );

  console.log(
    " BIZTOOLLAB IMPLEMENTATION PLAN V1"
  );

  console.log(
    "=============================================="
  );

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS implementation_plans (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      experiment_id BIGINT UNSIGNED NOT NULL,
      recommendation_id BIGINT UNSIGNED NOT NULL,

      title VARCHAR(255) NOT NULL,

      target_path VARCHAR(500) NOT NULL,

      proposed_changes TEXT NOT NULL,

      protected_elements TEXT NOT NULL,

      measurement_plan TEXT NOT NULL,

      rollback_plan TEXT NOT NULL,

      status ENUM(
        'draft',
        'ready-for-review',
        'authorized',
        'rejected'
      ) NOT NULL DEFAULT 'draft',

      production_authorized BOOLEAN
        NOT NULL DEFAULT FALSE,

      created_by VARCHAR(100)
        NOT NULL DEFAULT 'admin',

      created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      INDEX idx_implementation_plans_experiment_id (
        experiment_id
      ),

      INDEX idx_implementation_plans_recommendation_id (
        recommendation_id
      ),

      INDEX idx_implementation_plans_status (
        status
      ),

      INDEX idx_implementation_plans_created_at (
        created_at
      ),

      CONSTRAINT fk_implementation_plans_experiment
        FOREIGN KEY (experiment_id)
        REFERENCES experiments(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_implementation_plans_recommendation
        FOREIGN KEY (recommendation_id)
        REFERENCES ai_recommendations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    )
  `);

  const [tables] =
    await connection.query(`
      SHOW TABLES
      LIKE 'implementation_plans'
    `);

  if (
    !Array.isArray(tables) ||
    tables.length !== 1
  ) {
    throw new Error(
      "implementation_plans table could not be verified."
    );
  }

  console.log(
    "[PASS] implementation_plans table is available."
  );

  const [rows] =
    await connection.query(`
      SELECT COUNT(*) AS plan_count
      FROM implementation_plans
    `);

  console.log(
    `[PASS] Current implementation plan records: ${rows[0].plan_count}`
  );

  console.log(
    "[PASS] No implementation plan records were created by this migration."
  );

  console.log(
    "[PASS] Production authorization defaults to FALSE."
  );
} finally {
  await connection.end();
}
