import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Users", "defaultMenu", {
      type: DataTypes.STRING,
      defaultValue: "open",
      allowNull: false
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Users", "defaultMenu", {
      type: DataTypes.STRING,
      defaultValue: "closed",
      allowNull: false
    });
  }
};
