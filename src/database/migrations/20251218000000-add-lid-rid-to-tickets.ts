import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Tickets", "lid", {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Last message ID read by contact (for official APIs)"
      }),
      queryInterface.addColumn("Tickets", "rid", {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Last message ID received by contact (for official APIs)"
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Tickets", "lid"),
      queryInterface.removeColumn("Tickets", "rid")
    ]);
  }
};