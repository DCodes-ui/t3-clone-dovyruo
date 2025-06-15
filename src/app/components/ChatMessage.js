'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';


const MathRenderer = ({ content = '', isDisplay = false, className = '' }) => {
  const containerRef = useRef(null);
  const [isClient, setIsClient] = useState(false);


  const loadMathJax = () => {
    return new Promise((resolve) => {
      if (window.MathJax) {
        resolve(window.MathJax);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
      script.async = true;
      script.onload = () => resolve(window.MathJax);
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current || !content.trim()) return;


    const renderMath = async () => {
      const mj = await loadMathJax();
      if (!mj) return;


      containerRef.current.innerHTML = isDisplay ? `$$${content}$$` : `\\(${content}\\)`;


      try {
        await mj.typesetPromise([containerRef.current]);
      } catch (err) {
        console.error('MathJax typeset error', err);
      }
    };

    renderMath();
  }, [isClient, content, isDisplay]);

  if (!isClient) {
    return (
      <span className={`inline-block bg-muted animate-pulse rounded ${isDisplay ? 'h-6 w-24 my-2' : 'h-4 w-12'}`}></span>
    );
  }

  return (
    <span
      ref={containerRef}
      className={`${className} ${isDisplay ? 'my-4 block text-center' : 'inline-block align-middle mx-1'}`}
    />
  );
};


const FastTypewriterWithMath = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mathElements, setMathElements] = useState([]);

  const CHUNK_SIZE = 12;      
  const FRAME_SPEED = 5;     


  const preprocessMath = (fullText) => {
    const elements = [];
    let lastIndex = 0;
    

    const patterns = [
      { regex: /\$\$([\s\S]*?)\$\$/g, isDisplay: true },      
      { regex: /\\\[([\s\S]*?)\\\]/g, isDisplay: true },      
      { regex: /\$([^$\n\r]+?)\$/g, isDisplay: false },      
      { regex: /\\\(([^\\]*?)\\\)/g, isDisplay: false },      
      { regex: /```\s*([\s\S]*?)\s*```/g, isDisplay: true, codeBlock: true },
    ];
    
    const allMatches = [];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(fullText)) !== null) {
        const content = match[1]?.trim() || '';
        if (content) {
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            content: content,
            isDisplay: pattern.isDisplay,
            fullMatch: match[0]
          });
        }
      }
      pattern.regex.lastIndex = 0; 
    });
    
    
    allMatches.sort((a, b) => a.start - b.start);
    
    
    const filteredMatches = [];
    allMatches.forEach(match => {
      const hasOverlap = filteredMatches.some(existing => 
        (match.start >= existing.start && match.start < existing.end) ||
        (match.end > existing.start && match.end <= existing.end)
      );
      if (!hasOverlap) {
        filteredMatches.push(match);
      }
    });
    
    return filteredMatches;
  };

  const mathMatches = preprocessMath(text);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        const nextIndex = Math.min(currentIndex + CHUNK_SIZE, text.length);
        setDisplayedText(prev => prev + text.slice(currentIndex, nextIndex));
        setCurrentIndex(nextIndex);
      }, FRAME_SPEED);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && currentIndex < text.length) {
        setDisplayedText(text);
        setCurrentIndex(text.length);
        if (onComplete) onComplete();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [currentIndex, text, onComplete]);

  
  const renderTextWithMath = () => {
    if (!displayedText) return null;
    
    const parts = [];
    let lastIndex = 0;
    let partKey = 0;

    
    const visibleMatches = mathMatches.filter(match => match.end <= displayedText.length);

    visibleMatches.forEach((mathMatch) => {
      
      if (mathMatch.start > lastIndex) {
        const beforeText = displayedText.slice(lastIndex, mathMatch.start);
        if (beforeText) {
          const formattedText = beforeText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
            .replace(/(^|\n)\s*\*\s+/g, '$1&#8226; ')
            .replace(/\n/g, '<br />');
          parts.push(
            <span 
              key={partKey++}
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          );
        }
      }

      
      parts.push(
        <MathRenderer 
          key={partKey++}
          content={mathMatch.content}
          isDisplay={mathMatch.isDisplay}
          className="math-formula"
        />
      );

      lastIndex = mathMatch.end;
    });

    
    if (lastIndex < displayedText.length) {
      const remainingText = displayedText.slice(lastIndex);
      if (remainingText) {
        const formattedText = remainingText
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
          .replace(/(^|\n)\s*\*\s+/g, '$1&#8226; ')
          .replace(/\n/g, '<br />');
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
          __html: displayedText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
            .replace(/(^|\n)\s*\*\s+/g, '$1&#8226; ')
            .replace(/\n/g, '<br />')
        }}
      />
    );
  };

  return (
    <div className="typewriter-container">
      {renderTextWithMath()}
    </div>
  );
};


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
  const [copied, setCopied] = useState(false);

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

  const processTextWithMarkdownAndMath = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    const parts = [];
    let currentIndex = 0;
    let partKey = 0;
    
    const mathPatterns = [
      { regex: /\$\$([\s\S]*?)\$\$/g, isDisplay: true },      
      { regex: /\\\[([\s\S]*?)\\\]/g, isDisplay: true },      
      { regex: /\$([^$\n\r]+?)\$/g, isDisplay: false },      
      { regex: /\\\(([^\\]*?)\\\)/g, isDisplay: false },      
      
      // Code-Block-ähnliche Math (```...```)
      { regex: /```\s*([\s\S]*?)\s*```/g, isDisplay: true, codeBlockMath: true },   // ```...```
      
      // Einzelne griechische Buchstaben und Symbole erkennen
      { regex: /\b([A-Z]_?[a-z]*)\s*=\s*([^,\n\r]+)/g, isDisplay: false, variable: true }, // Variablendefinitionen
    ];
    
    const allMatches = [];
    
    // Alle Pattern durchsuchen
    mathPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        let content = (match[1] || '').trim();
        
        // Spezielle Behandlung für Code-Block-Math
        if (pattern.codeBlockMath && content) {
          // Prüfen ob es mathematische Symbole enthält
          const hasMathSymbols = /[αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ=+\-*\/\^_{}\(\)\\]/.test(content);
          if (hasMathSymbols) {
            // Als Display-Math behandeln
            allMatches.push({
              start: match.index,
              end: match.index + match[0].length,
              content: content,
              isDisplay: true,
              fullMatch: match[0],
              isCodeBlockMath: true
            });
          }
        } else if (pattern.variable && content) {
          // Variablendefinitionen als Inline-Math
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            content: match[0], // Ganze Zeile als Math
            isDisplay: false,
            fullMatch: match[0],
            isVariable: true
          });
        } else if (content) {
          // Standard Math-Pattern
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            content: content,
            isDisplay: pattern.isDisplay,
            fullMatch: match[0]
          });
        }
      }
      pattern.regex.lastIndex = 0;
    });
    
    // Nach Position sortieren und Überlappungen entfernen
    allMatches.sort((a, b) => a.start - b.start);
    const filteredMatches = [];
    allMatches.forEach(match => {
      const hasOverlap = filteredMatches.some(existing => 
        (match.start >= existing.start && match.start < existing.end) ||
        (match.end > existing.start && match.end <= existing.end)
      );
      if (!hasOverlap) {
        filteredMatches.push(match);
      }
    });
    
    // Text mit Mathematik verarbeiten
    filteredMatches.forEach((mathMatch) => {
      // Text vor der Formel
      if (mathMatch.start > currentIndex) {
        const beforeText = text.slice(currentIndex, mathMatch.start);
        if (beforeText.trim()) {
          const formattedText = beforeText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
            .replace(/(^|\n)\s*\*\s+/g, '$1&#8226; ')
            .replace(/\n/g, '<br />');
          parts.push(
            <span 
              key={partKey++} 
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
          );
        }
      }
      
      // Mathematische Formel rendern
      parts.push(
        <MathRenderer 
          key={partKey++}
          content={mathMatch.content}
          isDisplay={mathMatch.isDisplay}
          className="processed-math"
        />
      );
      
      currentIndex = mathMatch.end;
    });
    
    // Restlichen Text hinzufügen
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      if (remainingText.trim()) {
        const formattedText = remainingText
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
          .replace(/(^|\n)\s*\*\s+/g, '$1&#8226; ')
          .replace(/\n/g, '<br />');
        parts.push(
          <span 
            key={partKey++} 
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
      }
    }
    
    // Fallback: Einfache Formatierung wenn keine Math-Formeln gefunden
    if (parts.length === 0) {
      const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
        .replace(/(^|\n)\s*\*\s+/g, '$1&#8226; ')
        .replace(/\n/g, '<br />');
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
          <div className="rounded-2xl px-6 py-4 bg-primary/20 text-foreground ml-auto">
            <div className="text-base leading-relaxed whitespace-pre-wrap text-foreground font-proxima">
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
              onClick={() => {
                if (onCopy) onCopy(message);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="p-2 bg-card hover:bg-accent border border-border rounded-lg shadow-lg transition-colors"
              title="Copy"
            >
              {copied ? (
                <motion.svg
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="copy"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </motion.svg>
              )}
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
      <div className="prose prose-lg max-w-none text-foreground font-proxima">
        <div className="math-content space-y-4 leading-relaxed text-lg">
          {isStreaming && !streamingComplete ? (
            // Während Streaming: Zeige ultra-schnellen typewriter-Effekt mit Formatierung
            <div className="typewriter-text">
              <FastTypewriterWithMath 
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