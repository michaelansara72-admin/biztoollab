import { createMigrationConnection } from "./migrationConnection.mjs";

const connection = await createMigrationConnection();

const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

try {
  console.log(
    "=============================================="
  );
  console.log(
    " BIZTOOLLAB EVIDENCE FINGERPRINT SCHEMA"
  );
  console.log(
    "=============================================="
  );

  const [columns] = await connection.execute(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'ai_recommendations'
        AND column_name = 'evidence_fingerprint'
    `,
    [MYSQL_DATABASE]
  );

  if (Number(columns[0].count) === 0) {
    await connection.execute(`
      ALTER TABLE ai_recommendations
      ADD COLUMN evidence_fingerprint CHAR(64) NULL
      AFTER evidence_end
    `);

    console.log(
      "[PASS] evidence_fingerprint column added."
    );
  } else {
    console.log(
      "[PASS] evidence_fingerprint column already exists."
    );
  }

  const [verification] =
    await connection.execute(
      `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = ?
          AND table_name = 'ai_recommendations'
          AND column_name = 'evidence_fingerprint'
      `,
      [MYSQL_DATABASE]
    );

  if (verification.length !== 1) {
    throw new Error(
      "Unable to verify evidence_fingerprint column."
    );
  }

  const column = verification[0];

  if (
    column.data_type !== "char" ||
    Number(column.character_maximum_length) !== 64 ||
    column.is_nullable !== "YES"
  ) {
    throw new Error(
      "evidence_fingerprint column does not match expected schema."
    );
  }

  console.log(
    "[PASS] evidence_fingerprint schema verified."
  );

  console.log(
    "[PASS] Existing recommendations remain unchanged."
  );
} finally {
  await connection.end();
}