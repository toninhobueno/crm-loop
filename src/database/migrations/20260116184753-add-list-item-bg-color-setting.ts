import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Adicionar configuração de cor de fundo do item da lista
    await queryInterface.bulkInsert(
      "Settings",
      [
        {
          key: "listItemBgColor",
          value: "#ffffff",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  down: async (queryInterface: QueryInterface) => {
    // Remover configuração
    await queryInterface.bulkDelete(
      "Settings",
      {
        key: "listItemBgColor",
      },
      {}
    );
  },
};
