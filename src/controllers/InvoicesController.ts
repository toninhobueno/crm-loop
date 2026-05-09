import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Invoices from "../models/Invoices";

import FindAllInvoiceService from "../services/InvoicesService/FindAllInvoiceService";
import ListInvoicesServices from "../services/InvoicesService/ListInvoicesServices";
import ShowInvoceService from "../services/InvoicesService/ShowInvoiceService";
import UpdateInvoiceService from "../services/InvoicesService/UpdateInvoiceService";
import DeleteInvoiceService from "../services/InvoicesService/DeleteInvoiceService";
import CreateInvoiceService from "../services/InvoicesService/CreateInvoiceService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type StoreInvoiceData = {
  companyId: number;
  dueDate: string;
  detail: string;
  status: string;
  value: number;
  users: number;
  connections: number;
  queues: number;
  useWhatsapp: boolean;
  useFacebook: boolean;
  useInstagram: boolean;
  useCampaigns: boolean;
  useSchedules: boolean;
  useInternalChat: boolean;
  useExternalApi: boolean;
  linkInvoice: string;
};

type UpdateInvoiceData = {
  dueDate?: string;
  detail?: string;
  value?: number;
  users?: number;
  connections?: number;
  queues?: number;
  linkInvoice?: string;
  status?: string;
  id?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user || {};

  const { invoices, count, hasMore } = await ListInvoicesServices({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ invoices, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const invoice = await ShowInvoceService(id);

  return res.status(200).json(invoice);
};


export const store = async (req: Request, res: Response): Promise<Response> => {
  const newPlan: StoreInvoiceData = req.body;

  const plan = await CreateInvoiceService(newPlan);

  return res.status(200).json(plan);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, companyId: queryCompanyId } = req.query as IndexQuery & { companyId?: string };
  const { companyId: userCompanyId } = req.user || {};

  console.log("List invoices - req.user:", req.user);
  console.log("List invoices - Query companyId:", queryCompanyId, "userCompanyId:", userCompanyId, "searchParam:", searchParam, "pageNumber:", pageNumber);

  // Usar companyId da query se fornecido, senão usar do usuário logado
  const targetCompanyId = queryCompanyId ? parseInt(queryCompanyId) : userCompanyId;

  const { invoices, count, hasMore } = await ListInvoicesServices({
    searchParam,
    pageNumber,
    companyId: targetCompanyId
  });

  console.log("Invoices found:", invoices.length, "count:", count, "hasMore:", hasMore);

  return res.json({ invoices, count, hasMore });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const InvoiceData: UpdateInvoiceData = req.body;
  const { id } = req.params;

  const schema = Yup.object().shape({
    dueDate: Yup.string(),
    detail: Yup.string(),
    value: Yup.number(),
    users: Yup.number(),
    connections: Yup.number(),
    queues: Yup.number(),
    linkInvoice: Yup.string(),
    status: Yup.string()
  });

  try {
    await schema.validate(InvoiceData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const invoice = await UpdateInvoiceService({
    id,
    ...InvoiceData
  });

  return res.status(200).json(invoice);
};
export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  const invoice = await DeleteInvoiceService(id);

  return res.status(200).json(invoice);
}; 
