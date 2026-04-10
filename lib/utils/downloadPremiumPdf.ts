import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import React from 'react';
import PremiumCertificate, { CertificateData } from '@/components/shared/PremiumCertificate';

export const downloadPremiumCertificate = async (cert: CertificateData, onStart?: () => void, onComplete?: () => void) => {
  if (onStart) onStart();

  try {
    // 1. Create an offscreen wrapper
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '-10000px';
    wrapper.style.width = '1200px';
    wrapper.style.height = '850px';
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.zIndex = '-9999';
    document.body.appendChild(wrapper);

    // 2. Render premium certificate into the DOM explicitly at large width to guarantee desktop layout
    const root = createRoot(wrapper);
    
    // We use a Promise to wait for the component to mount inside the wrapper
    await new Promise<void>((resolve) => {
      flushSync(() => {
        root.render(React.createElement(PremiumCertificate, { cert }));
      });
      // Allow browsers to apply styles and load assets
      setTimeout(resolve, 800);
    });

    const elementToCapture = wrapper.firstElementChild as HTMLElement;

    if (!elementToCapture) {
      console.error('Wrapper innerHTML:', wrapper.innerHTML);
      throw new Error(`DOM failed to mount. Wrapper HTML: ${wrapper.innerHTML}`);
    }

    // Force rendering out before asking for dimensions
    elementToCapture.style.height = 'auto';

    // Wait slightly more for React/Next Image layout shifts to normalize
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Ensure all internal images are fully loaded before capturing
    const images = Array.from(elementToCapture.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Ignore errors to prevent blockage
        });
      })
    );

    // 3. Force explicit styles to bypass any responsive scaling quirks the DOM might enforce in the hide element
    elementToCapture.style.transform = 'none';
    elementToCapture.style.width = '1050px'; 
    elementToCapture.style.maxWidth = 'none'; // Overwrite tailwind max border constraints
    elementToCapture.style.padding = '0'; // Erase any wrapper padding, leaving only the inner border
    elementToCapture.style.margin = '0';
    elementToCapture.style.boxSizing = 'border-box';

    // Get the exact parsed height from the DOM so we don't cut off the bottom
    const contentHeight = elementToCapture.scrollHeight;

    // 4. Capture High-Fidelity Image using native SVG rendering (fixes oklch/Tailwind V4 issues)

    const imgData = await toJpeg(elementToCapture, {
      quality: 0.95,
      pixelRatio: 2, 
      backgroundColor: '#ffffff',
      width: 1050,
      height: contentHeight,
      style: {
        transform: 'none',
        margin: '0',
      }
    });

    // 5. Convert to PDF using the exact real-world dimensions rendered (not forced into rigid A4)
    // Create a precise Landscape PDF that mirrors the rendered aspect ratio perfectly without large white gaps.
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1050, contentHeight]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 1050, contentHeight);
    
    // Save locally skipping browser print queues
    const fileName = `Karmasetu_Premium_${String(cert.certNo || 'cert').replace(/\s/g, '_')}.pdf`;
    pdf.save(fileName);

    // 6. Cleanup
    setTimeout(() => {
      root.unmount();
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
    }, 100);
  } catch (err: unknown) {
    console.error('Failed PDF Capture:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    alert(`PDF Generation failed: ${message}`);
  } finally {
    if (onComplete) onComplete();
  }
};