import { Request, Response } from "express";
import createCallHistorical from "../services/CallService/CreateCallService";
import getHistorical from "../services/CallService/GetCallService";
import GetWhatsappUserId from "../services/CallService/GetWhatsappUserId";
import GetWhatsappWithWavoipService from "../services/CallService/GetWhatsappWithWavoipService";

interface CallHistorical {
    user_id: number;
    token_wavoip: string;
    whatsapp_id: number;
    contact_id: number;
    company_id: number;
    phone_to: string;
    name: string;
    url: string;
}

export const createCallHistoric = async (req: Request, res: Response): Promise<Response> => {
    const body = req.body as CallHistorical;

    const callHistorical = await createCallHistorical(body);
    return res.status(200).json({ callHistorical });
};

export const getHistoric = async (req: Request, res: Response) => {
    try {
        console.log('📞 Buscando histórico - User ID:', req.user.id, 'Company ID:', req.user.companyId);
        
        const historical = await getHistorical({
            "user_id": parseInt(req.user.id),
            "company_id": req.user.companyId
        });

        // Verificar se retornou array (vazio) ou objeto
        const historicalData = Array.isArray(historical) 
            ? { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 }
            : historical;

        console.log('✅ Histórico retornado:', {
            total: historicalData.total || 0,
            resultFinal: historicalData.resultFinal?.length || 0
        });

        return res.status(200).json({ 
            historical: historicalData,
            hasMore: false // Pode ser implementado paginação depois
        });
    } catch (error: any) {
        console.error('❌ Erro no controller getHistoric:', error.message);
        return res.status(403).json({
            error: error.message || String(error),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

export const getWhatsappUserId = async (req: Request, res: Response): Promise<Response> => {
    const whatsapps = await GetWhatsappUserId(parseInt(req.user.id));
    return res.status(200).json(whatsapps);
};

export const getWhatsappWithWavoip = async (req: Request, res: Response): Promise<Response> => {
    try {
        const whatsapp = await GetWhatsappWithWavoipService(req.user.companyId);
        return res.status(200).json({ whatsapp });
    } catch (error) {
        return res.status(403).json({
            error: error.message || String(error),
            stack: error.stack 
        });
    }
};
