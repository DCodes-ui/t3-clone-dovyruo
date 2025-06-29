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

  // Ursprüngliche Hilfsfunktion zur Erkennung von mathematischen Bereichen
  const preprocessMath = (fullText) => {
    const patterns = [
      { regex: /\$\$([\s\S]*?)\$\$/g, isDisplay: true },       // $$ ... $$
      { regex: /\\\[([\s\S]*?)\\\]/g, isDisplay: true },       // \[ ... \]
      { regex: /\$([^$\n\r]+?)\$/g, isDisplay: false },          // $ ... $
      { regex: /\\\(([^\\]*?)\\\)/g, isDisplay: false },      // \( ... \)
      // Code-Blöcke (``` ... ```), werden nur berücksichtigt, wenn sie typische Math-Symbole enthalten
      { regex: /```\s*([\s\S]*?)\s*```/g, isDisplay: true, codeBlockMath: true },
      // Einfache Variablenzuweisung (A = B)
      { regex: /\b([A-Z]_?[a-z]*)\s*=\s*([^,\n\r]+)/g, isDisplay: false, variable: true },
    ];

    const allMatches = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(fullText)) !== null) {
        let content = (match[1] || '').trim();

        // Behandlung für Code-Blocks: nur aufnehmen, wenn Formelzeichen enthalten sind
        if (pattern.codeBlockMath) {
          if (!content) continue;
          const hasMathSymbols = /[αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ=+\-*\/\^_{}\\()]/.test(content);
          if (!hasMathSymbols) continue;
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            content,
            isDisplay: true,
            fullMatch: match[0],
            isCodeBlockMath: true
          });
        } else if (pattern.variable && content) {
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            content: match[0],
            isDisplay: false,
            fullMatch: match[0],
            isVariable: true
          });
        } else if (content) {
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            content,
            isDisplay: pattern.isDisplay,
            fullMatch: match[0]
          });
        }
      }
      pattern.regex.lastIndex = 0;
    });

    // Sortieren & Überlappungen entfernen
    allMatches.sort((a, b) => a.start - b.start);
    const filtered = [];
    allMatches.forEach(match => {
      const overlap = filtered.some(m => (match.start < m.end && match.end > m.start));
      if (!overlap) filtered.push(match);
    });
    return filtered;
  };

  // Wieder ursprüngliche Nutzung
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

// CodeBlock-Komponente mit Copy-Button
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="relative my-4 text-sm border rounded-lg bg-muted/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-muted/20 border-b text-xs font-mono select-none">
        <span className="uppercase tracking-wider text-muted-foreground">{language || 'code'}</span>
        <button onClick={handleCopy} className="hover:text-primary transition-colors">
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-auto p-3 whitespace-pre-wrap leading-relaxed"><code>{code}</code></pre>
    </div>
  );
};

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

  const processTextWithMarkdownAndMath = (input) => {
    if (!input || typeof input !== 'string') return input;

    /* -----------------------------------------------------
       1) Text in Blöcke zerlegen (Math, Code, Plain)
    ----------------------------------------------------- */
    const regex = /```[\s\S]*?```|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([^]*?\\\)|\$[^$\n\r]+?\$/g;
    let cursor = 0;
    const blocks = [];

    const pushPlain = (txt) => {
      if (!txt) return;
      blocks.push({ type: 'text', content: txt });
    };

    let match;
    while ((match = regex.exec(input)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;
      pushPlain(input.slice(cursor, start));

      const token = match[0];
      if (token.startsWith('```')) {
        // Sprache extrahieren
        const langMatch = token.match(/^```(\w+)?/);
        const lang = langMatch && langMatch[1] ? langMatch[1] : '';
        const code = token.replace(/^```\w*\s*|\s*```$/g, '');
        blocks.push({ type: 'code', content: code, lang });
      } else if (token.startsWith('$$') || token.startsWith('\\[')) {
        const latex = token.replace(/^\$\$|^\\\[|\$\$$|\\\]$/g, '');
        blocks.push({ type: 'math', content: latex, display: true });
      } else if (token.startsWith('\\(') || token.startsWith('$')) {
        const cleaned = token.replace(/^\\\(|^\$|\\\)$|\$$/g, '');
        blocks.push({ type: 'math', content: cleaned, display: false });
      }
      cursor = end;
    }
    pushPlain(input.slice(cursor));

    /* -----------------------------------------------------
       2) Jeden Block getrennt behandeln
    ----------------------------------------------------- */
    const parts = [];
    let key = 0;

    const formatPlain = (txt) => {
      return txt
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>')           // italic
        .replace(/(^|\n)[ \t]*\*[ \t]+/g, '$1&#8226; ')   // bullets
        .replace(/\n/g, '<br />');
    };

    blocks.forEach((b) => {
      if (b.type === 'text') {
        const html = formatPlain(b.content);
        if (html)
          parts.push(
            <span
              key={key++}
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
      } else if (b.type === 'code') {
        parts.push(
          <CodeBlock key={key++} code={b.content} language={b.lang} />
        );
      } else if (b.type === 'math') {
        parts.push(
          <MathRenderer
            key={key++}
            content={b.content}
            isDisplay={b.display}
          />
        );
      }
    });

    return parts;
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto px-6 py-8"
    >
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
      
      <div className="prose prose-lg max-w-none text-foreground font-proxima">
        <div className="math-content space-y-4 leading-relaxed text-lg">
          {isStreaming && !streamingComplete ? (
            <div className="typewriter-text">
              <FastTypewriterWithMath 
                text={message} 
                onComplete={() => setStreamingComplete(true)}
              />
              <span className="typewriter-cursor ml-1">|</span>
            </div>
          ) : (
            processTextWithMarkdownAndMath(message)
          )}
        </div>
      </div>
    </motion.div>
  );
} 