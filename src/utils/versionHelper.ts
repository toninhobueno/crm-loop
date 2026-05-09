import axios, { AxiosRequestConfig } from 'axios';

interface VersionInfo {
  version: string;
  beta: boolean;
  released: string;
  expire: string;
}

interface VersionsResponse {
  currentBeta: string | null;
  currentVersion: string;
  versions: VersionInfo[];
}

/**
 * Função que faz GET na URL e busca qualquer posição do array
 * Retorna no formato [major, minor, patch] para WAVersion
 */
export async function getVersionByIndexFromUrl(index: number = 2): Promise<[number, number, number]> {
  try {
    const url = 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/versions.json';

    const response = await axios.get<VersionsResponse>(url, { timeout: 5000 });
    const versionsData = response.data;

    if (!versionsData.versions || versionsData.versions.length <= index) {
      throw new Error(`Array versions deve ter pelo menos ${index + 1} itens`);
    }

    const versionItem = versionsData.versions[index];

    if (!versionItem || !versionItem.version) {
      throw new Error(`Item na posição ${index} não encontrado ou sem versão válida`);
    }

    // Remove o sufixo -alpha
    const versionWithoutAlpha = versionItem.version.replace('-alpha', '');

    // Converte para array de números
    const [major, minor, patch] = versionWithoutAlpha.split('.').map(Number);

    return [major, minor, patch];

  } catch (error) {
    console.error('Erro ao buscar versão da URL:', error);

    // Tentativa alternativa: buscar direto do WhatsApp Web
    try {
      console.log('Tentando buscar versão diretamente do WhatsApp Web...');
      const version = await getWaVersion();
      return version;
    } catch (whatsappError) {
      console.error('Erro ao buscar versão do WhatsApp Web:', whatsappError);
    }

    // Fallback: retorna versão fixa conhecida
    console.log('Usando versão fixa como fallback');
    return [2, 3000, 1029130979];
  }
}

export async function getWaVersion(): Promise<[number, number, number]> {
  // const start = Date.now();

  const config: AxiosRequestConfig = {
    timeout: 5000, // 5 segundos de timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0',
      'Sec-Fetch-Dest': 'script',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'same-origin',
      'Referer': 'https://web.whatsapp.com/',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  };

  try {
    const baseURL = 'https://web.whatsapp.com';
    const { data: serviceworker } = await axios.get(`${baseURL}/sw.js`, config);

    const versions = [...serviceworker.matchAll(/client_revision\\":([\d\.]+),/g)].map((r: RegExpMatchArray) => r[1]);

    if (!versions.length) {
      throw new Error('No version found in service worker response');
    }

    const version = versions[0];
    const versionWA = `2.3000.${version}`;

    // const end = Date.now();
    // console.log(`Response time: ${end - start}ms`);

    const [major, minor, patch] = versionWA.split('.').map(Number);

    return [
      major,
      minor,
      patch
    ];

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error:', error.message);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
    } else {
      console.error('Unexpected error:', error);
    }
    return [2, 3000, 1029130979];
  }
}