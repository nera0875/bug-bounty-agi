import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function POST(req: NextRequest) {
  try {
    const { projectId, sessionId, requestId, rawText, parsedRequest } = await req.json()

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    // Generate embedding with OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: rawText,
    })

    const embedding = embeddingResponse.data[0].embedding

    // Update request with embedding
    await supabaseAdmin
      .from('requests')
      .update({ embedding })
      .eq('id', requestId)

    // Find similar requests
    const { data: similarRequests } = await supabaseAdmin
      .rpc('match_requests', {
        query_embedding: embedding,
        match_count: 20,
        p_project_id: projectId
      })

    // Prepare context for Claude
    const context = similarRequests?.map((r: any) =>
      `${r.method} ${r.endpoint} - Tags: ${r.tags.join(', ')} - Params: ${Object.keys(r.params || {}).join(', ')}`
    ).join('\n')

    // Call Claude for analysis
    const claudePrompt = `You are a bug bounty expert analyzing HTTP requests for security vulnerabilities.

Current Request:
${parsedRequest.method} ${parsedRequest.endpoint}
Parameters: ${JSON.stringify(parsedRequest.params, null, 2)}
Tags: ${parsedRequest.tags.join(', ')}

Similar Requests Context:
${context || 'No similar requests found'}

Analyze this request for potential business logic flaws, security vulnerabilities, and testing opportunities.
Focus on:
1. Parameter manipulation possibilities
2. Authentication/Authorization bypass
3. Business logic flaws
4. IDOR vulnerabilities
5. Rate limiting issues

Provide a concise, actionable suggestion for the bug bounty hunter.
Format your response as a clear, step-by-step testing approach.
Include specific payloads or parameter modifications to try.`

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        { role: 'user', content: claudePrompt }
      ]
    })

    const suggestion = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : ''

    // Extract potential findings
    const findings = extractFindings(suggestion, parsedRequest)

    // Update session
    if (sessionId) {
      const { data: session } = await supabaseAdmin
        .from('sessions')
        .select('claude_history, findings')
        .eq('id', sessionId)
        .single()

      const updatedHistory = [...(session?.claude_history || []), suggestion]
      const updatedFindings = [...(session?.findings || []), ...findings]

      await supabaseAdmin
        .from('sessions')
        .update({
          claude_history: updatedHistory,
          findings: updatedFindings,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    }

    return NextResponse.json({
      suggestion,
      findings,
      similarRequests: similarRequests?.length || 0
    })

  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}

function extractFindings(suggestion: string, parsedRequest: any) {
  const findings = []

  // Simple pattern matching for common vulnerability mentions
  if (suggestion.toLowerCase().includes('idor')) {
    findings.push({
      title: 'Potential IDOR Vulnerability',
      description: `Endpoint ${parsedRequest.endpoint} may be vulnerable to IDOR attacks`,
      severity: 'high',
      impact: 'Unauthorized access to resources'
    })
  }

  if (suggestion.toLowerCase().includes('auth')) {
    findings.push({
      title: 'Authentication/Authorization Issue',
      description: `Authentication bypass might be possible on ${parsedRequest.endpoint}`,
      severity: 'critical',
      impact: 'Unauthorized access'
    })
  }

  if (suggestion.toLowerCase().includes('injection') || suggestion.toLowerCase().includes('sqli')) {
    findings.push({
      title: 'Injection Vulnerability',
      description: `Parameters may be vulnerable to injection attacks`,
      severity: 'critical',
      impact: 'Data breach or system compromise'
    })
  }

  return findings
}