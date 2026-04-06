import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle, AlertCircle, TrendingUp, Mail, Phone, Eye, Zap, Shield, BarChart3 } from 'lucide-react';

const AuditTool = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', url: '' });
  const resultsRef = useRef(null);

  const normalizeUrl = (inputUrl) => {
    if (!inputUrl) return '';
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      return 'https://' + inputUrl;
    }
    return inputUrl;
  };

  const getScoreColor = (score) => {
    if (score < 50) return 'text-red-500';
    if (score < 80) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getScoreBgColor = (score) => {
    if (score < 50) return 'from-red-500/10 to-red-500/5';
    if (score < 80) return 'from-yellow-500/10 to-yellow-500/5';
    return 'from-green-500/10 to-green-500/5';
  };

  const handleAudit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Por favor, ingresa una URL válida');
      return;
    }

    setError('');
    setLoading(true);
    setResults(null);
    setSubmitted(false);

    const normalizedUrl = normalizeUrl(url);

    try {
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&category=performance&category=seo&category=accessibility&category=best-practices&strategy=mobile`;

      let response;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        response = await fetch(apiUrl, { method: 'GET' });
        if (response.status === 429 && retries < maxRetries) {
          retries++;
          await new Promise(r => setTimeout(r, 3000 * retries));
          continue;
        }
        break;
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('El servicio está ocupado. Espera 30 segundos y vuelve a intentarlo.');
        }
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || 'No pudimos analizar este sitio. Verifica la URL.';
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (!data.lighthouseResult) {
        throw new Error('No se pudo obtener los datos de análisis.');
      }

      const lighthouse = data.lighthouseResult;
      const categories = lighthouse.categories;

      const performanceScore = Math.round((categories.performance?.score || 0) * 100);
      const seoScore = Math.round((categories.seo?.score || 0) * 100);
      const accessibilityScore = Math.round((categories.accessibility?.score || 0) * 100);
      const bestPracticesScore = Math.round((categories['best-practices']?.score || 0) * 100);

      const isHttps = normalizedUrl.startsWith('https');
      const faviconUrl = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(normalizedUrl).hostname}`;

      const allScores = [performanceScore, seoScore, accessibilityScore, bestPracticesScore];
      const aiReadinessScore = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 0.85);

      const audits = lighthouse.audits || {};
      const issues = [];

      const criticalAudits = [
        'largest-contentful-paint',
        'cumulative-layout-shift',
        'first-input-delay',
        'meta-description',
        'robots-txt',
        'color-contrast'
      ];

      criticalAudits.forEach((auditId) => {
        const audit = audits[auditId];
        if (audit && audit.score < 0.8) {
          issues.push({
            title: audit.title || auditId,
            description: audit.description || '',
            severity: audit.score < 0.5 ? 'critical' : 'warning'
          });
        }
      });

      const quickWins = [
        {
          title: 'Optimizar imágenes',
          description: 'Comprimir y servir en formato WebP puede mejorar rendimiento hasta 40%',
          impact: 'Alto'
        },
        {
          title: 'Implementar caché',
          description: 'Activar caché del navegador reduce tiempos de carga significativamente',
          impact: 'Alto'
        },
        {
          title: isHttps ? 'SSL/TLS certificado' : 'Migrar a HTTPS',
          description: isHttps ? 'Ya tienes certificado HTTPS - excelente para SEO' : 'HTTPS es obligatorio para SEO moderno',
          impact: 'Crítico'
        },
        {
          title: 'Structured Data (Schema.org)',
          description: 'Agregar datos estructurados mejora visibilidad en búsquedas y IA',
          impact: 'Muy Alto'
        }
      ];

      setResults({
        url: normalizedUrl,
        faviconUrl,
        isHttps,
        scores: {
          performance: performanceScore,
          seo: seoScore,
          accessibility: accessibilityScore,
          bestPractices: bestPracticesScore
        },
        aiReadinessScore,
        issues: issues.slice(0, 5),
        quickWins,
        timestamp: new Date().toLocaleDateString('es-ES')
      });

      setFormData(prev => ({ ...prev, url: normalizedUrl }));

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err) {
      setError(err.message || 'Error al analizar la web. Intenta con otra URL.');
      console.error('Audit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Email requerido');
      return;
    }

    // Send lead data to your backend or email service
    // For now, we use a simple mailto fallback + Formspree/Getform integration
    // Replace YOUR_FORM_ID with your actual Formspree form ID when ready
    try {
      const formEndpoint = import.meta.env.VITE_FORM_ENDPOINT;

      if (formEndpoint) {
        // If you have a form endpoint configured (Formspree, Getform, etc.)
        await fetch(formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            email: formData.email,
            telefono: formData.telefono,
            url_analizada: formData.url,
            ai_readiness_score: results?.aiReadinessScore,
            timestamp: new Date().toISOString()
          })
        });
      } else {
        // Fallback: open mailto with the data
        const subject = encodeURIComponent(`Nuevo lead: ${formData.nombre} - Score ${results?.aiReadinessScore}/100`);
        const body = encodeURIComponent(
          `Nombre: ${formData.nombre}\n` +
          `Email: ${formData.email}\n` +
          `Teléfono: ${formData.telefono}\n` +
          `URL: ${formData.url}\n` +
          `AI Score: ${results?.aiReadinessScore}/100\n` +
          `Fecha: ${new Date().toLocaleString('es-ES')}`
        );
        window.open(`mailto:antonio@bitkraft.vc?subject=${subject}&body=${body}`, '_blank');
      }
    } catch (err) {
      console.error('Form submission error:', err);
    }

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ nombre: '', email: '', telefono: '', url: formData.url });
  };

  const AnimatedScore = ({ score, label, icon: Icon }) => {
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
      if (results) {
        let current = 0;
        const interval = setInterval(() => {
          current += Math.ceil(score / 20);
          if (current >= score) {
            setDisplayScore(score);
            clearInterval(interval);
          } else {
            setDisplayScore(current);
          }
        }, 30);
        return () => clearInterval(interval);
      }
    }, [results, score]);

    return (
      <div className={`flex flex-col items-center p-4 rounded-lg bg-gradient-to-br ${getScoreBgColor(displayScore)}`}>
        <Icon className="w-5 h-5 mb-2 text-gray-600" />
        <span className={`text-3xl font-bold ${getScoreColor(displayScore)}`}>{displayScore}</span>
        <span className="text-sm text-gray-600 mt-1">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white py-12 shadow-xl">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-8 h-8" />
            <h1 className="text-4xl md:text-5xl font-bold">PYME Digital Audit</h1>
          </div>
          <p className="text-blue-100 text-lg">Análisis instantáneo de tu web para IA y búsqueda orgánica</p>
          <p className="text-blue-200 text-sm mt-2">Herramienta gratuita</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 mb-12">
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-100">
          <form onSubmit={handleAudit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="ejemplo.com o https://ejemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none text-gray-800 placeholder-gray-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-950 hover:to-blue-900 text-white font-semibold rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg"
              >
                <Search className="w-5 h-5" />
                {loading ? 'Analizando...' : 'Analizar'}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Loading Animation */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-900 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Analizando tu web...</p>
          <p className="text-sm text-gray-500 mt-2">Esto puede tomar unos segundos</p>
        </div>
      )}

      {/* Results Section */}
      {results && !loading && (
        <div ref={resultsRef} className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
          {/* Main Score */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <img
                  src={results.faviconUrl}
                  alt="favicon"
                  className="w-16 h-16 rounded-lg shadow-md"
                  onError={(e) => (e.target.style.display = 'none')}
                />
              </div>
              <p className="text-sm text-gray-500 mb-2">URL analizada</p>
              <p className="text-gray-700 font-mono text-sm break-all mb-6">{results.url}</p>

              <h2 className="text-2xl font-bold text-gray-800 mb-8">Puntuación de Preparación IA</h2>

              <div className="flex items-center justify-center mb-8">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={results.aiReadinessScore < 50 ? '#ef4444' : results.aiReadinessScore < 80 ? '#eab308' : '#22c55e'}
                      strokeWidth="8"
                      strokeDasharray={`${(results.aiReadinessScore / 100) * 314} 314`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-bold ${getScoreColor(results.aiReadinessScore)}`}>
                      {results.aiReadinessScore}
                    </span>
                    <span className="text-sm text-gray-600">/100</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                {results.aiReadinessScore < 50
                  ? 'Tu web necesita optimización urgente para IA'
                  : results.aiReadinessScore < 80
                  ? 'Buen progreso, pero hay oportunidades de mejora'
                  : 'Excelente preparación para IA y búsqueda'}
              </p>

              {results.isHttps && (
                <div className="flex items-center justify-center gap-2 text-green-600 text-sm mt-4">
                  <CheckCircle className="w-4 h-4" />
                  <span>SSL/HTTPS activo</span>
                </div>
              )}
            </div>
          </div>

          {/* Individual Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatedScore score={results.scores.performance} label="Rendimiento" icon={Zap} />
            <AnimatedScore score={results.scores.seo} label="SEO" icon={TrendingUp} />
            <AnimatedScore score={results.scores.accessibility} label="Accesibilidad" icon={Eye} />
            <AnimatedScore score={results.scores.bestPractices} label="Mejores Prácticas" icon={Shield} />
          </div>

          {/* Issues Found */}
          {results.issues.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" />
                Problemas encontrados
              </h3>
              <div className="space-y-3">
                {results.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-4 border-l-4 border-red-500 bg-red-50 rounded flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800">{issue.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GEO Readiness */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg p-8 border border-orange-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-600" />
              Preparación para IA y Búsqueda Geolocalizada
            </h3>
            <p className="text-gray-700 mb-4">
              Tu sitio aún <strong>no está completamente optimizado</strong> para ser encontrado por sistemas de IA y búsqueda local.
              Esto es una <strong>oportunidad de crecimiento importante</strong>.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Agregar datos estructurados (Schema.org)</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Crear perfil en Google Business Profile</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Implementar meta datos locales y geolocalización</span>
              </div>
            </div>
          </div>

          {/* Quick Wins */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Quick Wins - Mejoras rápidas
            </h3>
            <div className="grid gap-4">
              {results.quickWins.map((win, idx) => (
                <div key={idx} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{win.title}</h4>
                    <span className="text-xs font-bold px-2 py-1 bg-green-200 text-green-800 rounded">
                      {win.impact}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{win.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl shadow-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">¿Quieres el análisis completo?</h3>
            <p className="text-blue-100 mb-6">
              Este análisis es solo el inicio. Te ofrecemos una <strong>llamada gratuita de 15 minutos</strong> para diseñar tu estrategia digital personalizada.
            </p>

            {submitted ? (
              <div className="bg-green-500 text-white p-6 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">¡Gracias! Te contactaremos en menos de 24 horas.</p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Tu nombre"
                    value={formData.nombre}
                    onChange={handleFormChange}
                    required
                    className="px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:border-white"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Tu email"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                    className="px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:border-white"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    name="telefono"
                    placeholder="Teléfono (opcional)"
                    value={formData.telefono}
                    onChange={handleFormChange}
                    className="px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    name="url"
                    placeholder="URL analizada"
                    value={formData.url}
                    disabled
                    className="px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-blue-200 focus:outline-none opacity-75"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-white text-blue-900 font-bold rounded-lg hover:bg-blue-50 transition-all shadow-lg"
                >
                  Agendar llamada gratuita
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-8 text-gray-600 text-sm bg-gradient-to-t from-gray-100 to-transparent">
        <p>Consultoría Digital para PYMEs</p>
      </div>
    </div>
  );
};

export default AuditTool;
