import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn("CompaniesSettings", "backupEnabled", {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  });

  await queryInterface.addColumn("CompaniesSettings", "backupFrequency", {
    type: DataTypes.STRING,
    defaultValue: "daily",
    allowNull: false,
    comment: "Frequency: daily, weekly, monthly"
  });

  await queryInterface.addColumn("CompaniesSettings", "backupTime", {
    type: DataTypes.STRING,
    defaultValue: "02:00",
    allowNull: false,
    comment: "Time to run backup (HH:mm format)"
  });

  await queryInterface.addColumn("CompaniesSettings", "backupDatabase", {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  });

  await queryInterface.addColumn("CompaniesSettings", "backupFiles", {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  });

  await queryInterface.addColumn("CompaniesSettings", "backupRetentionDays", {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    allowNull: false,
    comment: "Days to keep backups before deletion"
  });

  await queryInterface.addColumn("CompaniesSettings", "backupCloudProvider", {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Cloud provider: s3, google-drive, dropbox, local"
  });

  await queryInterface.addColumn("CompaniesSettings", "backupCloudConfig", {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Cloud provider configuration (credentials, bucket, etc)"
  });

  await queryInterface.addColumn("CompaniesSettings", "backupLastRun", {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Last successful backup execution"
  });

  await queryInterface.addColumn("CompaniesSettings", "backupLastStatus", {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Last backup status: success, failed, running"
  });

  await queryInterface.addColumn("CompaniesSettings", "backupLastError", {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Last backup error message"
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn("CompaniesSettings", "backupEnabled");
  await queryInterface.removeColumn("CompaniesSettings", "backupFrequency");
  await queryInterface.removeColumn("CompaniesSettings", "backupTime");
  await queryInterface.removeColumn("CompaniesSettings", "backupDatabase");
  await queryInterface.removeColumn("CompaniesSettings", "backupFiles");
  await queryInterface.removeColumn("CompaniesSettings", "backupRetentionDays");
  await queryInterface.removeColumn("CompaniesSettings", "backupCloudProvider");
  await queryInterface.removeColumn("CompaniesSettings", "backupCloudConfig");
  await queryInterface.removeColumn("CompaniesSettings", "backupLastRun");
  await queryInterface.removeColumn("CompaniesSettings", "backupLastStatus");
  await queryInterface.removeColumn("CompaniesSettings", "backupLastError");
}

