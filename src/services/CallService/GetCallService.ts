import axios from "axios";
import CallHistory from "../../models/CallHistory"
import Company from "../../models/Company";
import User from "../../models/User";
import cacheLayer from "../../libs/cache";
import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";

const getWavoipCredentials = async (companyId?: number): Promise<{ wavoipUrl: string, wavoipUsername: string, wavoipPassword: string }> => {
    let wavoipUrl: string | undefined;
    let wavoipUsername: string | undefined;
    let wavoipPassword: string | undefined;

    // Tentar buscar do banco primeiro se companyId foi fornecido
    if (companyId) {
        const companySettings = await CompaniesSettings.findOne({
            where: { companyId }
        });

        if (companySettings?.wavoipUrl && companySettings?.wavoipUsername && companySettings?.wavoipPassword) {
            wavoipUrl = companySettings.wavoipUrl.trim();
            wavoipUsername = companySettings.wavoipUsername.trim();
            wavoipPassword = companySettings.wavoipPassword.trim();
            console.log('✅ Usando credenciais Wavoip do banco de dados');
        }
    }

    // Fallback para variáveis de ambiente se não encontrou no banco
    if (!wavoipUrl || !wavoipUsername || !wavoipPassword) {
        wavoipUrl = process.env.WAVOIP_URL;
        wavoipUsername = process.env.WAVOIP_USERNAME;
        wavoipPassword = process.env.WAVOIP_PASSWORD;
        console.log('⚠️ Usando credenciais Wavoip das variáveis de ambiente (fallback)');
    }

    console.log('WAVOIP_URL:', wavoipUrl ? `✅ ${wavoipUrl}` : '❌ Não configurado');
    console.log('WAVOIP_USERNAME:', wavoipUsername ? '✅ Configurado' : '❌ Não configurado');
    console.log('WAVOIP_PASSWORD:', wavoipPassword ? '✅ Configurado' : '❌ Não configurado');

    if (!wavoipUrl || !wavoipUsername || !wavoipPassword) {
        throw new Error("Credenciais WAVOIP não configuradas. Configure nas Configurações da Empresa ou nas variáveis de ambiente.");
    }

    // Garantir que a URL termina sem barra
    wavoipUrl = wavoipUrl.replace(/\/+$/, '');

    return { wavoipUrl, wavoipUsername, wavoipPassword };
}

const loginWavoip = async (companyId?: number): Promise<{ token: string, wavoipUrl: string }> => {
    try {
        const { wavoipUrl, wavoipUsername, wavoipPassword } = await getWavoipCredentials(companyId);

        const login: any = await axios.post(`${wavoipUrl}/login`, {
            "email": wavoipUsername,
            "password": wavoipPassword
        });

        console.log('Login response status:', login?.status);
        console.log('Login response data:', JSON.stringify(login?.data).substring(0, 200));

        if (!login?.data?.result?.token) {
            throw new Error("Não foi possivel realizar login na wavoip - token não retornado");
        }

        return { token: login?.data?.result?.token, wavoipUrl };
    } catch (error: any) {
        console.log('❌ Erro no login Wavoip:', error.message);
        console.log('Stack:', error.stack);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
        throw new Error(`Erro ao fazer login Wavoip: ${error.message}`);
    }
}

const getHistorical = async (body: { "user_id": number, "company_id": number }): Promise<{ resultFinal: any[], total: number, totalReject: number, totalServed: number, totalFinish: number }> => {

    try {
        const chave = `loginWavoipToken:${body.company_id}`;
        const chaveUrl = `wavoipUrl:${body.company_id}`;
        let token = await cacheLayer.get(chave);
        let wavoipUrl = await cacheLayer.get(chaveUrl);

        if (!token || !wavoipUrl) {
            console.log('🔐 Fazendo login na Wavoip...');
            const loginResult = await loginWavoip(body.company_id);
            token = loginResult.token;
            wavoipUrl = loginResult.wavoipUrl;
            await cacheLayer.set(chave, token, "EX", 3600);
            await cacheLayer.set(chaveUrl, wavoipUrl, "EX", 3600);
        }

        const devices: any = await axios.get(`${wavoipUrl}/devices/me`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        console.log('Dispositivos encontrados:', devices?.data?.result?.length || 0);

        const user = await User.findOne({
            raw: true,
            nest: true,
            include: [{
                model: Whatsapp,
                attributes: ['id', 'wavoip', 'name', 'number'],
                as: 'whatsapp',
                required: false
            }],
            where: {
                id: body.user_id
            }
        });

        console.log('User encontrado:', user ? `✅ ID ${user.id}` : '❌ Não encontrado');
        console.log('Whatsapp do usuário:', user?.whatsapp ? `✅ Token: ${user.whatsapp.wavoip ? 'Configurado' : 'Não configurado'}` : '❌ Não associado');

        if(!user?.whatsapp?.wavoip){
            console.log('⚠️ Usuário não tem token Wavoip configurado no WhatsApp');
            // Buscar qualquer WhatsApp da empresa com token Wavoip
            const whatsappWithToken = await Whatsapp.findOne({
                where: {
                    companyId: body.company_id,
                    wavoip: { [require('sequelize').Op.ne]: null }
                },
                attributes: ['id', 'wavoip', 'name', 'number'],
                order: [['createdAt', 'DESC']]
            });

            if (!whatsappWithToken?.wavoip) {
                console.log('❌ Nenhum WhatsApp com token Wavoip encontrado na empresa');
                return { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 };
            }

            console.log('✅ Usando WhatsApp alternativo:', whatsappWithToken.name);
            user.whatsapp = whatsappWithToken;
        }

        let devicesAll = [];

        for (const device of devices?.data?.result || []) {
            try {
                console.log(`Verificando dispositivo: ${device.id}, Token: ${device.token}`);
                console.log(`Token do usuário: ${user?.whatsapp?.wavoip}`);
                
                if(user?.whatsapp?.wavoip != device?.token){
                    console.log(`⚠️ Token não corresponde - pulando dispositivo ${device.id}`);
                    continue;
                }

                console.log(`✅ Token corresponde - buscando histórico do dispositivo ${device.id}`);
                const regs: any = await axios.get(`${wavoipUrl}/calls/devices/${device.id}`, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });

                console.log(`Chamadas encontradas no dispositivo ${device.id}:`, regs?.data?.result?.length || 0);

                if (regs?.data?.result?.length <= 0) {
                    console.log(`⚠️ Nenhuma chamada encontrada para dispositivo ${device.id}`);
                    continue;
                }

                for (const reg of regs.data.result) {
                    devicesAll.push({ ...reg, token: device.token });
                }

            } catch (error: any) {
                console.log(`❌ Erro ao buscar chamadas do dispositivo ${device.id}:`, error.message);
                continue;
            }
        }

        console.log(`Total de chamadas coletadas: ${devicesAll.length}`);

        if (devicesAll.length <= 0) {
            console.log('⚠️ Nenhuma chamada encontrada nos dispositivos');
            return { resultFinal: [], total: 0, totalReject: 0, totalServed: 0, totalFinish: 0 };
        }

        console.log('devicesAll', devicesAll)


        const historicalDB: any = await CallHistory.findAll({
            raw: true,
            nest: true,
            include: [{
                model: User,
                attributes: ['id', 'name'],
            },
            {
                model: Company,
                attributes: ['id', 'name'],
            }],
            where: {
                company_id: body.company_id
            }
        })

        console.log('historicalDB112', body.company_id, historicalDB.length, historicalDB)

        const resultFinal = [];
        const cache = [];

        let totalServed = 0;
        let totalDuration = 0;
        let totalUnmet = 0;
        let totalReject = 0;
        let totalCallsAnswered = 0;
        let totalFinish = 0;
        let total = 0;

        for (const device of devicesAll) {
            let callSaveUrl = '';
            if (device?.duration) {
                callSaveUrl = `https://storage.wavoip.com/${device?.whatsapp_call_id}`;
            }
             if (device.direction == 'OUTCOMING') {
                const historicMatch = historicalDB.find(h => 
                    h.token_wavoip === device.token &&
                    Math.abs(new Date(h.createdAt).getTime() - new Date(device.created_date).getTime()) <= 1 * 60 * 1000 // diferença de até 1 minutos
                );

                if (historicMatch && !cache.includes(historicMatch.id)) {
                    cache.push(historicMatch.id);
                    resultFinal.push({ ...historicMatch, devices: device, callSaveUrl });
                } else {
                    // Se não encontrou no banco, ainda assim mostra a chamada
                    resultFinal.push({ 
                        devices: device, 
                        callSaveUrl, 
                        user: user ? { id: user.id, name: user.name } : { id: '', name: '' }, 
                        company: { id: body.company_id, name: '' }, 
                        phone_to: device?.caller || device?.call_to, 
                        name: device?.caller || device?.call_to,
                        createdAt: device?.created_date,
                        token_wavoip: device.token
                    });
                }
            }

            if (device.direction == 'INCOMING') {
                resultFinal.push({ 
                    devices: device, 
                    callSaveUrl, 
                    user: { id: '', name: '' }, 
                    company: { id: body.company_id, name: '' }, 
                    phone_to: device?.caller || device?.call_to, 
                    name: device?.caller || device?.call_to,
                    createdAt: device?.created_date 
                });
            }

            if (device?.duration) {
                totalServed += 1;
            }

            if (device?.status == "ENDED") {
                totalFinish += 1;
            }

            if (device?.status == "REJECTED") {
                totalReject += 1;
            }

            total += 1;
        }

        console.log('Resultado final:', {
            totalChamadas: resultFinal.length,
            total: total,
            totalReject: totalReject,
            totalServed: totalServed,
            totalFinish: totalFinish
        });

        return { resultFinal, total, totalReject, totalServed, totalFinish };

    } catch (error: any) {
        console.log('❌ Erro geral no getHistorical Wavoip:', error.message);
        console.log('Stack:', error.stack);
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }
}

export default getHistorical;