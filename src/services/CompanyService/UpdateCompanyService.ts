import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Setting from "../../models/Setting";
import User from "../../models/User";

interface CompanyData {
  name: string;
  id?: number | string;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: string;
  recurrence?: string;
  document?: string;
  paymentMethod?: string;
  password?: string;
  generateInvoice?: boolean;
}

const UpdateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {

  const company = await Company.findByPk(companyData.id);
  const {
    name,
    phone,
    email,
    status,
    planId,
    campaignsEnabled,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    password,
    generateInvoice
  } = companyData;

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  // Verificar se já existe um usuário com esse email em OUTRA empresa
  const existUser = await User.findOne({
    where: {
      email: email
    }
  });

  if (existUser && existUser.companyId !== company.id) {
    throw new AppError("Usuário já existe com esse e-mail!", 404)
  }

  // Buscar o usuário principal da empresa (admin ou com email da empresa)
  const user = await User.findOne({
    where: {
      companyId: company.id,
      [Op.or]: [
        { email: company.email },
        { profile: "admin" }
      ]
    }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404)
  }
  
  // Só atualizar a senha se ela foi fornecida
  const updateData: any = { email };
  if (password && password.trim() !== "") {
    updateData.password = password;
  }
  
  await user.update(updateData);

  await company.update({
    name,
    phone,
    email,
    status,
    planId,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    generateInvoice
  });

  if (companyData.campaignsEnabled !== undefined) {
    const [setting, created] = await Setting.findOrCreate({
      where: {
        companyId: company.id,
        key: "campaignsEnabled"
      },
      defaults: {
        companyId: company.id,
        key: "campaignsEnabled",
        value: `${campaignsEnabled}`
      }
    });
    if (!created) {
      await setting.update({ value: `${campaignsEnabled}` });
    }
  }

  return company;
};

export default UpdateCompanyService;
