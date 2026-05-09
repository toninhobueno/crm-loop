#!/bin/bash

# Caminho dos diretórios
BACKEND_DIR="/home/deploy/zaaps/backend"
FRONTEND_DIR="/home/deploy/zaaps/frontend"

menu() {
    echo "======================================"
    echo "      GERENCIAMENTO DO MULTIFLOW      "
    echo "======================================"
    echo ""
    echo "1) Listar processos PM2"
    echo "2) Parar um processo"
    echo "3) Reiniciar um processo"
    echo "4) Remover um processo"
    echo "5) Buildar multiflow-backend"
    echo "6) Buildar multiflow-frontend"
    echo "7) Ver/Atualizar Baileys"
    echo "8) Listar versões APIs WhatsApp"
    echo "9) Sair"
    echo "10) Trocar usuário para deploy"
    echo ""
}

while true; do
    clear
    menu
    read -p "Escolha uma opção: " option

    case $option in
    1)
        echo ""
        echo "📝 LISTA DE PROCESSOS PM2"
        echo "========================="
        pm2 list
        echo ""
        echo "🔹 A lista ficará visível por 5 segundos..."
        sleep 5
    ;;

    2)
        read -p "ID ou nome do processo para parar: " PROC
        pm2 stop "$PROC"
        echo "✅ Processo parado!"
        read -p "Pressione ENTER para voltar ao menu..."
    ;;

    3)
        read -p "ID ou nome do processo para reiniciar: " PROC
        pm2 restart "$PROC"
        echo "🔄 Processo reiniciado!"
        read -p "Pressione ENTER para voltar ao menu..."
    ;;

    4)
        read -p "ID ou nome do processo para remover (pm2 delete): " PROC
        pm2 delete "$PROC"
        echo "🗑️ Processo removido!"
        read -p "Pressione ENTER para voltar ao menu..."
    ;;

    5)
        echo "🔨 Iniciando build do backend..."
        cd "$BACKEND_DIR" || { echo "Diretório backend não encontrado!"; sleep 2; continue; }
        npm run build
        pm2 restart multiflow-backend
        echo "✅ Build do backend concluído e processo reiniciado."
        read -p "Pressione ENTER para voltar ao menu..."
    ;;

    6)
        echo "🔨 Iniciando build do frontend..."
        cd "$FRONTEND_DIR" || { echo "Diretório frontend não encontrado!"; sleep 2; continue; }
        npm run build
        echo "✅ Build do frontend concluído."
        read -p "Pressione ENTER para voltar ao menu..."
    ;;

    7)
        cd "$BACKEND_DIR" || { echo "Diretório backend não encontrado!"; sleep 2; continue; }

        echo "📦 Verificando versão atual do Baileys..."
        CURRENT_VERSION=$(npm list @whiskeysockets/baileys | grep @whiskeysockets/baileys | awk -F@ '{print $2}')
        echo "   Versão atual instalada: $CURRENT_VERSION"

        echo "🌍 Buscando última versão disponível no npm..."
        LATEST_VERSION=$(npm view @whiskeysockets/baileys version)
        echo "   Última versão no npm:   $LATEST_VERSION"

        if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
          echo "✅ Já está na versão mais recente. Nada para atualizar."
          read -p "Pressione ENTER para voltar ao menu..."
          continue
        fi

        echo ""
        read -p "⚠️ Deseja atualizar para $LATEST_VERSION? (s/n): " CONFIRM

        if [[ "$CONFIRM" != "s" ]]; then
          echo "❌ Atualização cancelada."
          read -p "Pressione ENTER para voltar ao menu..."
          continue
        fi

        echo "🔄 Atualizando Baileys..."
        npm install @whiskeysockets/baileys@$LATEST_VERSION --save-exact

        echo "🔨 Recompilando backend..."
        npm run build

        echo "♻️ Reiniciando PM2..."
        pm2 restart multiflow-backend

        echo "✅ Atualização concluída com sucesso!"
        read -p "Pressione ENTER para voltar ao menu..."
    ;;

    8)
        echo ""
        echo "📱 VERSÕES DAS APIs DE WHATSAPP INSTALADAS"
        echo "=========================================="
        cd "$BACKEND_DIR" || { echo "Diretório backend não encontrado!"; sleep 2; continue; }
        
        echo ""
        echo "🔍 Listando versões instaladas:"
        echo ""
        npm list @whiskeysockets/baileys baileys qrcode-terminal 2>/dev/null | grep -E "(backend@|├──|└──)" | head -10
        
        echo ""
        echo "📊 Detalhes das versões:"
        echo "------------------------"
        
        # Versão oficial do Baileys
        BAILEYS_OFFICIAL=$(npm list @whiskeysockets/baileys 2>/dev/null | grep @whiskeysockets/baileys | head -1 | sed 's/.*@whiskeysockets\/baileys@//' | sed 's/ .*//')
        if [ ! -z "$BAILEYS_OFFICIAL" ]; then
            echo "✅ @whiskeysockets/baileys: $BAILEYS_OFFICIAL (oficial)"
        fi
        
        # Versão do fork customizado
        BAILEYS_FORK=$(npm list baileys 2>/dev/null | grep "baileys@" | head -1 | sed 's/.*baileys@//' | sed 's/ .*//')
        if [ ! -z "$BAILEYS_FORK" ]; then
            echo "🔧 baileys (fork): $BAILEYS_FORK (customizado)"
        fi
        
        # Versão do qrcode-terminal
        QRCODE_VERSION=$(npm list qrcode-terminal 2>/dev/null | grep qrcode-terminal | head -1 | sed 's/.*qrcode-terminal@//' | sed 's/ .*//')
        if [ ! -z "$QRCODE_VERSION" ]; then
            echo "📱 qrcode-terminal: $QRCODE_VERSION"
        fi
        
        echo ""
        echo "🌍 Verificando versões mais recentes disponíveis:"
        echo "------------------------------------------------"
        
        # Última versão oficial disponível
        LATEST_OFFICIAL=$(npm view @whiskeysockets/baileys version 2>/dev/null)
        if [ ! -z "$LATEST_OFFICIAL" ]; then
            echo "🆕 @whiskeysockets/baileys mais recente: $LATEST_OFFICIAL"
            if [ "$BAILEYS_OFFICIAL" != "$LATEST_OFFICIAL" ]; then
                echo "   ⚠️  Atualização disponível!"
            else
                echo "   ✅ Já está na versão mais recente"
            fi
        fi
        
        echo ""
        echo "🔹 A lista ficará visível por 10 segundos..."
        sleep 10
    ;;

    9)
        echo "Saindo..."
        exit 0
    ;;

    10)
        echo "🔄 Trocando usuário para deploy..."
        su deploy
        # Quando sair do su, volta para o menu
    ;;

    *)
        echo "⚠️ Opção inválida!"
        sleep 1
    ;;
    esac
done
