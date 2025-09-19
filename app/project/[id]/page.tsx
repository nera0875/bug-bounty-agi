'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { parseHarBurpRequest } from '@/lib/parser'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Upload, Send, CheckCircle, XCircle, RefreshCw,
  Target, Activity, ArrowLeft, Zap, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  created_at: string
}

interface Session {
  id: string
  project_id: string
  claude_history: any[]
  findings: any[]
  created_at: string
  updated_at: string
}

interface Request {
  id: string
  project_id: string
  raw_text: string
  tags: string[]
  signature: string
  method: string
  endpoint: string
  params: any
  created_at: string
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [rawInput, setRawInput] = useState('')
  const [claudeChat, setClaudeChat] = useState<string[]>([])
  const [findings, setFindings] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentSuggestion, setCurrentSuggestion] = useState<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadProject()
    loadOrCreateSession()
    loadRequests()
  }, [projectId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [claudeChat])

  const loadProject = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (data) {
      setProject(data)
    }
  }

  const loadOrCreateSession = async () => {
    // Check existing session
    let { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) {
      // Create new session
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({ project_id: projectId })
        .select()
        .single()

      data = newSession
    }

    if (data) {
      setSession(data)
      setClaudeChat(data.claude_history || [])
      setFindings(data.findings || [])
    }
  }

  const loadRequests = async () => {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setRequests(data)
    }
  }

  const analyzeRequest = async () => {
    if (!rawInput.trim()) return

    setIsAnalyzing(true)
    try {
      // Parse the request
      const parsed = parseHarBurpRequest(rawInput)

      // Save request to database
      const { data: savedRequest, error } = await supabase
        .from('requests')
        .insert({
          project_id: projectId,
          raw_text: rawInput,
          tags: parsed.tags,
          signature: parsed.signature,
          method: parsed.method,
          endpoint: parsed.endpoint,
          params: parsed.params
        })
        .select()
        .single()

      if (error) throw error

      // Get embedding and analyze
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sessionId: session?.id,
          requestId: savedRequest.id,
          rawText: rawInput,
          parsedRequest: parsed
        })
      })

      const result = await response.json()

      if (result.error) throw new Error(result.error)

      // Update UI
      setClaudeChat([...claudeChat, result.suggestion])
      setCurrentSuggestion(result)

      // Update session in database
      if (session) {
        await supabase
          .from('sessions')
          .update({
            claude_history: [...claudeChat, result.suggestion],
            findings: result.findings ? [...findings, ...result.findings] : findings,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id)
      }

      setRawInput('')
      loadRequests()
      toast.success('Requête analysée avec succès')

    } catch (error) {
      console.error('Analyze error:', error)
      toast.error('Erreur lors de l\'analyse')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const provideFeedback = async (feedback: 'success' | 'error' | 'partial') => {
    if (!currentSuggestion || !session) return

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          feedback,
          suggestion: currentSuggestion
        })
      })

      const result = await response.json()

      if (result.newSuggestion) {
        setClaudeChat([...claudeChat, result.newSuggestion])
        setCurrentSuggestion(result)
      }

      toast.success(feedback === 'success' ? 'Super ! Continuons.' : 'Nouvelle suggestion générée')

    } catch (error) {
      console.error('Feedback error:', error)
      toast.error('Erreur lors du feedback')
    }
  }

  const exportFindings = () => {
    const markdown = findings.map(f =>
      `## ${f.title}\n\n${f.description}\n\n**Impact:** ${f.impact}\n\n**Recommandation:** ${f.recommendation}\n\n---\n`
    ).join('\n')

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'findings'}-${new Date().toISOString()}.md`
    a.click()
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-gray-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-gray-700" />
                <h1 className="text-xl font-semibold text-[#202123]">{project?.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600">
                <Activity className="h-3 w-3 mr-1" />
                Session active
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={exportFindings}
                disabled={findings.length === 0}
              >
                Export Markdown
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Zone 1: Import */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#202123]">
                <Upload className="h-5 w-5" />
                Import HAR/Burp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Collez votre requête HAR ou Burp ici...

GET /api/payment/process HTTP/1.1
Host: example.com
Authorization: Bearer token123
..."
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />

              <Button
                onClick={analyzeRequest}
                disabled={!rawInput.trim() || isAnalyzing}
                className="w-full bg-[#202123] hover:bg-gray-800 text-white"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyser
                  </>
                )}
              </Button>

              {requests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Requêtes récentes :</p>
                  <div className="space-y-1">
                    {requests.slice(0, 3).map((req) => (
                      <div key={req.id} className="text-xs p-2 bg-gray-50 rounded">
                        <span className="font-semibold">{req.method}</span> {req.endpoint}
                        <div className="flex gap-1 mt-1">
                          {req.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zone 2: Chat Claude */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#202123]">
                <Send className="h-5 w-5" />
                Analyse Claude
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] overflow-y-auto space-y-3 mb-4 p-3 bg-[#F7F7F8] rounded">
                {claudeChat.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Importez une requête pour commencer l'analyse</p>
                  </div>
                ) : (
                  claudeChat.map((msg, idx) => (
                    <div key={idx} className="bg-white p-3 rounded shadow-sm">
                      <p className="text-sm whitespace-pre-wrap">{msg}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {currentSuggestion && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-2">Feedback :</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => provideFeedback('success')}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      Ça marche
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => provideFeedback('error')}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-1 text-red-600" />
                      Erreur
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => provideFeedback('partial')}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-1 text-orange-600" />
                      Partiel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zone 3: Résultats */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#202123]">
                <Target className="h-5 w-5" />
                Résultats & Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {findings.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">Aucune découverte pour le moment</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Les vulnérabilités apparaîtront ici
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {findings.map((finding, idx) => (
                      <div key={idx} className="p-3 bg-[#F7F7F8] rounded">
                        <h4 className="font-semibold text-sm mb-1">{finding.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">{finding.description}</p>
                        <Badge variant={
                          finding.severity === 'critical' ? 'destructive' :
                          finding.severity === 'high' ? 'destructive' :
                          finding.severity === 'medium' ? 'secondary' :
                          'outline'
                        }>
                          {finding.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">Statistiques session :</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Requêtes :</span>
                      <span className="ml-2 font-semibold">{requests.length}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Découvertes :</span>
                      <span className="ml-2 font-semibold">{findings.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}