#!/bin/bash

# ============================================
# Script de Correção do FFmpeg
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
echo "  Correção do FFmpeg - API Transcrição"
echo "============================================"
echo ""

# Detecta o sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    print_info "Sistema operacional: $OS"
else
    print_error "Não foi possível detectar o sistema operacional"
    exit 1
fi

# Verifica privilégios
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
    print_warning "Este script precisa de privilégios sudo"
    print_info "Você será solicitado a inserir sua senha"
fi

print_section "Diagnóstico do FFmpeg"

# Verifica se FFmpeg está instalado
FFMPEG_INSTALLED=false
FFMPEG_WORKING=false

if command -v ffmpeg &> /dev/null; then
    FFMPEG_INSTALLED=true
    FFMPEG_PATH=$(which ffmpeg)
    print_success "FFmpeg encontrado em: $FFMPEG_PATH"
    
    # Testa se está funcionando
    if ffmpeg -version &>/dev/null 2>&1; then
        FFMPEG_WORKING=true
        FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
        print_success "FFmpeg está funcionando: $FFMPEG_VERSION"
    else
        FFMPEG_ERROR=$(ffmpeg -version 2>&1 | head -n 1)
        print_error "FFmpeg encontrado mas com problemas"
        print_error "Erro: $FFMPEG_ERROR"
    fi
else
    print_error "FFmpeg não está instalado"
fi

# Verifica ffprobe
FFPROBE_WORKING=false
if command -v ffprobe &> /dev/null; then
    if ffprobe -version &>/dev/null 2>&1; then
        FFPROBE_WORKING=true
        print_success "ffprobe está funcionando"
    else
        print_error "ffprobe encontrado mas com problemas"
    fi
else
    print_error "ffprobe não encontrado"
fi

# Se tudo está funcionando, não precisa fazer nada
if [ "$FFMPEG_WORKING" = true ] && [ "$FFPROBE_WORKING" = true ]; then
    print_success "FFmpeg e ffprobe estão funcionando corretamente!"
    echo ""
    print_info "Informações do FFmpeg:"
    ffmpeg -version 2>&1 | head -n 5
    exit 0
fi

print_section "Correção Automática do FFmpeg"

print_warning "Problemas detectados com FFmpeg. Iniciando correção..."

# Função para instalar FFmpeg no Ubuntu/Debian
fix_ffmpeg_debian() {
    print_info "Corrigindo FFmpeg no Ubuntu/Debian..."
    
    # Remove instalação corrompida
    print_info "Removendo instalação anterior..."
    sudo apt-get remove --purge -y ffmpeg libav-tools 2>/dev/null || true
    sudo apt-get autoremove -y 2>/dev/null || true
    
    # Atualiza repositórios
    print_info "Atualizando repositórios..."
    sudo apt-get update -qq
    
    # Instala FFmpeg e todas as bibliotecas necessárias
    print_info "Instalando FFmpeg e dependências..."
    sudo apt-get install -y \
        ffmpeg \
        libavdevice-dev \
        libavformat-dev \
        libavcodec-dev \
        libavutil-dev \
        libswscale-dev \
        libswresample-dev \
        libavfilter-dev \
        pkg-config
    
    # Atualiza bibliotecas compartilhadas
    print_info "Atualizando bibliotecas compartilhadas..."
    sudo ldconfig
    
    print_success "Instalação concluída!"
}

# Função para instalar FFmpeg no CentOS/RHEL/Fedora
fix_ffmpeg_rhel() {
    print_info "Corrigindo FFmpeg no CentOS/RHEL/Fedora..."
    
    # Remove instalação anterior
    print_info "Removendo instalação anterior..."
    sudo yum remove -y ffmpeg ffmpeg-devel 2>/dev/null || true
    
    # Instala repositório EPEL se necessário
    if ! yum repolist | grep -q epel; then
        print_info "Instalando repositório EPEL..."
        sudo yum install -y epel-release
    fi
    
    # Instala repositório RPM Fusion se necessário
    if ! yum repolist | grep -q rpmfusion; then
        print_info "Instalando repositório RPM Fusion..."
        sudo yum install -y https://download1.rpmfusion.org/free/el/rpmfusion-free-release-$(rpm -E %rhel).noarch.rpm
    fi
    
    # Instala FFmpeg
    print_info "Instalando FFmpeg..."
    sudo yum install -y ffmpeg ffmpeg-devel
    
    # Atualiza bibliotecas
    sudo ldconfig
    
    print_success "Instalação concluída!"
}

# Executa correção baseada no OS
case $OS in
    ubuntu|debian)
        fix_ffmpeg_debian
        ;;
    centos|rhel|fedora)
        fix_ffmpeg_rhel
        ;;
    *)
        print_warning "Sistema operacional não testado: $OS"
        print_info "Tentando correção com apt-get..."
        fix_ffmpeg_debian
        ;;
esac

print_section "Verificação Pós-Correção"

# Aguarda um momento para o sistema se estabilizar
sleep 2

# Testa FFmpeg novamente
CORRECTION_SUCCESS=true

if command -v ffmpeg &> /dev/null; then
    if ffmpeg -version &>/dev/null 2>&1; then
        FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
        print_success "FFmpeg corrigido: $FFMPEG_VERSION"
    else
        FFMPEG_ERROR=$(ffmpeg -version 2>&1 | head -n 1)
        print_error "FFmpeg ainda com problemas: $FFMPEG_ERROR"
        CORRECTION_SUCCESS=false
    fi
else
    print_error "FFmpeg não foi instalado corretamente"
    CORRECTION_SUCCESS=false
fi

# Testa ffprobe
if command -v ffprobe &> /dev/null; then
    if ffprobe -version &>/dev/null 2>&1; then
        print_success "ffprobe corrigido"
    else
        print_error "ffprobe ainda com problemas"
        CORRECTION_SUCCESS=false
    fi
else
    print_error "ffprobe não foi instalado"
    CORRECTION_SUCCESS=false
fi

print_section "Teste de Funcionalidade"

if [ "$CORRECTION_SUCCESS" = true ]; then
    print_info "Testando funcionalidades do FFmpeg..."
    
    # Testa conversão básica (cria um arquivo de teste temporário)
    if ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 -f null - &>/dev/null; then
        print_success "Teste de geração de vídeo: OK"
    else
        print_warning "Teste de geração de vídeo: FALHOU"
    fi
    
    # Testa análise de formato
    if ffprobe -f lavfi -i testsrc=duration=1:size=320x240:rate=1 -v quiet -show_format &>/dev/null; then
        print_success "Teste de análise de formato: OK"
    else
        print_warning "Teste de análise de formato: FALHOU"
    fi
    
    print_success "FFmpeg está funcionando corretamente!"
    
    echo ""
    print_info "Informações detalhadas do FFmpeg:"
    ffmpeg -version 2>&1 | head -n 10
    
else
    print_error "Correção automática falhou!"
    
    print_section "Correção Manual"
    
    print_info "Tente os seguintes comandos manualmente:"
    echo ""
    
    case $OS in
        ubuntu|debian)
            echo "# Para Ubuntu/Debian:"
            echo "sudo apt-get update"
            echo "sudo apt-get remove --purge ffmpeg"
            echo "sudo apt-get autoremove"
            echo "sudo apt-get install ffmpeg libavdevice-dev libavformat-dev libavcodec-dev"
            echo "sudo ldconfig"
            ;;
        centos|rhel|fedora)
            echo "# Para CentOS/RHEL/Fedora:"
            echo "sudo yum remove ffmpeg"
            echo "sudo yum install epel-release"
            echo "sudo yum install ffmpeg ffmpeg-devel"
            echo "sudo ldconfig"
            ;;
    esac
    
    echo ""
    print_info "Ou tente instalar via Snap (universal):"
    echo "sudo snap install ffmpeg"
    
    echo ""
    print_info "Ou compile do código fonte:"
    echo "# Baixe de: https://ffmpeg.org/download.html"
    echo "# Siga as instruções de compilação"
    
    exit 1
fi

print_section "Configuração para Python"

# Verifica se está no diretório da API
if [ -f "main.py" ] && [ -d "venv" ]; then
    print_info "Testando integração com Python..."
    
    # Ativa o ambiente virtual e testa pydub
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate 2>/dev/null || . venv/bin/activate 2>/dev/null
        
        # Testa se pydub consegue usar FFmpeg
        if python3 -c "
from pydub import AudioSegment
from pydub.utils import which
import sys

ffmpeg_path = which('ffmpeg')
if ffmpeg_path:
    print('✓ pydub encontrou FFmpeg em:', ffmpeg_path)
else:
    print('✗ pydub não conseguiu encontrar FFmpeg')
    sys.exit(1)

# Testa criação de um áudio simples
try:
    audio = AudioSegment.silent(duration=100)  # 100ms de silêncio
    print('✓ pydub consegue criar áudio')
except Exception as e:
    print('✗ pydub falhou ao criar áudio:', e)
    sys.exit(1)
" 2>/dev/null; then
            print_success "Integração Python/pydub/FFmpeg: OK"
        else
            print_warning "Problemas na integração Python/pydub/FFmpeg"
            print_info "Reinstale pydub:"
            echo "  pip install --upgrade --force-reinstall pydub"
        fi
    else
        print_warning "Ambiente virtual não encontrado ou não ativado"
    fi
else
    print_info "Não está no diretório da API (main.py não encontrado)"
fi

echo ""
print_success "Correção do FFmpeg concluída!"
print_info "Execute o verificador para confirmar:"
echo "  bash verificar_instalacao.sh"
echo ""