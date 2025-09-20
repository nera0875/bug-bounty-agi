'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Lightbulb, Loader2 } from 'lucide-react';

interface FeedbackPanelProps {
  projectId: string;
  requestId?: string;
  suggestion: string;
  onFeedbackSubmit?: (data: any) => void;
}

export function FeedbackPanel({
  projectId,
  requestId,
  suggestion,
  onFeedbackSubmit
}: FeedbackPanelProps) {
  const [feedbackType, setFeedbackType] = useState<string>('');
  const [userAction, setUserAction] = useState('');
  const [result, setResult] = useState('');
  const [patternDiscovered, setPatternDiscovered] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextSuggestion, setNextSuggestion] = useState('');

  const handleFeedback = async (type: 'success' | 'failure' | 'partial' | 'other') => {
    setFeedbackType(type);

    // Auto-remplir selon le type
    if (type === 'success' && !userAction) {
      setUserAction('J\'ai testé: ' + suggestion.substring(0, 100));
    }
  };

  const submitFeedback = async () => {
    if (!feedbackType || !userAction || !result) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          requestId,
          suggestion,
          userAction,
          result,
          feedbackType,
          patternDiscovered: patternDiscovered || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setNextSuggestion(data.nextSuggestion);
        if (onFeedbackSubmit) {
          onFeedbackSubmit(data);
        }

        // Reset form
        setTimeout(() => {
          setFeedbackType('');
          setUserAction('');
          setResult('');
          setPatternDiscovered('');
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-6 border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Boucle d'Apprentissage IA
        </CardTitle>
        <CardDescription>
          Testez la suggestion et donnez votre feedback pour améliorer l'IA
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Suggestion de Claude */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-1">Suggestion Claude:</p>
          <p className="text-sm text-blue-800">{suggestion}</p>
        </div>

        {/* Boutons de feedback rapide */}
        <div className="flex gap-2">
          <Button
            variant={feedbackType === 'success' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => handleFeedback('success')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Ça marche!
          </Button>
          <Button
            variant={feedbackType === 'failure' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => handleFeedback('failure')}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Échec
          </Button>
          <Button
            variant={feedbackType === 'partial' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => handleFeedback('partial')}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Partiel
          </Button>
        </div>

        {/* Formulaire détaillé */}
        {feedbackType && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Qu'avez-vous testé exactement?
              </label>
              <Textarea
                value={userAction}
                onChange={(e) => setUserAction(e.target.value)}
                placeholder="Ex: J'ai envoyé POST /checkout avec quantity=-1 et coupon=DOUBLE"
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Quel a été le résultat?
              </label>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Ex: Erreur 400 mais le panier s'est vidé et le coupon a été appliqué 2 fois"
                className="mt-1"
                rows={2}
              />
            </div>

            {feedbackType === 'success' && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Pattern découvert (optionnel)
                </label>
                <input
                  type="text"
                  value={patternDiscovered}
                  onChange={(e) => setPatternDiscovered(e.target.value)}
                  placeholder="Ex: double-coupon-race-condition"
                  className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            )}

            <Button
              onClick={submitFeedback}
              disabled={isSubmitting || !userAction || !result}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi du feedback...
                </>
              ) : (
                'Soumettre le Feedback'
              )}
            </Button>
          </div>
        )}

        {/* Prochaine suggestion */}
        {nextSuggestion && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-900 mb-1">
              Prochaine étape suggérée:
            </p>
            <p className="text-sm text-green-800">{nextSuggestion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}