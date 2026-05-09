import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import Camera, { FACING_MODES } from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';

Modal.setAppElement('#root');

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 99999, // Z-index mais alto para ficar acima de tudo
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: 'none',
    padding: 0,
    margin: 0,
    background: '#000',
    overflow: 'hidden',
    borderRadius: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 99999, // Z-index mais alto
  },
};

const ModalCamera = ({ isOpen, onRequestClose, onCapture }) => {
  const [capturedImage, setCapturedImage] = useState(null);

  const handleTakePhoto = (dataUri) => {
    setCapturedImage(dataUri);
  };

  const handleConfirm = () => {
    // Converta a imagem capturada em um arquivo (Blob)
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        // Chame a função de retorno com o arquivo da imagem capturada
        onCapture(blob);
      });

    // Feche o modal
    setCapturedImage(null);
    onRequestClose();
  };

  // Ocultar barra de status e elementos da interface quando modal abrir
  useEffect(() => {
    if (isOpen) {
      // Lista de seletores para ocultar elementos da interface
      const selectorsToHide = [
        'input[placeholder*="Buscar"]',
        'input[placeholder*="buscar"]',
        'input[placeholder*="Search"]',
        'input[placeholder*="search"]',
        '[class*="search"]',
        '[class*="Search"]',
        '[class*="tag"]',
        '[class*="Tag"]',
        '[class*="filter"]',
        '[class*="Filter"]',
        '[class*="toolbar"]',
        '[class*="Toolbar"]',
        '[class*="header"]:not([class*="modal"])',
        '[class*="Header"]:not([class*="modal"])',
        '.MuiToolbar-root',
        '.MuiAppBar-root',
        '[role="toolbar"]',
        '.MuiPaper-root.MuiPaper-elevation1.MuiPaper-rounded', // Classe específica que você quer ocultar
        '.MuiPaper-elevation1', // Alternativa mais ampla
        '.MuiPaper-rounded' // Alternativa mais ampla
      ];
      
      const elementsToHide = [];
      
      selectorsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Verificar se o elemento não está dentro do modal da câmera
          if (!element.closest('[class*="ReactModal"]') && !element.closest('.ReactModal__Content')) {
            elementsToHide.push({
              element,
              originalDisplay: element.style.display,
              originalVisibility: element.style.visibility
            });
            element.style.display = 'none';
            element.style.visibility = 'hidden';
          }
        });
      });
      
      // Busca específica para MuiPaper com múltiplas classes
      const muiPapers = document.querySelectorAll('.MuiPaper-root');
      muiPapers.forEach(paper => {
        const classList = paper.classList;
        if (classList.contains('MuiPaper-elevation1') && classList.contains('MuiPaper-rounded')) {
          // Verificar se não está dentro do modal da câmera
          if (!paper.closest('[class*="ReactModal"]') && !paper.closest('.ReactModal__Content')) {
            elementsToHide.push({
              element: paper,
              originalDisplay: paper.style.display,
              originalVisibility: paper.style.visibility
            });
            paper.style.display = 'none';
            paper.style.visibility = 'hidden';
          }
        }
      });
      
      // Ocultar especificamente elementos com texto "Buscar" ou "buscar"
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        if (element.textContent && 
            (element.textContent.includes('Buscar') || element.textContent.includes('buscar')) &&
            !element.closest('[class*="ReactModal"]') && 
            !element.closest('.ReactModal__Content')) {
          elementsToHide.push({
            element,
            originalDisplay: element.style.display,
            originalVisibility: element.style.visibility
          });
          element.style.display = 'none';
          element.style.visibility = 'hidden';
        }
      });
      
      // Ajustar posição do botão de captura da câmera
      const adjustCaptureButton = () => {
        const captureButton = document.querySelector('.react-html5-camera-photo button');
        if (captureButton) {
          captureButton.style.bottom = '200px'; // Subir o botão para 200px do fundo
          captureButton.style.position = 'absolute';
          captureButton.style.left = '50%';
          captureButton.style.transform = 'translateX(-50%)';
          captureButton.style.zIndex = '10';
          captureButton.style.width = '70px';
          captureButton.style.height = '70px';
          captureButton.style.borderRadius = '50%';
          captureButton.style.border = '3px solid white';
          captureButton.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
          captureButton.style.cursor = 'pointer';
        }
        
        // Ajustar também o container-circles se existir
        const containerCircles = document.querySelector('#container-circles');
        if (containerCircles) {
          containerCircles.style.bottom = '200px';
          containerCircles.style.left = '50%';
          containerCircles.style.position = 'absolute';
          containerCircles.style.transform = 'translateX(-50%)';
          containerCircles.style.zIndex = '10';
        }
      };
      
      // Ajustar botão imediatamente e depois a cada 500ms para garantir
      adjustCaptureButton();
      const buttonInterval = setInterval(adjustCaptureButton, 500);
      
      // Forçar fullscreen
      document.body.style.overflow = 'hidden';
      
      // Armazenar elementos para restaurar
      window.hiddenElements = elementsToHide;
      window.buttonInterval = buttonInterval;
      
    } else {
      // Restaurar elementos quando fechar
      if (window.hiddenElements) {
        window.hiddenElements.forEach(({ element, originalDisplay, originalVisibility }) => {
          if (element) {
            element.style.display = originalDisplay || '';
            element.style.visibility = originalVisibility || '';
          }
        });
        window.hiddenElements = null;
      }
      
      // Limpar interval do botão
      if (window.buttonInterval) {
        clearInterval(window.buttonInterval);
        window.buttonInterval = null;
      }
      
      document.body.style.overflow = '';
    }

    return () => {
      // Cleanup - restaurar elementos se o componente for desmontado
      if (window.hiddenElements) {
        window.hiddenElements.forEach(({ element, originalDisplay, originalVisibility }) => {
          if (element) {
            element.style.display = originalDisplay || '';
            element.style.visibility = originalVisibility || '';
          }
        });
        window.hiddenElements = null;
      }
      
      // Limpar interval do botão
      if (window.buttonInterval) {
        clearInterval(window.buttonInterval);
        window.buttonInterval = null;
      }
      
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={customStyles}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
    >
      <div style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        background: '#000'
      }}>
        <Camera
          onTakePhoto={handleTakePhoto}
          idealFacingMode={FACING_MODES.ENVIRONMENT}
          isImageMirror={false}
          isFullscreen={true}
          sizeFactor={1}
          imageType="jpg"
          imageCompression={0.97}
        />
      </div>
      {capturedImage && handleConfirm()}
    </Modal>
  );
};

export default ModalCamera;
