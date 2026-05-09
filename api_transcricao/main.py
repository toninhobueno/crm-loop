#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
API de Transcrição de Áudio
============================

API Flask para transcrição de arquivos de áudio usando SpeechRecognition e pydub.
Suporta múltiplos formatos de áudio e conversão automática.

Autor: Sistema de Transcrição
Versão: 1.0.0
"""

import os
import sys
import logging
from pathlib import Path
import tempfile
import requests
from urllib.parse import urlparse
import mimetypes

# Importações Flask
from flask import Flask, request, jsonify, render_template_string
from werkzeug.utils import secure_filename

# Importações para processamento de áudio
import speech_recognition as sr
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError

# Importações para variáveis de ambiente
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Configuração da aplicação
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api_transcricao.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Configurações da API
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 4002))
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
API_TOKEN = os.getenv('API_TOKEN', None)

# Formatos de áudio suportados
SUPPORTED_FORMATS = {
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/ogg': 'ogg',
    'audio/x-ogg': 'ogg',
    'audio/mp4': 'mp4',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac'
}

# Extensões de arquivo suportadas
SUPPORTED_EXTENSIONS = {'.wav', '.mp3', '.ogg', '.mp4', '.m4a', '.aac', '.flac'}

def validate_api_token():
    """Valida o token da API se configurado"""
    if API_TOKEN:
        token = request.headers.get('Authorization')
        if not token or token != f'Bearer {API_TOKEN}':
            return False
    return True

def get_file_format(file_path_or_content_type):
    """Detecta o formato do arquivo de áudio"""
    if os.path.isfile(file_path_or_content_type):
        # É um caminho de arquivo
        ext = Path(file_path_or_content_type).suffix.lower()
        if ext in SUPPORTED_EXTENSIONS:
            return ext[1:]  # Remove o ponto
    else:
        # É um content-type
        return SUPPORTED_FORMATS.get(file_path_or_content_type.lower())
    return None

def convert_to_wav(input_file, output_file):
    """Converte arquivo de áudio para WAV usando pydub"""
    try:
        logger.info(f"Convertendo {input_file} para {output_file}")
        
        # Detecta formato do arquivo
        file_format = get_file_format(input_file)
        if not file_format:
            # Tenta detectar pela extensão
            ext = Path(input_file).suffix.lower()
            if ext:
                file_format = ext[1:]
        
        # Carrega o áudio
        if file_format == 'mp3':
            audio = AudioSegment.from_mp3(input_file)
        elif file_format == 'ogg':
            audio = AudioSegment.from_ogg(input_file)
        elif file_format == 'mp4' or file_format == 'm4a':
            audio = AudioSegment.from_file(input_file, format="mp4")
        elif file_format == 'aac':
            audio = AudioSegment.from_file(input_file, format="aac")
        elif file_format == 'flac':
            audio = AudioSegment.from_file(input_file, format="flac")
        elif file_format == 'wav':
            audio = AudioSegment.from_wav(input_file)
        else:
            # Tenta carregar automaticamente
            audio = AudioSegment.from_file(input_file)
        
        # Converte para mono e 16kHz (otimizado para reconhecimento de voz)
        audio = audio.set_channels(1).set_frame_rate(16000)
        
        # Exporta como WAV
        audio.export(output_file, format="wav")
        logger.info(f"Conversão concluída: {output_file}")
        return True
        
    except CouldntDecodeError as e:
        logger.error(f"Erro ao decodificar áudio: {e}")
        return False
    except Exception as e:
        logger.error(f"Erro na conversão: {e}")
        return False

def transcribe_audio(audio_file):
    """Transcreve arquivo de áudio usando SpeechRecognition"""
    try:
        recognizer = sr.Recognizer()
        
        with sr.AudioFile(audio_file) as source:
            logger.info("Carregando áudio para transcrição...")
            # Ajusta para ruído ambiente
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            # Carrega o áudio
            audio_data = recognizer.record(source)
        
        logger.info("Iniciando transcrição...")
        
        # Tenta diferentes engines de reconhecimento
        engines = [
            ('Google', lambda: recognizer.recognize_google(audio_data, language='pt-BR')),
            ('Google (en)', lambda: recognizer.recognize_google(audio_data, language='en-US')),
        ]
        
        for engine_name, recognize_func in engines:
            try:
                logger.info(f"Tentando transcrição com {engine_name}...")
                text = recognize_func()
                if text.strip():
                    logger.info(f"Transcrição bem-sucedida com {engine_name}")
                    return {
                        'success': True,
                        'text': text.strip(),
                        'engine': engine_name,
                        'confidence': 'high'  # Google API não retorna confidence
                    }
            except sr.UnknownValueError:
                logger.warning(f"{engine_name}: Não foi possível entender o áudio")
                continue
            except sr.RequestError as e:
                logger.error(f"{engine_name}: Erro na requisição: {e}")
                continue
        
        return {
            'success': False,
            'error': 'Não foi possível transcrever o áudio com nenhum engine disponível',
            'text': '',
            'engine': None
        }
        
    except Exception as e:
        logger.error(f"Erro na transcrição: {e}")
        return {
            'success': False,
            'error': f'Erro interno na transcrição: {str(e)}',
            'text': '',
            'engine': None
        }

def download_audio_from_url(url, temp_file):
    """Baixa arquivo de áudio de uma URL"""
    try:
        logger.info(f"Baixando áudio de: {url}")
        
        # Valida URL
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return False, "URL inválida"
        
        # Faz o download
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        # Verifica content-type
        content_type = response.headers.get('content-type', '').lower()
        if not any(supported in content_type for supported in SUPPORTED_FORMATS.keys()):
            logger.warning(f"Content-type não suportado: {content_type}")
        
        # Salva o arquivo
        with open(temp_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logger.info(f"Download concluído: {temp_file}")
        return True, None
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro no download: {e}")
        return False, f"Erro no download: {str(e)}"
    except Exception as e:
        logger.error(f"Erro inesperado no download: {e}")
        return False, f"Erro inesperado: {str(e)}"

@app.route('/', methods=['GET'])
def home():
    """Página inicial com documentação da API"""
    html_template = """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API de Transcrição de Áudio</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
            .endpoint { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { background: #27ae60; color: white; padding: 5px 10px; border-radius: 3px; }
            .code { background: #34495e; color: #ecf0f1; padding: 10px; border-radius: 3px; font-family: monospace; }
            .example { background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎤 API de Transcrição de Áudio</h1>
            <p>Converte arquivos de áudio em texto usando reconhecimento de voz</p>
        </div>
        
        <h2>📋 Endpoints Disponíveis</h2>
        
        <div class="endpoint">
            <h3><span class="method">POST</span> /transcrever</h3>
            <p><strong>Descrição:</strong> Transcreve um arquivo de áudio em texto</p>
            
            <h4>Parâmetros:</h4>
            <ul>
                <li><strong>audio</strong> (arquivo): Arquivo de áudio para transcrever</li>
                <li><strong>url</strong> (string): URL de um arquivo de áudio para baixar e transcrever</li>
            </ul>
            
            <h4>Formatos Suportados:</h4>
            <p>WAV, MP3, OGG, MP4, M4A, AAC, FLAC</p>
            
            <div class="example">
                <h4>Exemplo com arquivo:</h4>
                <div class="code">
curl -X POST http://localhost:4002/transcrever \\
  -F "audio=@meu_audio.wav"
                </div>
            </div>
            
            <div class="example">
                <h4>Exemplo com URL:</h4>
                <div class="code">
curl -X POST http://localhost:4002/transcrever \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://exemplo.com/audio.mp3"}'
                </div>
            </div>
        </div>
        
        <div class="endpoint">
            <h3><span class="method">GET</span> /status</h3>
            <p><strong>Descrição:</strong> Verifica o status da API</p>
        </div>
        
        <h2>📝 Resposta da API</h2>
        <div class="code">
{
  "success": true,
  "text": "Texto transcrito do áudio",
  "engine": "Google",
  "confidence": "high",
  "processing_time": 2.34
}
        </div>
        
        <h2>⚙️ Configuração</h2>
        <p>Configure as variáveis de ambiente no arquivo <code>.env</code>:</p>
        <div class="code">
HOST=0.0.0.0
PORT=4002
DEBUG=False
API_TOKEN=seu_token_aqui
        </div>
        
        <h2>🔒 Autenticação</h2>
        <p>Se <code>API_TOKEN</code> estiver configurado, inclua o header:</p>
        <div class="code">Authorization: Bearer seu_token_aqui</div>
    </body>
    </html>
    """
    return render_template_string(html_template)

@app.route('/status', methods=['GET'])
def status():
    """Endpoint para verificar status da API"""
    return jsonify({
        'status': 'online',
        'version': '1.0.0',
        'supported_formats': list(SUPPORTED_FORMATS.values()),
        'max_file_size': '100MB'
    })

@app.route('/transcrever', methods=['POST'])
def transcrever():
    """Endpoint principal para transcrição de áudio"""
    start_time = time.time()
    
    # Valida token se configurado
    if not validate_api_token():
        return jsonify({
            'success': False,
            'error': 'Token de autenticação inválido'
        }), 401
    
    try:
        temp_files = []  # Lista para cleanup
        
        # Verifica se é upload de arquivo ou URL
        if 'audio' in request.files:
            # Upload de arquivo
            file = request.files['audio']
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': 'Nenhum arquivo selecionado'
                }), 400
            
            # Valida extensão do arquivo
            filename = secure_filename(file.filename)
            file_ext = Path(filename).suffix.lower()
            
            if file_ext not in SUPPORTED_EXTENSIONS:
                return jsonify({
                    'success': False,
                    'error': f'Formato não suportado. Use: {", ".join(SUPPORTED_EXTENSIONS)}'
                }), 400
            
            # Salva arquivo temporário
            temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
            temp_files.append(temp_input.name)
            file.save(temp_input.name)
            temp_input.close()
            
            logger.info(f"Arquivo recebido: {filename} ({file_ext})")
            
        elif request.is_json and 'url' in request.get_json():
            # Download de URL
            data = request.get_json()
            url = data['url']
            
            # Cria arquivo temporário para download
            temp_input = tempfile.NamedTemporaryFile(delete=False)
            temp_files.append(temp_input.name)
            temp_input.close()
            
            # Faz download
            success, error = download_audio_from_url(url, temp_input.name)
            if not success:
                return jsonify({
                    'success': False,
                    'error': error
                }), 400
            
            logger.info(f"Arquivo baixado de URL: {url}")
            
        else:
            return jsonify({
                'success': False,
                'error': 'Envie um arquivo de áudio ou uma URL'
            }), 400
        
        # Converte para WAV se necessário
        input_file = temp_input.name
        wav_file = None
        
        # Verifica se já é WAV
        try:
            with sr.AudioFile(input_file) as source:
                # Se conseguir abrir como AudioFile, já é compatível
                wav_file = input_file
        except:
            # Precisa converter
            wav_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav').name
            temp_files.append(wav_file)
            
            if not convert_to_wav(input_file, wav_file):
                return jsonify({
                    'success': False,
                    'error': 'Erro na conversão do arquivo de áudio'
                }), 500
        
        # Transcreve o áudio
        result = transcribe_audio(wav_file)
        
        # Adiciona tempo de processamento
        processing_time = round(time.time() - start_time, 2)
        result['processing_time'] = processing_time
        
        # Cleanup dos arquivos temporários
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass
        
        # Retorna resultado
        if result['success']:
            logger.info(f"Transcrição concluída em {processing_time}s")
            return jsonify(result)
        else:
            logger.warning(f"Falha na transcrição: {result.get('error', 'Erro desconhecido')}")
            return jsonify(result), 422
            
    except Exception as e:
        logger.error(f"Erro interno: {e}")
        
        # Cleanup em caso de erro
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass
        
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor',
            'processing_time': round(time.time() - start_time, 2)
        }), 500

@app.errorhandler(413)
def file_too_large(error):
    """Handler para arquivos muito grandes"""
    return jsonify({
        'success': False,
        'error': 'Arquivo muito grande. Tamanho máximo: 100MB'
    }), 413

@app.errorhandler(404)
def not_found(error):
    """Handler para rotas não encontradas"""
    return jsonify({
        'success': False,
        'error': 'Endpoint não encontrado'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handler para erros internos"""
    return jsonify({
        'success': False,
        'error': 'Erro interno do servidor'
    }), 500

if __name__ == '__main__':
    import time
    
    logger.info("=" * 50)
    logger.info("🎤 Iniciando API de Transcrição de Áudio")
    logger.info("=" * 50)
    logger.info(f"Host: {HOST}")
    logger.info(f"Porta: {PORT}")
    logger.info(f"Debug: {DEBUG}")
    logger.info(f"Autenticação: {'Habilitada' if API_TOKEN else 'Desabilitada'}")
    logger.info(f"Formatos suportados: {', '.join(SUPPORTED_FORMATS.values())}")
    logger.info("=" * 50)
    
    # Verifica dependências críticas
    try:
        import speech_recognition as sr
        logger.info("✓ SpeechRecognition disponível")
    except ImportError:
        logger.error("✗ SpeechRecognition não encontrado")
        sys.exit(1)
    
    try:
        from pydub import AudioSegment
        logger.info("✓ pydub disponível")
    except ImportError:
        logger.error("✗ pydub não encontrado")
        sys.exit(1)
    
    # Verifica FFmpeg
    try:
        AudioSegment.converter = AudioSegment.get_converter()
        logger.info("✓ FFmpeg disponível")
    except:
        logger.warning("⚠ FFmpeg pode não estar disponível")
    
    logger.info("🚀 Iniciando servidor...")
    
    try:
        app.run(
            host=HOST,
            port=PORT,
            debug=DEBUG,
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("🛑 Servidor interrompido pelo usuário")
    except Exception as e:
        logger.error(f"❌ Erro ao iniciar servidor: {e}")
        sys.exit(1)