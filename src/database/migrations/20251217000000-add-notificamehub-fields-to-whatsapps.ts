import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Whatsapps", "notificamehubToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Whatsapps", "notificamehubChannelId", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "notificamehubToken");
    await queryInterface.removeColumn("Whatsapps", "notificamehubChannelId");
  }
};
