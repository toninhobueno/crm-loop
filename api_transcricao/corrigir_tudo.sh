#!/bin/bash

# ============================================
# Script de Correção Completa
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
MAGENTA='\033[0;35m'
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

print_step() {
    echo ""
    echo -e "${MAGENTA}>>> $1${NC}"
}

# Banner
echo ""
echo "============================================"
echo "  Correção Automática Completa"
echo "  API de Transcrição de Áudio"
echo "============================================"
echo ""

print_info "Diretório: $SCRIPT_DIR"
print_info "Este script irá corrigir automaticamente todos os problemas detectados"
echo ""

# Verifica se os scripts de correção existem
SCRIPTS_NEEDED=(
    "corrigir_ffmpeg.sh"
    "corrigir_pm2.sh"
    "verificar_instalacao.sh"
)

MISSING_SCRIPTS=false
for script in "${SCRIPTS_NEEDED[@]}"; do
    if [ ! -f "$script" ]; then
        print_error "Script necessário não encontrado: $script"
        MISSING_SCRIPTS=true
    fi
done

if [ "$MISSING_SCRIPTS" = true ]; then
    print_error "Scripts de correção não encontrados!"
    print_info "Execute o instalador principal primeiro:"
    echo "  bash install.sh"
    exit 1
fi

# Função para executar verificação e capturar problemas
run_verification() {
    print_step "Executando verificação da instalação..."
    
    # Executa verificação e captura saída
    if bash verificar_instalacao.sh > /tmp/verificacao_output.txt 2>&1; then
        VERIFICATION_EXIT_CODE=0
    else
        VERIFICATION_EXIT_CODE=$?
    fi
    
    # Mostra resultado resumido
    if grep -q "Taxa de sucesso: 100%" /tmp/verificacao_output.txt; then
        print_success "Verificação: 100% - Tudo funcionando!"
        return 0
    else
        PERCENTAGE=$(grep "Taxa de sucesso:" /tmp/verificacao_output.txt | grep -o "[0-9]*%" || echo "0%")
        print_warning "Verificação: $PERCENTAGE - Problemas detectados"
        return 1
    fi
}

# Função para detectar problemas específicos
detect_problems() {
    FFMPEG_PROBLEM=false
    PM2_PROBLEM=false
    VENV_PROBLEM=false
    DEPENDENCIES_PROBLEM=false
    
    # Verifica FFmpeg
    if ! command -v ffmpeg &> /dev/null || ! ffmpeg -version &>/dev/null 2>&1; then
        FFMPEG_PROBLEM=true
        print_warning "Problema detectado: FFmpeg"
    fi
    
    # Verifica PM2
    if command -v pm2 &> /dev/null; then
        PM2_PROCESSES=$(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -i "transcricao\|audio\|api" || true)
        if [ -n "$PM2_PROCESSES" ]; then
            # Verifica se está usando Python do venv
            for proc_name in $PM2_PROCESSES; do
                PM2_INFO=$(pm2 describe "$proc_name" 2>/dev/null || true)
                if [ -n "$PM2_INFO" ]; then
                    INTERPRETER=$(echo "$PM2_INFO" | grep -i "interpreter" | head -n 1 | awk -F': ' '{print $2}' | xargs || true)
                    if [ -z "$INTERPRETER" ] || ! echo "$INTERPRETER" | grep -q "venv"; then
                        PM2_PROBLEM=true
                        print_warning "Problema detectado: PM2 não está usando Python do venv"
                        break
                    fi
                fi
            done
        fi
    fi
    
    # Verifica ambiente virtual
    if [ ! -d "venv" ] || [ ! -f "venv/bin/python3" ] && [ ! -f "venv/bin/python" ]; then
        VENV_PROBLEM=true
        print_warning "Problema detectado: Ambiente virtual"
    fi
    
    # Verifica dependências Python
    if [ -d "venv" ]; then
        VENV_PYTHON=""
        if [ -f "venv/bin/python3" ]; then
            VENV_PYTHON="venv/bin/python3"
        elif [ -f "venv/bin/python" ]; then
            VENV_PYTHON="venv/bin/python"
        fi
        
        if [ -n "$VENV_PYTHON" ]; then
            if ! "$VENV_PYTHON" -c "import flask, speech_recognition, pydub" 2>/dev/null; then
                DEPENDENCIES_PROBLEM=true
                print_warning "Problema detectado: Dependências Python"
            fi
        fi
    fi
}

# Executa verificação inicial
print_section "Verificação Inicial"
run_verification
INITIAL_VERIFICATION=$?

if [ $INITIAL_VERIFICATION -eq 0 ]; then
    print_success "Tudo está funcionando corretamente!"
    print_info "Nenhuma correção necessária."
    exit 0
fi

# Detecta problemas específicos
print_section "Análise de Problemas"
detect_problems

# Lista problemas encontrados
PROBLEMS_FOUND=false
echo ""
print_info "Problemas detectados:"
if [ "$FFMPEG_PROBLEM" = true ]; then
    echo "  ❌ FFmpeg não está funcionando corretamente"
    PROBLEMS_FOUND=true
fi
if [ "$PM2_PROBLEM" = true ]; then
    echo "  ❌ PM2 não está configurado corretamente"
    PROBLEMS_FOUND=true
fi
if [ "$VENV_PROBLEM" = true ]; then
    echo "  ❌ Ambiente virtual com problemas"
    PROBLEMS_FOUND=true
fi
if [ "$DEPENDENCIES_PROBLEM" = true ]; then
    echo "  ❌ Dependências Python não instaladas"
    PROBLEMS_FOUND=true
fi

if [ "$PROBLEMS_FOUND" = false ]; then
    print_warning "Problemas não específicos detectados"
    print_info "Executando correção geral..."
fi

echo ""
read -p "Deseja prosseguir com a correção automática? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    print_info "Correção cancelada pelo usuário"
    exit 0
fi

# Inicia correções
print_section "Iniciando Correções Automáticas"

# 1. Corrige FFmpeg se necessário
if [ "$FFMPEG_PROBLEM" = true ]; then
    print_step "Corrigindo FFmpeg..."
    if bash corrigir_ffmpeg.sh; then
        print_success "FFmpeg corrigido!"
    else
        print_error "Falha ao corrigir FFmpeg"
        print_warning "Continuando com outras correções..."
    fi
else
    print_info "FFmpeg: OK, não precisa correção"
fi

# 2. Corrige ambiente virtual se necessário
if [ "$VENV_PROBLEM" = true ] || [ "$DEPENDENCIES_PROBLEM" = true ]; then
    print_step "Corrigindo ambiente virtual e dependências..."
    
    # Recria ambiente virtual se necessário
    if [ "$VENV_PROBLEM" = true ]; then
        print_info "Recriando ambiente virtual..."
        rm -rf venv 2>/dev/null || true
        python3 -m venv venv
        print_success "Ambiente virtual recriado!"
    fi
    
    # Ativa ambiente virtual
    source venv/bin/activate 2>/dev/null || . venv/bin/activate
    
    # Atualiza pip
    print_info "Atualizando pip..."
    python -m pip install --upgrade pip --quiet
    
    # Instala dependências
    print_info "Instalando dependências..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt --quiet
    else
        pip install Flask==2.1.0 SpeechRecognition==3.10.0 Werkzeug==2.2.2 pydub==0.25.1 gunicorn==20.1.0 ffmpeg-python==0.2.0 python-dotenv==1.0.0 --quiet
    fi
    
    print_success "Dependências instaladas!"
else
    print_info "Ambiente virtual: OK, não precisa correção"
fi

# 3. Corrige PM2 se necessário
if [ "$PM2_PROBLEM" = true ]; then
    print_step "Corrigindo configuração do PM2..."
    if bash corrigir_pm2.sh; then
        print_success "PM2 corrigido!"
    else
        print_error "Falha ao corrigir PM2"
        print_warning "PM2 pode precisar de configuração manual"
    fi
else
    print_info "PM2: OK, não precisa correção"
fi

# 4. Cria arquivo .env se não existir
if [ ! -f ".env" ]; then
    print_step "Criando arquivo .env..."
    cat > .env << EOF
# Configurações da API de Transcrição
HOST=0.0.0.0
PORT=4002
DEBUG=False
# API_TOKEN=seu_token_aqui
EOF
    print_success "Arquivo .env criado!"
fi

# 5. Verifica se main.py existe
if [ ! -f "main.py" ]; then
    print_warning "Arquivo main.py não encontrado!"
    print_info "Certifique-se de que você está no diretório correto da API"
fi

print_section "Verificação Final"

# Executa verificação final
print_step "Executando verificação final..."
sleep 2  # Aguarda sistema se estabilizar

run_verification
FINAL_VERIFICATION=$?

if [ $FINAL_VERIFICATION -eq 0 ]; then
    print_section "🎉 Correção Concluída com Sucesso!"
    
    print_success "Todos os problemas foram corrigidos!"
    print_success "A API está pronta para uso!"
    
    echo ""
    print_info "Para iniciar a API:"
    echo "  1. Ativação manual:"
    echo "     source venv/bin/activate"
    echo "     python main.py"
    echo ""
    echo "  2. Com PM2 (recomendado):"
    echo "     pm2 start ecosystem.config.js"
    echo "     pm2 status"
    echo ""
    print_info "A API estará disponível em: http://localhost:4002"
    
else
    print_section "⚠️ Correção Parcial"
    
    FINAL_PERCENTAGE=$(grep "Taxa de sucesso:" /tmp/verificacao_output.txt | grep -o "[0-9]*%" || echo "0%")
    print_warning "Correção parcial concluída: $FINAL_PERCENTAGE"
    print_warning "Alguns problemas podem persistir"
    
    echo ""
    print_info "Problemas restantes podem incluir:"
    echo "  - Dependências do sistema não instaladas"
    echo "  - Permissões de arquivo"
    echo "  - Configurações específicas do sistema"
    echo ""
    print_info "Tente executar manualmente:"
    echo "  bash install.sh"
    echo "  bash verificar_instalacao.sh"
fi

# Limpeza
rm -f /tmp/verificacao_output.txt 2>/dev/null || true

echo ""
print_info "Logs e arquivos criados:"
echo "  - corrigir_ffmpeg.sh:   Correção específica do FFmpeg"
echo "  - corrigir_pm2.sh:      Correção específica do PM2"
echo "  - start_api.sh:         Script de inicialização robusto"
echo "  - ecosystem.config.js:  Configuração do PM2"
echo "  - logs/:                Diretório de logs (se PM2 foi configurado)"
echo ""

print_success "Correção automática finalizada!"
echo ""