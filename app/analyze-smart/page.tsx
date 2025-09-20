'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { Loader2, Brain, Zap, TrendingUp, DollarSign } from 'lucide-react';

export default function AnalyzeSmartPage() {
  const [projectId, setProjectId] = useState('');
  const [rawRequest, setRawRequest] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!projectId || !rawRequest) {
      alert('Sélectionnez un projet et collez une requête');
      return;
    }

    setIsLoading(true);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          rawRequest,
          useCache: true
        })
      });

      const data = await response.json();
      setAnalysis(data);

      // Affiche les économies
      if (data.tokensSaved > 0) {
        const costSaved = (data.tokensSaved * 0.00001).toFixed(2);
        console.log(`💰 Économisé: ${data.tokensSaved} tokens (~$${costSaved})`);
      }

    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de l\'analyse');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleRequest = `POST /am/json/realms/root/realms/alpha/authenticate?locale=fr-FR&client_id=fnac&service=FnacAuthParticularUserLogin_NG HTTP/1.1
Host: auth.id.fnac.com
Content-Type: application/json
Cookie: AKA_A2=A; SID=c2325aad-19fa-491e-ab0a-4a555728b49f

{"authId":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...","callbacks":[{"type":"StringAttributeInputCallback","input":[{"name":"IDToken1","value":"damien@gmail.com"}]},{"type":"SelectIdPCallback","providers":["localAuthentication","Google","Paypal","Apple","Facebook"]}]}`;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="h-8 w-8 text-purple-600" />
          Analyse IA Avancée - Business Logic Abuse
        </h1>
        <p className="text-gray-600 mt-2">
          Système d'analyse intelligent avec mémoire isolée par projet et apprentissage continu
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tokens économisés</p>
                  <p className="text-2xl font-bold">{stats.tokensSaved}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cache Hit Rate</p>
                  <p className="text-2xl font-bold">{stats.cacheHitRate}%</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Patterns découverts</p>
                  <p className="text-2xl font-bold">{stats.patternsFound}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                </div>
                <Brain className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulaire */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuration de l'Analyse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Sélectionner un Projet
            </label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un projet..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test-fnac">FNAC (e-commerce)</SelectItem>
                <SelectItem value="test-booking">Booking (réservation)</SelectItem>
                <SelectItem value="test-uber">UberEats (livraison)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Requête HTTP (HAR/Burp format)
            </label>
            <Textarea
              value={rawRequest}
              onChange={(e) => setRawRequest(e.target.value)}
              placeholder={exampleRequest}
              className="font-mono text-xs"
              rows={10}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !projectId || !rawRequest}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyser avec IA
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setRawRequest(exampleRequest)}
            >
              Exemple
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {analysis && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Analyse Claude</span>
                <div className="flex gap-2">
                  {analysis.cacheHit !== 'miss' && (
                    <Badge variant="secondary">
                      Cache {analysis.cacheHit}
                    </Badge>
                  )}
                  <Badge variant={
                    analysis.category === 'auth' ? 'destructive' :
                    analysis.category === 'payment' ? 'default' :
                    'secondary'
                  }>
                    {analysis.category}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm">
                  {analysis.analysis}
                </pre>
              </div>

              {/* Métadonnées */}
              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Patterns détectés:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.patterns?.map((pattern: string) => (
                      <Badge key={pattern} variant="outline" className="text-xs">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Vecteurs d'attaque:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.attackVectors?.slice(0, 5).map((vector: string) => (
                      <Badge key={vector} variant="outline" className="text-xs">
                        {vector}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compression stats */}
              {analysis.compression && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                  <p className="font-medium text-gray-700 mb-1">Optimisation:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-gray-600">Original:</span> {analysis.compression.original} bytes
                    </div>
                    <div>
                      <span className="text-gray-600">Compressé:</span> {analysis.compression.compressed} bytes
                    </div>
                    <div>
                      <span className="text-gray-600">Économie:</span> {analysis.compression.ratio}
                    </div>
                  </div>
                  {analysis.tokensSaved > 0 && (
                    <div className="mt-2 text-green-600 font-medium">
                      💰 {analysis.tokensSaved} tokens économisés (~${(analysis.tokensSaved * 0.00001).toFixed(3)})
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel de Feedback */}
          {analysis.analysis && (
            <FeedbackPanel
              projectId={projectId}
              requestId={analysis.requestId}
              suggestion={analysis.analysis.split('\n')[0]} // Première ligne comme suggestion
              onFeedbackSubmit={(data) => {
                console.log('Feedback submitted:', data);
                // Mettre à jour les stats
                if (data.stats) {
                  setStats(data.stats);
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}