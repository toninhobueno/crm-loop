#!/bin/bash

# ============================================
# Script de Correção do PM2
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
CYAN='\033[0;36m'
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

print_section() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}============================================${NC}"
}

# Banner
echo ""
echo "============================================"
echo "  Correção do PM2 - API Transcrição"
echo "============================================"
echo ""

print_info "Diretório da API: $SCRIPT_DIR"

# Verifica se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 não está instalado!"
    print_info "Para instalar PM2, execute:"
    echo "  sudo npm install -g pm2"
    exit 1
fi

print_success "PM2 encontrado: $(pm2 --version)"

# Verifica se o ambiente virtual existe
if [ ! -d "venv" ]; then
    print_error "Ambiente virtual não encontrado em: $SCRIPT_DIR/venv"
    print_info "Execute o script de instalação primeiro:"
    echo "  bash install.sh"
    exit 1
fi

# Verifica se o Python do venv existe
VENV_PYTHON=""
if [ -f "venv/bin/python3" ]; then
    VENV_PYTHON="$SCRIPT_DIR/venv/bin/python3"
elif [ -f "venv/bin/python" ]; then
    VENV_PYTHON="$SCRIPT_DIR/venv/bin/python"
else
    print_error "Python do ambiente virtual não encontrado!"
    print_info "Recrie o ambiente virtual:"
    echo "  rm -rf venv"
    echo "  python3 -m venv venv"
    exit 1
fi

print_success "Python do venv encontrado: $VENV_PYTHON"

# Verifica se main.py existe
if [ ! -f "main.py" ]; then
    print_error "Arquivo main.py não encontrado em: $SCRIPT_DIR"
    exit 1
fi

print_success "main.py encontrado"

print_section "Corrigindo Processos PM2"

# Lista processos PM2 relacionados à API
PM2_PROCESSES=$(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -i "transcricao\|audio\|api" || true)

if [ -z "$PM2_PROCESSES" ]; then
    print_warning "Nenhum processo PM2 relacionado encontrado"
    print_info "Criando novo processo PM2..."
    
    # Pergunta o nome do processo
    read -p "Digite o nome para o processo PM2 (ou pressione Enter para 'api-transcricao'): " PM2_NAME
    PM2_NAME=${PM2_NAME:-api-transcricao}
    
    # Cria o processo
    print_info "Criando processo PM2: $PM2_NAME"
    pm2 start "$SCRIPT_DIR/main.py" --name "$PM2_NAME" --interpreter "$VENV_PYTHON" --cwd "$SCRIPT_DIR"
    pm2 save
    
    print_success "Processo PM2 '$PM2_NAME' criado com sucesso!"
else
    print_info "Processos PM2 encontrados:"
    echo "$PM2_PROCESSES" | while read -r proc_name; do
        echo "  - $proc_name"
    done
    
    echo ""
    read -p "Deseja corrigir todos os processos encontrados? (s/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        echo "$PM2_PROCESSES" | while read -r proc_name; do
            if [ -n "$proc_name" ]; then
                print_info "Corrigindo processo: $proc_name"
                
                # Para o processo
                print_info "  Parando processo..."
                pm2 stop "$proc_name" 2>/dev/null || true
                
                # Remove o processo
                print_info "  Removendo processo..."
                pm2 delete "$proc_name" 2>/dev/null || true
                
                # Recria o processo com configurações corretas
                print_info "  Recriando processo com Python do venv..."
                pm2 start "$SCRIPT_DIR/main.py" --name "$proc_name" --interpreter "$VENV_PYTHON" --cwd "$SCRIPT_DIR"
                
                print_success "  Processo '$proc_name' corrigido!"
            fi
        done
        
        # Salva configuração do PM2
        pm2 save
        print_success "Configuração do PM2 salva!"
    else
        print_info "Correção cancelada pelo usuário"
        exit 0
    fi
fi

print_section "Criando Script de Inicialização Melhorado"

# Cria um script de inicialização mais robusto
cat > start_api.sh << 'EOFSCRIPT'
#!/bin/bash

# Script de inicialização da API de Transcrição
# Este script garante que a API seja iniciada com o ambiente correto

# Captura o diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica se o ambiente virtual existe
if [ ! -d "venv" ]; then
    print_error "Ambiente virtual não encontrado em: $SCRIPT_DIR/venv"
    exit 1
fi

# Encontra o Python do venv
VENV_PYTHON=""
if [ -f "venv/bin/python3" ]; then
    VENV_PYTHON="venv/bin/python3"
elif [ -f "venv/bin/python" ]; then
    VENV_PYTHON="venv/bin/python"
else
    print_error "Python do ambiente virtual não encontrado!"
    exit 1
fi

# Verifica se main.py existe
if [ ! -f "main.py" ]; then
    print_error "Arquivo main.py não encontrado em: $SCRIPT_DIR"
    exit 1
fi

# Ativa o ambiente virtual
print_info "Ativando ambiente virtual..."
source venv/bin/activate || . venv/bin/activate

# Verifica se as dependências estão instaladas
print_info "Verificando dependências..."
if ! "$VENV_PYTHON" -c "import flask, speech_recognition, pydub" 2>/dev/null; then
    print_error "Dependências não estão instaladas corretamente!"
    print_info "Execute: pip install -r requirements.txt"
    exit 1
fi

# Verifica se FFmpeg está funcionando
if ! command -v ffmpeg &> /dev/null || ! ffmpeg -version &>/dev/null 2>&1; then
    print_error "FFmpeg não está funcionando corretamente!"
    exit 1
fi

print_success "Ambiente verificado. Iniciando API..."
print_info "Diretório: $SCRIPT_DIR"
print_info "Python: $VENV_PYTHON"

# Executa a API
exec "$VENV_PYTHON" main.py
EOFSCRIPT

chmod +x start_api.sh
print_success "Script start_api.sh criado!"

print_section "Criando Arquivo de Configuração do PM2"

# Cria um arquivo de configuração do PM2 (ecosystem.config.js)
cat > ecosystem.config.js << EOFJS
module.exports = {
  apps: [{
    name: 'api-transcricao',
    script: './start_api.sh',
    cwd: '$SCRIPT_DIR',
    interpreter: '/bin/bash',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '4002'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    restart_delay: 1000
  }]
};
EOFJS

print_success "Arquivo ecosystem.config.js criado!"

# Cria diretório de logs se não existir
if [ ! -d "logs" ]; then
    mkdir -p logs
    print_success "Diretório de logs criado!"
fi

print_section "Testando Configuração"

# Para todos os processos relacionados
print_info "Parando processos PM2 existentes..."
pm2 stop all 2>/dev/null || true

# Inicia usando o arquivo de configuração
print_info "Iniciando API com nova configuração..."
pm2 start ecosystem.config.js

# Aguarda um momento
sleep 3

# Verifica o status
print_info "Verificando status..."
pm2 status

# Verifica se está online
if pm2 jlist 2>/dev/null | grep -q '"status":"online"'; then
    print_success "API iniciada com sucesso e está ONLINE!"
    
    # Salva configuração
    pm2 save
    print_success "Configuração salva!"
    
    # Configura PM2 para iniciar automaticamente no boot (opcional)
    read -p "Deseja configurar PM2 para iniciar automaticamente no boot? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        pm2 startup
        print_info "Execute o comando mostrado acima como root para configurar o startup automático"
    fi
else
    print_error "Falha ao iniciar a API!"
    print_info "Verifique os logs:"
    echo "  pm2 logs api-transcricao"
fi

print_section "Comandos Úteis"

echo ""
print_info "Comandos úteis do PM2:"
echo "  - Ver status:           pm2 status"
echo "  - Ver logs:             pm2 logs api-transcricao"
echo "  - Ver logs em tempo real: pm2 logs api-transcricao --lines 50"
echo "  - Reiniciar:            pm2 restart api-transcricao"
echo "  - Parar:                pm2 stop api-transcricao"
echo "  - Remover:              pm2 delete api-transcricao"
echo "  - Monitorar:            pm2 monit"
echo ""
print_info "Usando arquivo de configuração:"
echo "  - Iniciar:              pm2 start ecosystem.config.js"
echo "  - Reiniciar:            pm2 restart ecosystem.config.js"
echo "  - Parar:                pm2 stop ecosystem.config.js"
echo ""
print_info "Arquivos importantes criados:"
echo "  - start_api.sh:         Script de inicialização robusto"
echo "  - ecosystem.config.js:  Configuração do PM2"
echo "  - logs/:                Diretório de logs"
echo ""

print_success "Correção do PM2 concluída!"
echo ""