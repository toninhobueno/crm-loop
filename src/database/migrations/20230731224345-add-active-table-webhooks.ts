import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Verificar se coluna 'active' já existe
    const tableInfo = await queryInterface.describeTable("Webhooks") as Record<string, any>;
    
    if (!tableInfo["active"]) {
      await queryInterface.addColumn("Webhooks", "active", {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
    }
    
    if (!tableInfo["requestMonth"]) {
      await queryInterface.addColumn("Webhooks", "requestMonth", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
    }
    
    if (!tableInfo["requestAll"]) {
      await queryInterface.addColumn("Webhooks", "requestAll", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableInfo = await queryInterface.describeTable("Webhooks") as Record<string, any>;
    
    if (tableInfo["active"]) {
      await queryInterface.removeColumn("Webhooks", "active");
    }
    if (tableInfo["requestMonth"]) {
      await queryInterface.removeColumn("Webhooks", "requestMonth");
    }
    if (tableInfo["requestAll"]) {
      await queryInterface.removeColumn("Webhooks", "requestAll");
    }
  }
};
