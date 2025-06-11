'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamische Importe für KaTeX um SSR-Probleme zu vermeiden
const InlineMath = dynamic(() => import('react-katex').then(mod => mod.InlineMath), {
  ssr: false,
  loading: () => <span className="animate-pulse bg-muted h-4 w-16 inline-block rounded"></span>
});

const BlockMath = dynamic(() => import('react-katex').then(mod => mod.BlockMath), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-8 w-32 mx-auto rounded"></div>
});

// KaTeX CSS dynamisch laden
if (typeof window !== 'undefined') {
  import('katex/dist/katex.min.css');
}

// Intelligente LaTeX-Box-Rendering Komponente
const LaTeXRenderer = ({ formula, isDisplay = false }) => {
  if (!isClient) {
    return (
      <div className={`latex-placeholder ${isDisplay ? 'display' : 'inline'}`}>
        <div className="animate-pulse bg-muted-foreground/20 h-6 w-24 rounded"></div>
      </div>
    );
  }

  try {
    if (isDisplay) {
      return (
        <div className="latex-box-display my-6">
          <BlockMath math={formula} />
        </div>
      );
    } else {
      return (
        <span className="latex-box-inline mx-1">
          <InlineMath math={formula} />
        </span>
      );
    }
  } catch (error) {
    return (
      <span className="latex-error text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-sm">
        LaTeX Error: {isDisplay ? `$$${formula}$$` : `$${formula}$`}
      </span>
    );
  }
};

// Ultra-schneller Typewriter mit sofortigem LaTeX-Rendering
const FastTypewriterWithLatex = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [renderedParts, setRenderedParts] = useState([]);

  // LaTeX-Formeln vorab erkennen und vorrendern
  const preprocessLatex = (fullText) => {
    const parts = [];
    let lastIndex = 0;
    
    // Display Math: $$...$$ und \[...\]
    const displayMathRegex = /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g;
    const inlineMathRegex = /(\$([^$\n\r]+?)\$|\\\(([^\\]*?)\\\))/g;
    
    const allMatches = [];
    
    // Display Math sammeln
    let match;
    while ((match = displayMathRegex.exec(fullText)) !== null) {
      const content = (match[2] || match[3] || '').trim();
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: content,
        isDisplay: true,
        fullMatch: match[0]
      });
    }
    
    // Inline Math sammeln
    displayMathRegex.lastIndex = 0;
    while ((match = inlineMathRegex.exec(fullText)) !== null) {
      const isInsideDisplay = allMatches.some(dm => 
        match.index >= dm.start && match.index < dm.end
      );
      
      if (!isInsideDisplay) {
        const content = (match[2] || match[3] || '').trim();
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: content,
          isDisplay: false,
          fullMatch: match[0]
        });
      }
    }
    
    allMatches.sort((a, b) => a.start - b.start);
    return allMatches;
  };

  const latexMatches = preprocessLatex(text);

  useEffect(() => {
    if (currentIndex < text.length) {
      let speed = 4;
      const currentChar = text[currentIndex];
      
      if (currentChar === ' ') speed = 2;
      else if (['.', ',', '!', '?', ':', ';'].includes(currentChar)) speed = 8;
      else if (currentChar === '\n') speed = 3;

      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      setTimeout(onComplete, 100);
    }
  }, [currentIndex, text, onComplete]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  // Text mit sofortigem LaTeX-Rendering verarbeiten
  const renderTextWithLatex = () => {
    if (!displayedText) return null;
    
    const parts = [];
    let lastIndex = 0;
    let partKey = 0;

    // Nur die LaTeX-Matches verarbeiten, die bereits im displayedText enthalten sind
    const visibleMatches = latexMatches.filter(match => match.end <= displayedText.length);

    visibleMatches.forEach((latexMatch) => {
      // Text vor der Formel
      if (latexMatch.start > lastIndex) {
        const beforeText = displayedText.slice(lastIndex, latexMatch.start);
        if (beforeText) {
          const formattedText = beforeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          parts.push(
            <span 
              key={partKey++}
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          );
        }
      }

      // LaTeX-Formel als gerenderte Box
      parts.push(
        <LaTeXRenderer 
          key={partKey++}
          formula={latexMatch.content}
          isDisplay={latexMatch.isDisplay}
        />
      );

      lastIndex = latexMatch.end;
    });

    // Restlicher Text
    if (lastIndex < displayedText.length) {
      const remainingText = displayedText.slice(lastIndex);
      if (remainingText) {
        const formattedText = remainingText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        parts.push(
          <span 
            key={partKey++}
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
      }
    }

    return parts.length > 0 ? parts : (
      <span 
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ 
          __html: displayedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
        }}
      />
    );
  };

  return renderTextWithLatex();
};

// Loading Animation Komponente
const TypingIndicator = ({ model }) => {
  const getProviderIcon = (modelId) => {
    if (modelId?.includes('gemini')) return '/gemini_icon.png';
    if (modelId?.includes('o4') || modelId?.includes('4o')) return '/openai-icon.png';
    if (modelId?.includes('claude')) return '/anthropic-icon.png';
    return '/gemini_icon.png';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto px-6 py-8"
    >
      {/* Modell-Info */}
      {model && (
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Image
              src={getProviderIcon(model)}
              alt="Provider"
              width={16}
              height={16}
              className="w-4 h-4 object-contain"
            />
            {model}
          </span>
        </div>
      )}
      
      {/* Typing Animation */}
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <motion.div
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0
            }}
          />
          <motion.div
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.2
            }}
          />
          <motion.div
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.4
            }}
          />
        </div>
        <span className="text-muted-foreground text-sm ml-3">
          Generating response...
        </span>
      </div>
    </motion.div>
  );
}

export default ChatMessage;
export { TypingIndicator };

function ChatMessage({ message, isUser = false, model, priority, isStreaming = false, onRetry, onEdit, onCopy }) {
  const [copiedCode, setCopiedCode] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [streamingComplete, setStreamingComplete] = useState(!isStreaming);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getProviderIcon = (modelId) => {
    if (modelId?.includes('gemini')) return '/gemini_icon.png';
    if (modelId?.includes('o4') || modelId?.includes('4o')) return '/openai-icon.png';
    if (modelId?.includes('claude')) return '/anthropic-icon.png';
    return '/gemini_icon.png'; // Default fallback
  };

  const copyToClipboard = async (text, codeId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Funktion zur Verarbeitung von Text mit Markdown-Formatierung und LaTeX-Formeln
  const processTextWithMarkdownAndMath = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Schritt 1: Text-Formatierung (Markdown-ähnlich)
    const formatText = (textSegment) => {
      if (!textSegment) return textSegment;
      
      // **Bold Text** formatieren
      textSegment = textSegment.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // *Italic Text* formatieren
      textSegment = textSegment.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
      
      // Zeilienumbrüche korrekt handhaben
      textSegment = textSegment.replace(/\n/g, '<br />');
      
      return textSegment;
    };
    

    
    const parts = [];
    let currentIndex = 0;
    let partKey = 0;
    
    // Verbesserte Regex für verschiedene Math-Formate
    // Display Math: $$...$$ und \[...\]
    // Inline Math: $...$ und \(...\)
    const displayMathRegex = /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g;
    const inlineMathRegex = /(\$([^$\n\r]+?)\$|\\\(([^\\]*?)\\\))/g;
    
    // Erstelle Array mit allen Math-Matches
    const mathMatches = [];
    
    // Display Math finden
    let match;
    while ((match = displayMathRegex.exec(text)) !== null) {
      // match[2] für $$...$$ oder match[3] für \[...\]
      const content = (match[2] || match[3] || '').trim();
      mathMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: content,
        isDisplay: true,
        fullMatch: match[0]
      });
    }
    
    // Inline Math finden (aber nur außerhalb von Display Math)
    displayMathRegex.lastIndex = 0; // Reset regex
    while ((match = inlineMathRegex.exec(text)) !== null) {
      // Prüfen ob dieser Match innerhalb eines Display Math liegt
      const isInsideDisplay = mathMatches.some(dm => 
        match.index >= dm.start && match.index < dm.end
      );
      
      if (!isInsideDisplay) {
        // match[2] für $...$ oder match[3] für \(...\)
        const content = (match[2] || match[3] || '').trim();
        mathMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: content,
          isDisplay: false,
          fullMatch: match[0]
        });
      }
    }
    
    // Sortiere Matches nach Position
    mathMatches.sort((a, b) => a.start - b.start);
    
    
    
    // Verarbeite Text mit Formeln
    mathMatches.forEach((mathMatch, index) => {
      // Text vor der Formel hinzufügen (mit Markdown-Formatierung)
      if (mathMatch.start > currentIndex) {
        const beforeText = text.slice(currentIndex, mathMatch.start);
        if (beforeText.trim()) {
          const formattedText = formatText(beforeText);
          parts.push(
            <span 
              key={partKey++} 
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          );
        }
      }
      
      try {
        if (isClient) {
          if (mathMatch.isDisplay) {
            parts.push(
              <div key={partKey++} className="my-8 w-full">
                <BlockMath math={mathMatch.content} />
              </div>
            );
          } else {
            parts.push(
              <span key={partKey++}>
                <InlineMath math={mathMatch.content} />
              </span>
            );
          }
        } else {
          // Fallback während SSR
          if (mathMatch.isDisplay) {
            parts.push(
              <div key={partKey++} className="my-8 w-full text-center bg-muted p-4 rounded">
                <div className="animate-pulse bg-muted-foreground/20 h-8 w-48 mx-auto rounded"></div>
              </div>
            );
          } else {
            parts.push(
              <span key={partKey++} className="inline-block bg-muted px-2 py-1 rounded">
                <div className="animate-pulse bg-muted-foreground/20 h-4 w-16 rounded"></div>
              </span>
            );
          }
        }
      } catch (error) {
        console.error('KaTeX render error:', error, 'for:', mathMatch.content);
        parts.push(
          <span key={partKey++} className="text-red-500 bg-red-50 dark:bg-red-900/20 px-1 rounded">
            Error: {mathMatch.fullMatch}
          </span>
        );
      }
      
      currentIndex = mathMatch.end;
    });
    
    // Restlichen Text hinzufügen (mit Markdown-Formatierung)
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      if (remainingText.trim()) {
        const formattedText = formatText(remainingText);
        parts.push(
          <span 
            key={partKey++} 
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
      }
    }
    
    // Fallback: wenn keine Math-Formeln gefunden wurden, formatiere den gesamten Text
    if (parts.length === 0) {
      const formattedText = formatText(text);
      return (
        <span 
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      );
    }
    
    return parts;
  };

  // Für User-Nachrichten: normale Chat-Blase mit Hover-Actions
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex gap-4 p-6 justify-end group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="max-w-2xl text-right">
          <div className="rounded-2xl px-6 py-4 bg-primary text-primary-foreground ml-auto">
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground">
              {message}
            </div>
          </div>
          
          {/* Hover Actions - unter der Nachricht horizontal */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : -10 }}
            transition={{ duration: 0.2 }}
            className="flex justify-end gap-2 mt-2 z-10"
          >
            <button
              onClick={() => onRetry && onRetry(message)}
              className="p-2 bg-card hover:bg-accent border border-border rounded-lg shadow-lg transition-colors"
              title="Retry"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => onEdit && onEdit(message)}
              className="p-2 bg-card hover:bg-accent border border-border rounded-lg shadow-lg transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => onCopy && onCopy(message)}
              className="p-2 bg-card hover:bg-accent border border-border rounded-lg shadow-lg transition-colors"
              title="Copy"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </motion.div>
        </div>
        
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            U
          </div>
        </div>
      </motion.div>
    );
  }

  // Für AI-Antworten: direkt auf der Seite ohne Blase
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto px-6 py-8"
    >
      {/* Modell-Info oben */}
      {(model || priority) && (
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          {model && (
            <span className="flex items-center gap-2">
              <Image
                src={getProviderIcon(model)}
                alt="Provider"
                width={16}
                height={16}
                className="w-4 h-4 object-contain"
              />
              {model}
            </span>
          )}
          {priority && priority !== 'High' && (
            <span className="px-2 py-1 bg-accent rounded text-accent-foreground">
              {priority}
            </span>
          )}
        </div>
      )}
      
      {/* Text-Inhalt mit Markdown und LaTeX-Formeln */}
      <div className="prose prose-lg max-w-none text-foreground">
        <div className="math-content space-y-4 leading-relaxed text-lg">
          {isStreaming && !streamingComplete ? (
            // Während Streaming: Zeige ultra-schnellen typewriter-Effekt mit Formatierung
            <div className="typewriter-text">
              <FastTypewriterWithLatex 
                text={message} 
                onComplete={() => setStreamingComplete(true)}
              />
              <span className="typewriter-cursor ml-1">|</span>
            </div>
          ) : (
            // Nach Streaming: Zeige vollständig formatierte Nachricht
            processTextWithMarkdownAndMath(message)
          )}
        </div>
      </div>
    </motion.div>
  );
} 