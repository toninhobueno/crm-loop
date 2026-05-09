#!/bin/bash

# ============================================
# Script de Verificação de Instalação
# API de Transcrição de Áudio
# ============================================

# Garante que o script está sendo executado com bash
if [ -z "$BASH_VERSION" ]; then
    exec /bin/bash "$0" "$@"
fi

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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_section() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}============================================${NC}"
}

# Contadores
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Função para verificar e contar
check_item() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ $1 -eq 0 ]; then
        print_success "$2"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        print_error "$2"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Banner
echo ""
echo "============================================"
echo "  Verificador de Instalação - API Transcrição"
echo "============================================"
echo ""

# Detecta o diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_info "Diretório de verificação: $SCRIPT_DIR"
echo ""

# ============================================
# 1. VERIFICAÇÕES DO SISTEMA OPERACIONAL
# ============================================
print_section "1. Sistema Operacional"

# Detecta o sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
    check_item 0 "Sistema: $OS $OS_VERSION"
else
    check_item 1 "Não foi possível detectar o sistema operacional"
fi

# Verifica se está rodando como root
if [ "$EUID" -eq 0 ]; then
    print_warning "Executando como root (pode ser necessário para algumas verificações)"
else
    print_info "Executando como usuário: $(whoami)"
fi

# ============================================
# 2. DEPENDÊNCIAS DO SISTEMA
# ============================================
print_section "2. Dependências do Sistema"

# Python 3
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    PYTHON_PATH=$(which python3)
    check_item 0 "Python 3: $PYTHON_VERSION ($PYTHON_PATH)"
    PYTHON3_CMD="python3"
elif [ -f "/usr/bin/python3" ]; then
    PYTHON_VERSION=$(/usr/bin/python3 --version 2>&1)
    check_item 0 "Python 3: $PYTHON_VERSION (/usr/bin/python3)"
    PYTHON3_CMD="/usr/bin/python3"
else
    check_item 1 "Python 3 não encontrado"
    PYTHON3_CMD=""
fi

# pip3
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version 2>&1 | head -n 1)
    check_item 0 "pip3: $PIP_VERSION"
elif [ -f "/usr/bin/pip3" ]; then
    PIP_VERSION=$(/usr/bin/pip3 --version 2>&1 | head -n 1)
    check_item 0 "pip3: $PIP_VERSION"
else
    check_item 1 "pip3 não encontrado"
fi

# FFmpeg
FFMPEG_FIXED=false
if command -v ffmpeg &> /dev/null; then
    FFMPEG_PATH=$(which ffmpeg)
    if ffmpeg -version &>/dev/null 2>&1; then
        FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
        check_item 0 "FFmpeg: $FFMPEG_VERSION ($FFMPEG_PATH)"
    else
        FFMPEG_ERROR=$(ffmpeg -version 2>&1 | head -n 1)
        print_error "FFmpeg encontrado mas com problemas de bibliotecas"
        print_warning "Erro: $FFMPEG_ERROR"
        
        # Tenta corrigir automaticamente
        print_info "Tentando corrigir FFmpeg automaticamente..."
        if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
            print_info "Reinstalando FFmpeg e bibliotecas..."
            sudo apt-get update -qq >/dev/null 2>&1
            sudo apt-get remove --purge -y ffmpeg >/dev/null 2>&1
            sudo apt-get install -y ffmpeg libavdevice-dev libavformat-dev libavcodec-dev libavutil-dev libswscale-dev libswresample-dev >/dev/null 2>&1
            sudo ldconfig >/dev/null 2>&1
            
            # Testa novamente
            sleep 1
            if ffmpeg -version &>/dev/null 2>&1; then
                FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
                check_item 0 "FFmpeg CORRIGIDO: $FFMPEG_VERSION"
                FFMPEG_FIXED=true
            else
                check_item 1 "FFmpeg: Falha ao corrigir automaticamente"
                print_error "Execute manualmente: sudo apt-get install --reinstall ffmpeg"
            fi
        else
            check_item 1 "FFmpeg: Precisa de privilégios sudo para corrigir"
            print_info "Execute: sudo apt-get install --reinstall ffmpeg"
        fi
    fi
elif [ -f "/usr/bin/ffmpeg" ]; then
    if /usr/bin/ffmpeg -version &>/dev/null 2>&1; then
        FFMPEG_VERSION=$(/usr/bin/ffmpeg -version 2>&1 | head -n 1)
        check_item 0 "FFmpeg: $FFMPEG_VERSION (/usr/bin/ffmpeg)"
    else
        check_item 1 "FFmpeg encontrado mas com problemas de bibliotecas"
        print_info "Execute: sudo apt-get install --reinstall ffmpeg"
    fi
else
    check_item 1 "FFmpeg não encontrado"
    print_info "Execute: sudo apt-get install ffmpeg"
fi

# ffprobe
if command -v ffprobe &> /dev/null; then
    if ffprobe -version &>/dev/null 2>&1; then
        check_item 0 "ffprobe: $(ffprobe -version 2>&1 | head -n 1)"
    else
        FFPROBE_ERROR=$(ffprobe -version 2>&1 | head -n 1)
        print_error "ffprobe encontrado mas com problemas"
        print_warning "Erro: $FFPROBE_ERROR"
        
        # Se FFmpeg foi corrigido, ffprobe geralmente também funciona
        if [ "$FFMPEG_FIXED" = true ]; then
            sleep 1
            if ffprobe -version &>/dev/null 2>&1; then
                check_item 0 "ffprobe CORRIGIDO: $(ffprobe -version 2>&1 | head -n 1)"
            else
                check_item 1 "ffprobe: Ainda com problemas após correção do FFmpeg"
            fi
        else
            check_item 1 "ffprobe: Precisa corrigir FFmpeg primeiro"
            print_info "ffprobe geralmente é corrigido junto com FFmpeg"
        fi
    fi
else
    check_item 1 "ffprobe não encontrado (necessário para análise de áudio)"
    print_info "ffprobe geralmente vem com o pacote ffmpeg"
fi

# Node.js e npm (para PM2)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>&1)
    check_item 0 "Node.js: $NODE_VERSION"
else
    check_item 1 "Node.js não encontrado (necessário para PM2)"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version 2>&1)
    check_item 0 "npm: $NPM_VERSION"
else
    check_item 1 "npm não encontrado (necessário para PM2)"
fi

# PM2
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version 2>&1)
    PM2_PATH=$(which pm2)
    check_item 0 "PM2: $PM2_VERSION ($PM2_PATH)"
else
    check_item 1 "PM2 não encontrado"
fi

# ============================================
# 3. ESTRUTURA DE DIRETÓRIOS
# ============================================
print_section "3. Estrutura de Diretórios"

# Verifica se está no diretório correto
if [ -f "main.py" ]; then
    check_item 0 "main.py encontrado em: $SCRIPT_DIR"
else
    check_item 1 "main.py não encontrado em: $SCRIPT_DIR"
fi

if [ -f "requirements.txt" ]; then
    check_item 0 "requirements.txt encontrado"
    print_info "  Dependências listadas: $(wc -l < requirements.txt) pacotes"
else
    check_item 1 "requirements.txt não encontrado"
fi

# Ambiente virtual
if [ -d "venv" ]; then
    check_item 0 "Diretório venv existe"
    
    # Verifica Python do venv
    if [ -f "venv/bin/python3" ]; then
        VENV_PYTHON_VERSION=$("venv/bin/python3" --version 2>&1)
        check_item 0 "Python do venv: $VENV_PYTHON_VERSION"
        VENV_PYTHON="venv/bin/python3"
    elif [ -f "venv/bin/python" ]; then
        VENV_PYTHON_VERSION=$("venv/bin/python" --version 2>&1)
        check_item 0 "Python do venv: $VENV_PYTHON_VERSION"
        VENV_PYTHON="venv/bin/python"
    else
        check_item 1 "Python do venv não encontrado"
        VENV_PYTHON=""
    fi
    
    # Verifica pip do venv
    if [ -f "venv/bin/pip" ] || [ -f "venv/bin/pip3" ]; then
        check_item 0 "pip do venv encontrado"
    else
        check_item 1 "pip do venv não encontrado"
    fi
else
    check_item 1 "Diretório venv não existe"
    VENV_PYTHON=""
fi

# Arquivo .env
if [ -f ".env" ]; then
    check_item 0 "Arquivo .env encontrado"
    print_info "  Conteúdo do .env:"
    grep -v "^#" .env | grep -v "^$" | sed 's/^/    /'
else
    check_item 1 "Arquivo .env não encontrado"
fi

# ============================================
# 4. BIBLIOTECAS PYTHON NO VENV
# ============================================
print_section "4. Bibliotecas Python (venv)"

if [ -n "$VENV_PYTHON" ] && [ -f "$VENV_PYTHON" ]; then
    # Lista de bibliotecas necessárias
    REQUIRED_PACKAGES=(
        "flask:Flask"
        "speech_recognition:SpeechRecognition"
        "pydub:pydub"
        "requests:requests"
        "dotenv:python-dotenv"
        "werkzeug:Werkzeug"
    )
    
    for package_info in "${REQUIRED_PACKAGES[@]}"; do
        IFS=':' read -r module_name package_name <<< "$package_info"
        
        if "$VENV_PYTHON" -c "import $module_name" 2>/dev/null; then
            VERSION=$("$VENV_PYTHON" -c "import $module_name; print(getattr($module_name, '__version__', 'installed'))" 2>/dev/null || echo "installed")
            check_item 0 "$package_name: $VERSION"
        else
            check_item 1 "$package_name: NÃO INSTALADO"
        fi
    done
    
    # Verifica gunicorn (opcional)
    if "$VENV_PYTHON" -c "import gunicorn" 2>/dev/null; then
        VERSION=$("$VENV_PYTHON" -c "import gunicorn; print(gunicorn.__version__)" 2>/dev/null || echo "installed")
        check_item 0 "gunicorn: $VERSION"
    else
        print_warning "gunicorn: não instalado (opcional para produção)"
    fi
    
    # Verifica ffmpeg-python (wrapper, não essencial)
    if "$VENV_PYTHON" -c "import ffmpeg" 2>/dev/null; then
        check_item 0 "ffmpeg-python: instalado"
    else
        print_warning "ffmpeg-python: não instalado (wrapper opcional)"
    fi
    
    # Lista todas as bibliotecas instaladas
    print_info "Total de pacotes instalados no venv:"
    "$VENV_PYTHON" -m pip list 2>/dev/null | wc -l | xargs echo "    "
    
else
    print_error "Não é possível verificar bibliotecas Python: venv não encontrado"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ============================================
# 5. VERIFICAÇÃO DO PM2
# ============================================
print_section "5. Configuração do PM2"

if command -v pm2 &> /dev/null; then
    # Verifica processos PM2 relacionados
    PM2_PROCESSES=$(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | grep -i "transcricao\|audio\|api" | wc -l)
    
    if [ "$PM2_PROCESSES" -gt 0 ]; then
        print_info "Processos PM2 relacionados encontrados: $PM2_PROCESSES"
        pm2 list | grep -E "transcricao|audio|api" || true
        
        # Verifica se está usando o Python do venv
        for proc_name in $(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -i "transcricao\|audio\|api"); do
            # Obtém informações do processo PM2
            PM2_INFO=$(pm2 describe "$proc_name" 2>/dev/null)
            
            if [ -n "$PM2_INFO" ]; then
                # Tenta obter o interpreter de várias formas
                INTERPRETER=$(echo "$PM2_INFO" | grep -i "interpreter" | head -n 1 | awk -F': ' '{print $2}' | xargs)
                
                # Se não encontrou, tenta via pm2 jlist
                if [ -z "$INTERPRETER" ] || [ "$INTERPRETER" = "interpreter" ]; then
                    INTERPRETER=$(pm2 jlist 2>/dev/null | grep -A 20 "\"name\":\"$proc_name\"" | grep -o '"interpreter":"[^"]*"' | cut -d'"' -f4)
                fi
                
                if [ -n "$INTERPRETER" ] && [ "$INTERPRETER" != "interpreter" ]; then
                    if echo "$INTERPRETER" | grep -q "venv"; then
                        check_item 0 "PM2 processo '$proc_name' usando Python do venv: $INTERPRETER"
                    else
                        check_item 1 "PM2 processo '$proc_name' NÃO está usando Python do venv: $INTERPRETER"
                        print_warning "  Deveria usar: $SCRIPT_DIR/venv/bin/python3"
                    fi
                else
                    check_item 1 "PM2 processo '$proc_name': Não foi possível detectar o interpreter"
                    print_warning "  Execute: pm2 describe $proc_name"
                fi
            else
                check_item 1 "PM2 processo '$proc_name': Não foi possível obter informações"
            fi
        done
    else
        print_warning "Nenhum processo PM2 relacionado encontrado"
    fi
else
    print_warning "PM2 não está instalado (opcional)"
fi

# ============================================
# 6. TESTES DE FUNCIONALIDADE
# ============================================
print_section "6. Testes de Funcionalidade"

# Testa se o Python do venv consegue importar Flask
if [ -n "$VENV_PYTHON" ] && [ -f "$VENV_PYTHON" ]; then
    if "$VENV_PYTHON" -c "from flask import Flask; print('OK')" 2>/dev/null; then
        check_item 0 "Flask pode ser importado no venv"
    else
        check_item 1 "Flask NÃO pode ser importado no venv"
    fi
    
    # Testa se consegue importar SpeechRecognition
    if "$VENV_PYTHON" -c "import speech_recognition as sr; print('OK')" 2>/dev/null; then
        check_item 0 "SpeechRecognition pode ser importado no venv"
    else
        check_item 1 "SpeechRecognition NÃO pode ser importado no venv"
    fi
    
    # Testa se consegue importar pydub
    if "$VENV_PYTHON" -c "from pydub import AudioSegment; print('OK')" 2>/dev/null; then
        check_item 0 "pydub pode ser importado no venv"
    else
        check_item 1 "pydub NÃO pode ser importado no venv"
    fi
else
    print_error "Não é possível testar funcionalidades: venv não encontrado"
fi

# Testa FFmpeg com um comando simples
if command -v ffmpeg &> /dev/null; then
    if ffmpeg -version &>/dev/null; then
        check_item 0 "FFmpeg responde corretamente"
    else
        check_item 1 "FFmpeg não responde corretamente"
    fi
fi

# ============================================
# 7. RESUMO FINAL
# ============================================
print_section "Resumo da Verificação"

echo ""
echo "Total de verificações: $TOTAL_CHECKS"
print_success "Passou: $PASSED_CHECKS"
if [ $FAILED_CHECKS -gt 0 ]; then
    print_error "Falhou: $FAILED_CHECKS"
else
    print_success "Falhou: $FAILED_CHECKS"
fi

# Calcula porcentagem
if [ $TOTAL_CHECKS -gt 0 ]; then
    PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo ""
    echo "Taxa de sucesso: $PERCENTAGE%"
    
    if [ $PERCENTAGE -eq 100 ]; then
        echo ""
        print_success "✅ Instalação completa e verificada!"
    elif [ $PERCENTAGE -ge 80 ]; then
        echo ""
        print_warning "⚠️  Instalação quase completa. Alguns itens precisam de atenção."
    else
        echo ""
        print_error "❌ Instalação incompleta. Execute o script de instalação."
    fi
fi

echo ""
print_info "Para instalar/corrigir problemas, execute:"
echo "  bash install.sh"
echo ""
print_info "Para verificar novamente, execute:"
echo "  bash verificar_instalacao.sh"
echo ""

# Se houver problemas, oferece correção
if [ $FAILED_CHECKS -gt 0 ]; then
    echo ""
    print_section "Correção Automática"
    
    # Verifica problemas específicos com FFmpeg
    if command -v ffmpeg &> /dev/null && ! ffmpeg -version &>/dev/null 2>&1; then
        print_warning "FFmpeg detectado com problemas de bibliotecas"
        read -p "Deseja tentar corrigir FFmpeg automaticamente? (s/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[SsYy]$ ]]; then
            if [ "$EUID" -eq 0 ] || sudo -n true 2>/dev/null; then
                print_info "Corrigindo FFmpeg..."
                sudo apt-get update -qq
                sudo apt-get remove --purge -y ffmpeg 2>/dev/null || true
                sudo apt-get install -y ffmpeg libavdevice-dev libavformat-dev libavcodec-dev libavutil-dev libswscale-dev libswresample-dev
                sudo ldconfig
                
                sleep 2
                if ffmpeg -version &>/dev/null 2>&1; then
                    print_success "FFmpeg corrigido com sucesso!"
                    echo ""
                    print_info "Execute o script novamente para verificar:"
                    echo "  bash verificar_instalacao.sh"
                else
                    print_error "Falha ao corrigir FFmpeg automaticamente"
                    echo ""
                    print_info "Tente manualmente:"
                    echo "  sudo apt-get install --reinstall ffmpeg"
                    echo "  sudo ldconfig"
                fi
            else
                print_error "Precisa de privilégios sudo para corrigir"
                echo ""
                print_info "Execute manualmente:"
                echo "  sudo apt-get install --reinstall ffmpeg"
                echo "  sudo apt-get install -y libavdevice-dev libavformat-dev libavcodec-dev libavutil-dev libswscale-dev libswresample-dev"
                echo "  sudo ldconfig"
            fi
        fi
    fi
    
    # Verifica problemas com PM2 não usando venv
    if command -v pm2 &> /dev/null && [ -n "$VENV_PYTHON" ] && [ -f "$VENV_PYTHON" ]; then
        PM2_WRONG_INTERPRETER=false
        for proc_name in $(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -i "transcricao\|audio\|api"); do
            PM2_INFO=$(pm2 describe "$proc_name" 2>/dev/null)
            INTERPRETER=$(echo "$PM2_INFO" | grep -i "interpreter" | head -n 1 | awk -F': ' '{print $2}' | xargs)
            
            if [ -z "$INTERPRETER" ] || [ "$INTERPRETER" = "interpreter" ]; then
                INTERPRETER=$(pm2 jlist 2>/dev/null | grep -A 20 "\"name\":\"$proc_name\"" | grep -o '"interpreter":"[^"]*"' | cut -d'"' -f4)
            fi
            
            if [ -n "$INTERPRETER" ] && [ "$INTERPRETER" != "interpreter" ] && ! echo "$INTERPRETER" | grep -q "venv"; then
                PM2_WRONG_INTERPRETER=true
                break
            fi
        done
        
        if [ "$PM2_WRONG_INTERPRETER" = true ]; then
            print_warning "PM2 não está usando Python do venv"
            read -p "Deseja corrigir o PM2 para usar o Python do venv? (s/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[SsYy]$ ]]; then
                print_info "Execute o script de correção do PM2:"
                echo "  bash corrigir_pm2.sh"
                echo ""
                print_info "Ou execute manualmente:"
                for proc_name in $(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep -i "transcricao\|audio\|api"); do
                    echo "  pm2 delete $proc_name"
                    echo "  pm2 start $SCRIPT_DIR/main.py --name $proc_name --interpreter $VENV_PYTHON"
                done
            fi
        fi
    fi
fi

exit $FAILED_CHECKS

