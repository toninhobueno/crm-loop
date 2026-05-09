#!/bin/bash

# ============================================
# Script de Instalação Automática
# API de Transcrição de Áudio
# ============================================

# Garante que o script está sendo executado com bash
if [ -z "$BASH_VERSION" ]; then
    exec /bin/bash "$0" "$@"
fi

set -e  # Para o script se houver erro

# Captura o diretório absoluto onde o script está sendo executado
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo ""
echo "============================================"
echo "  Instalador Automático - API Transcrição"
echo "============================================"
echo ""

# Verifica se está rodando como root (opcional, mas recomendado para instalar pacotes)
EUID_VAL=${EUID:-0}
if [ "$EUID_VAL" -ne 0 ] 2>/dev/null; then 
    print_warning "Este script precisa de privilégios sudo para instalar dependências do sistema"
    print_info "Você será solicitado a inserir sua senha quando necessário"
fi

# Detecta o sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    print_info "Sistema operacional detectado: $OS"
else
    print_error "Não foi possível detectar o sistema operacional"
    exit 1
fi

# Função para instalar dependências no Ubuntu/Debian
install_dependencies_debian() {
    print_info "Atualizando lista de pacotes..."
    sudo apt-get update -qq
    
    # Verifica se ffmpeg já está instalado
    FFMPEG_PACKAGES=""
    if ! command -v ffmpeg &> /dev/null; then
        print_info "FFmpeg não encontrado. Será instalado..."
        FFMPEG_PACKAGES="ffmpeg libavdevice-dev libavformat-dev libavcodec-dev libavutil-dev libswscale-dev libswresample-dev"
    else
        print_info "FFmpeg já está instalado. Verificando bibliotecas de desenvolvimento..."
        # Verifica se as bibliotecas de desenvolvimento estão instaladas (opcional)
        if ! dpkg -l | grep -q libavdevice-dev; then
            print_info "Instalando bibliotecas de desenvolvimento do FFmpeg (opcional)..."
            FFMPEG_PACKAGES="libavdevice-dev libavformat-dev libavcodec-dev libavutil-dev libswscale-dev libswresample-dev"
        else
            print_info "Bibliotecas de desenvolvimento do FFmpeg já estão instaladas."
        fi
    fi
    
    print_info "Instalando dependências do sistema..."
    sudo apt-get install -y \
        python3 \
        python3-pip \
        python3-venv \
        $FFMPEG_PACKAGES \
        flac \
        libasound2-dev \
        portaudio19-dev \
        python3-dev \
        build-essential \
        curl
    
    print_success "Dependências do sistema instaladas com sucesso!"
}

# Função para instalar dependências no CentOS/RHEL
install_dependencies_rhel() {
    # Verifica se ffmpeg já está instalado
    FFMPEG_PACKAGES=""
    if ! command -v ffmpeg &> /dev/null; then
        print_info "FFmpeg não encontrado. Será instalado..."
        FFMPEG_PACKAGES="ffmpeg ffmpeg-devel"
    else
        print_info "FFmpeg já está instalado."
    fi
    
    print_info "Instalando dependências do sistema..."
    sudo yum install -y \
        python3 \
        python3-pip \
        $FFMPEG_PACKAGES \
        flac \
        gcc \
        python3-devel \
        portaudio-devel \
        curl
    
    print_success "Dependências do sistema instaladas com sucesso!"
}

# Instala dependências baseado no OS
case $OS in
    ubuntu|debian)
        install_dependencies_debian
        ;;
    centos|rhel|fedora)
        install_dependencies_rhel
        ;;
    *)
        print_warning "Sistema operacional não testado: $OS"
        print_info "Tentando instalar com apt-get..."
        install_dependencies_debian
        ;;
esac

# Verifica se Python 3 está instalado (múltiplas formas de verificação)
PYTHON3_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON3_CMD="python3"
elif [ -f "/usr/bin/python3" ]; then
    PYTHON3_CMD="/usr/bin/python3"
elif [ -f "/usr/local/bin/python3" ]; then
    PYTHON3_CMD="/usr/local/bin/python3"
elif which python3 &> /dev/null; then
    PYTHON3_CMD=$(which python3)
else
    print_error "Python 3 não está instalado ou não foi encontrado no PATH!"
    print_info "Tentando instalar Python 3..."
    case $OS in
        ubuntu|debian)
            sudo apt-get install -y python3
            ;;
        centos|rhel|fedora)
            sudo yum install -y python3
            ;;
    esac
    # Tenta novamente após instalação
    if command -v python3 &> /dev/null; then
        PYTHON3_CMD="python3"
    elif [ -f "/usr/bin/python3" ]; then
        PYTHON3_CMD="/usr/bin/python3"
    else
        print_error "Não foi possível encontrar ou instalar Python 3!"
        exit 1
    fi
fi

PYTHON_VERSION=$($PYTHON3_CMD --version 2>&1)
print_success "Python encontrado: $PYTHON_VERSION ($PYTHON3_CMD)"

# Verifica se pip está instalado
PIP3_CMD=""
if command -v pip3 &> /dev/null; then
    PIP3_CMD="pip3"
elif [ -f "/usr/bin/pip3" ]; then
    PIP3_CMD="/usr/bin/pip3"
elif $PYTHON3_CMD -m pip --version &> /dev/null; then
    PIP3_CMD="$PYTHON3_CMD -m pip"
else
    print_warning "pip3 não encontrado. Tentando instalar..."
    case $OS in
        ubuntu|debian)
            sudo apt-get install -y python3-pip
            ;;
        centos|rhel|fedora)
            sudo yum install -y python3-pip
            ;;
    esac
    if command -v pip3 &> /dev/null; then
        PIP3_CMD="pip3"
    elif [ -f "/usr/bin/pip3" ]; then
        PIP3_CMD="/usr/bin/pip3"
    else
        PIP3_CMD="$PYTHON3_CMD -m pip"
    fi
fi
print_success "pip encontrado: $PIP3_CMD"

# Cria ambiente virtual se não existir ou se estiver incompleto
if [ ! -d "venv" ] || [ ! -f "venv/bin/activate" ]; then
    if [ -d "venv" ]; then
        print_warning "Ambiente virtual incompleto detectado. Recriando..."
        rm -rf venv
    fi
    print_info "Criando ambiente virtual Python..."
    $PYTHON3_CMD -m venv venv
    print_success "Ambiente virtual criado!"
else
    print_info "Ambiente virtual já existe. Verificando integridade..."
    if [ ! -f "venv/bin/python" ] && [ ! -f "venv/bin/python3" ]; then
        print_warning "Ambiente virtual corrompido. Recriando..."
        rm -rf venv
        $PYTHON3_CMD -m venv venv
        print_success "Ambiente virtual recriado!"
    else
        print_success "Ambiente virtual OK!"
    fi
fi

# Ativa o ambiente virtual
print_info "Ativando ambiente virtual..."
. venv/bin/activate || source venv/bin/activate

# Atualiza pip
print_info "Atualizando pip..."
if [[ "$PIP3_CMD" == *"-m pip"* ]]; then
    $PIP3_CMD install --upgrade pip --quiet
else
    $PIP3_CMD install --upgrade pip --quiet
fi

# Instala dependências do Python
print_info "Instalando dependências do Python..."
if [ -f "requirements.txt" ]; then
    $PIP3_CMD install -r requirements.txt
    print_success "Dependências Python instaladas a partir do requirements.txt!"
else
    print_warning "Arquivo requirements.txt não encontrado. Instalando dependências manualmente..."
    $PIP3_CMD install Flask==2.1.0
    $PIP3_CMD install SpeechRecognition==3.10.0
    $PIP3_CMD install Werkzeug==2.2.2
    $PIP3_CMD install pydub==0.25.1
    $PIP3_CMD install gunicorn==20.1.0
    $PIP3_CMD install ffmpeg-python==0.2.0
    $PIP3_CMD install python-dotenv==1.0.0
    print_success "Dependências Python instaladas!"
fi

# Verifica se ffmpeg está instalado e funcionando
if ! command -v ffmpeg &> /dev/null; then
    print_error "FFmpeg não está instalado!"
    print_info "Tentando instalar FFmpeg..."
    case $OS in
        ubuntu|debian)
            sudo apt-get install -y ffmpeg
            ;;
        centos|rhel|fedora)
            sudo yum install -y ffmpeg
            ;;
    esac
    
    # Verifica novamente após tentar instalar
    if ! command -v ffmpeg &> /dev/null; then
        print_error "Não foi possível instalar o FFmpeg. Por favor, instale manualmente."
        exit 1
    fi
else
    print_info "FFmpeg já está instalado no sistema."
fi

# Testa se o ffmpeg realmente funciona (não só se o comando existe)
if ! ffmpeg -version &> /dev/null 2>&1; then
    print_warning "FFmpeg encontrado mas com problemas de bibliotecas compartilhadas"
    print_info "Tentando corrigir instalando bibliotecas adicionais..."
    case $OS in
        ubuntu|debian)
            sudo apt-get install -y libavdevice-dev libavformat-dev libavcodec-dev libavutil-dev libswscale-dev libswresample-dev 2>/dev/null || true
            # Tenta atualizar bibliotecas
            sudo ldconfig 2>/dev/null || true
            ;;
        centos|rhel|fedora)
            sudo yum install -y ffmpeg-devel 2>/dev/null || true
            sudo ldconfig 2>/dev/null || true
            ;;
    esac
    
    # Testa novamente
    if ! ffmpeg -version &> /dev/null 2>&1; then
        print_warning "FFmpeg encontrado mas pode ter problemas de bibliotecas"
        print_warning "A API pode não funcionar corretamente. Verifique manualmente: ffmpeg -version"
    else
        print_success "FFmpeg corrigido e funcionando!"
    fi
fi

# Mostra a versão do FFmpeg
FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
if [ -n "$FFMPEG_VERSION" ]; then
    print_success "FFmpeg verificado: $FFMPEG_VERSION"
else
    print_warning "FFmpeg encontrado mas não foi possível obter a versão (pode estar funcionando mesmo assim)"
fi

# Cria arquivo .env se não existir
if [ ! -f ".env" ]; then
    print_info "Criando arquivo .env de exemplo..."
    cat > .env << EOF
# Configurações da API de Transcrição
HOST=0.0.0.0
PORT=4002
DEBUG=False
# API_TOKEN=seu_token_aqui
EOF
    print_success "Arquivo .env criado!"
    print_warning "Configure o arquivo .env com suas variáveis de ambiente se necessário"
else
    print_info "Arquivo .env já existe."
fi

# Verifica se o PM2 está instalado (opcional)
INSTALL_PM2=false
if command -v pm2 &> /dev/null; then
    print_info "PM2 já está instalado"
else
    read -p "Deseja instalar o PM2 para gerenciar a API? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        INSTALL_PM2=true
        
        # Verifica se Node.js/npm está instalado
        if ! command -v npm &> /dev/null; then
            print_info "Node.js/npm não encontrado. Instalando..."
            case $OS in
                ubuntu|debian)
                    # Instala Node.js via NodeSource (versão LTS)
                    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    ;;
                centos|rhel|fedora)
                    # Instala Node.js via NodeSource
                    curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
                    sudo yum install -y nodejs
                    ;;
                *)
                    print_warning "Sistema operacional não suportado para instalação automática do Node.js"
                    print_info "Por favor, instale Node.js manualmente e execute o script novamente"
                    INSTALL_PM2=false
                    ;;
            esac
            
            # Verifica se npm foi instalado
            if ! command -v npm &> /dev/null; then
                print_error "Falha ao instalar Node.js/npm. PM2 não será instalado."
                INSTALL_PM2=false
            else
                NODE_VERSION=$(node --version 2>&1)
                NPM_VERSION=$(npm --version 2>&1)
                print_success "Node.js instalado: $NODE_VERSION"
                print_success "npm instalado: $NPM_VERSION"
            fi
        fi
        
        if [ "$INSTALL_PM2" = true ]; then
            print_info "Instalando PM2..."
            sudo npm install -g pm2
            if command -v pm2 &> /dev/null; then
                print_success "PM2 instalado!"
            else
                print_error "Falha ao instalar PM2"
                INSTALL_PM2=false
            fi
        fi
    fi
fi

# Pergunta se deseja iniciar a API
echo ""
read -p "Deseja iniciar a API agora? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    print_info "Iniciando a API..."
    
    if [ "$INSTALL_PM2" = true ] || command -v pm2 &> /dev/null; then
        read -p "Digite o nome para o processo PM2 (ou pressione Enter para 'api-transcricao'): " PM2_NAME
        PM2_NAME=${PM2_NAME:-api-transcricao}
        
        # Cria script de start para PM2 com caminho absoluto
        cat > start_pm2.sh << EOFSCRIPT
#!/bin/bash
# Caminho absoluto do diretório da API
cd "$SCRIPT_DIR" || exit 1

# Verifica se o venv existe
if [ ! -d "venv" ]; then
    echo "Erro: Ambiente virtual não encontrado em $SCRIPT_DIR/venv"
    exit 1
fi

# Ativa o ambiente virtual
. venv/bin/activate || source venv/bin/activate

# Verifica se main.py existe
if [ ! -f "main.py" ]; then
    echo "Erro: Arquivo main.py não encontrado em $SCRIPT_DIR"
    exit 1
fi

# Executa a API usando o Python do venv
python3 main.py
EOFSCRIPT
        chmod +x start_pm2.sh
        
        print_info "Iniciando com PM2..."
        print_info "Diretório da API: $SCRIPT_DIR"
        
        # Para o processo PM2 existente se houver
        if pm2 describe "$PM2_NAME" &>/dev/null; then
            print_warning "Processo PM2 '$PM2_NAME' já existe. Parando e removendo..."
            pm2 delete "$PM2_NAME" 2>/dev/null || true
        fi
        
        # Inicia o PM2 a partir do diretório correto
        cd "$SCRIPT_DIR"
        pm2 start start_pm2.sh --name "$PM2_NAME" --interpreter bash
        pm2 save
        
        # Aguarda um momento para verificar se iniciou corretamente
        sleep 2
        
        # Verifica o status
        if pm2 describe "$PM2_NAME" &>/dev/null; then
            PM2_STATUS=$(pm2 jlist | grep -o "\"name\":\"$PM2_NAME\".*\"pm2_env\":{[^}]*\"status\":\"[^\"]*\"" | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)
            if [ "$PM2_STATUS" = "online" ]; then
                print_success "API iniciada com PM2 e está ONLINE!"
            else
                print_warning "API iniciada com PM2 mas status: $PM2_STATUS"
                print_info "Verifique os logs para mais detalhes"
            fi
        else
            print_error "Falha ao iniciar a API com PM2"
        fi
        
        echo ""
        print_info "Comandos úteis do PM2:"
        echo "  - Ver status: pm2 status"
        echo "  - Ver logs: pm2 logs $PM2_NAME"
        echo "  - Parar: pm2 stop $PM2_NAME"
        echo "  - Reiniciar: pm2 restart $PM2_NAME"
        echo "  - Remover: pm2 delete $PM2_NAME"
    else
        print_info "Iniciando API diretamente..."
        $PYTHON3_CMD main.py &
        API_PID=$!
        print_success "API iniciada em background (PID: $API_PID)"
        print_warning "Para parar a API, use: kill $API_PID"
    fi
else
    print_info "API não foi iniciada automaticamente."
    print_info "Para iniciar manualmente, execute:"
    print_info "  source venv/bin/activate"
    print_info "  $PYTHON3_CMD main.py"
fi

# Resumo final
echo ""
echo "============================================"
print_success "Instalação concluída com sucesso! ✅"
echo "============================================"
echo ""
print_info "Próximos passos:"
echo "  1. Configure o arquivo .env se necessário"
echo "  2. Para ativar o ambiente virtual: source venv/bin/activate"
echo "  3. Para iniciar a API: $PYTHON3_CMD main.py"
echo "  4. A API estará disponível em: http://localhost:4002"
echo ""
print_info "Documentação da API:"
echo "  - Endpoint: POST /transcrever"
echo "  - Parâmetros: 'audio' (arquivo) ou 'url' (string)"
echo "  - Formatos suportados: WAV, OGG, MP3, MP4, M4A, AAC, FLAC"
echo ""
print_info "Verificação da instalação:"
echo "  Execute: bash verificar_instalacao.sh"
echo "  Para verificar se tudo está instalado corretamente"
echo ""

# Pergunta se deseja executar a verificação agora
read -p "Deseja executar a verificação da instalação agora? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    if [ -f "verificar_instalacao.sh" ]; then
        print_info "Executando verificação..."
        bash verificar_instalacao.sh
    else
        print_warning "Script de verificação não encontrado. Criando..."
        # O script será criado na próxima vez
    fi
fi
echo ""

