import AppError from "../../errors/AppError";
import Invoice from "../../models/Invoices";

interface InvoiceData {
  dueDate?: string;
  detail?: string;
  value?: number;
  users?: number;
  connections?: number;
  queues?: number;
  linkInvoice?: string;
  status?: string;
  id?: number | string;
}

const UpdateInvoiceService = async (InvoiceData: InvoiceData): Promise<Invoice> => {
  const { id, ...updateData } = InvoiceData;

  // Converter ID para número se for string
  const invoiceId = typeof id === 'string' ? parseInt(id) : id;

  console.log("UpdateInvoiceService - Procurando fatura com ID:", invoiceId, "Tipo:", typeof invoiceId);

  const invoice = await Invoice.findByPk(invoiceId);

  if (!invoice) {
    console.log("UpdateInvoiceService - Fatura não encontrada com ID:", invoiceId);
    throw new AppError("ERR_NO_INVOICE_FOUND", 404);
  }

  console.log("UpdateInvoiceService - Fatura encontrada:", invoice.id, "Atualizando com:", updateData);

  // Filtrar apenas os campos que foram enviados (não undefined)
  const fieldsToUpdate = Object.keys(updateData).reduce((acc, key) => {
    if (updateData[key] !== undefined) {
      acc[key] = updateData[key];
    }
    return acc;
  }, {});

  await invoice.update(fieldsToUpdate);

  console.log("UpdateInvoiceService - Fatura atualizada com sucesso");

  return invoice;
};

export default UpdateInvoiceService;
