/**
 * Corrige campanhas gravadas com horário local marcado como UTC (ex.: 16:37Z em vez de 19:37Z).
 * Execute uma vez após o deploy da correção de timezone:
 *   npx ts-node src/scripts/fix-campaign-scheduled-timezone.ts
 */
import "dotenv/config";
import db from "../database";

const OFFSET_HOURS = 3;

async function main(): Promise<void> {
  const [result] = await db.query(
    `
    UPDATE "Campaigns"
    SET
      "scheduledAt" = "scheduledAt" + INTERVAL '${OFFSET_HOURS} hours',
      "nextScheduledAt" = CASE
        WHEN "nextScheduledAt" IS NOT NULL
        THEN "nextScheduledAt" + INTERVAL '${OFFSET_HOURS} hours'
        ELSE NULL
      END,
      "recurrenceEndDate" = CASE
        WHEN "recurrenceEndDate" IS NOT NULL
        THEN "recurrenceEndDate" + INTERVAL '${OFFSET_HOURS} hours'
        ELSE NULL
      END,
      "lastExecutedAt" = CASE
        WHEN "lastExecutedAt" IS NOT NULL
        THEN "lastExecutedAt" + INTERVAL '${OFFSET_HOURS} hours'
        ELSE NULL
      END
    WHERE "scheduledAt" IS NOT NULL
    `
  );

  console.log("Campanhas atualizadas (linhas afetadas):", result);
  await db.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
