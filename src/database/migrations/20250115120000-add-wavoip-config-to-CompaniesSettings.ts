import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  async up(queryInterface: QueryInterface) {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();
    
    // Verificar se as colunas já existem usando query SQL
    let columnsExist = { wavoipUrl: false, wavoipUsername: false, wavoipPassword: false };
    
    try {
      if (dialect === "postgres") {
        const [results]: any = await sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'CompaniesSettings' 
          AND column_name IN ('wavoipUrl', 'wavoipUsername', 'wavoipPassword');
        `);
        
        results.forEach((row: any) => {
          if (row.column_name === 'wavoipUrl') columnsExist.wavoipUrl = true;
          if (row.column_name === 'wavoipUsername') columnsExist.wavoipUsername = true;
          if (row.column_name === 'wavoipPassword') columnsExist.wavoipPassword = true;
        });
      } else {
        // Para outros bancos, usar describeTable
        const tableDescription: any = await queryInterface.describeTable("CompaniesSettings");
        columnsExist.wavoipUrl = !!tableDescription.wavoipUrl;
        columnsExist.wavoipUsername = !!tableDescription.wavoipUsername;
        columnsExist.wavoipPassword = !!tableDescription.wavoipPassword;
      }
    } catch (error) {
      // Se der erro, assume que não existem e tenta adicionar
      console.log('Erro ao verificar colunas, tentando adicionar...');
    }
    
    if (!columnsExist.wavoipUrl) {
      await queryInterface.addColumn("CompaniesSettings", "wavoipUrl", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!columnsExist.wavoipUsername) {
      await queryInterface.addColumn("CompaniesSettings", "wavoipUsername", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!columnsExist.wavoipPassword) {
      await queryInterface.addColumn("CompaniesSettings", "wavoipPassword", {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface: QueryInterface) {
    const tableDescription: any = await queryInterface.describeTable("CompaniesSettings");
    
    if (tableDescription.wavoipUrl) {
      await queryInterface.removeColumn("CompaniesSettings", "wavoipUrl");
    }

    if (tableDescription.wavoipUsername) {
      await queryInterface.removeColumn("CompaniesSettings", "wavoipUsername");
    }

    if (tableDescription.wavoipPassword) {
      await queryInterface.removeColumn("CompaniesSettings", "wavoipPassword");
    }
  },
};

