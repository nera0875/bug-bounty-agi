import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function POST(req: NextRequest) {
  try {
    const { sessionId, feedback, suggestion } = await req.json()

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    // Get session history
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('claude_history')
      .eq('id', sessionId)
      .single()

    if (!session) {
      throw new Error('Session not found')
    }

    // Prepare feedback prompt for Claude
    const feedbackPrompt = `Previous suggestion:
${suggestion.suggestion}

User feedback: ${feedback}
${feedback === 'success' ? 'The suggestion worked! Provide a follow-up test to go deeper.' :
  feedback === 'error' ? 'The suggestion failed. Provide an alternative approach.' :
  'The suggestion partially worked. Refine the approach and provide next steps.'}

Based on this feedback, provide a new testing suggestion that:
1. ${feedback === 'success' ? 'Exploits the vulnerability further' : 'Takes a different approach'}
2. Remains concise and actionable
3. Includes specific payloads or modifications
4. Focuses on discovering impactful vulnerabilities`

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      messages: [
        { role: 'user', content: feedbackPrompt }
      ]
    })

    const newSuggestion = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : ''

    // Update session with new suggestion
    const updatedHistory = [...(session.claude_history || []), newSuggestion]

    await supabaseAdmin
      .from('sessions')
      .update({
        claude_history: updatedHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return NextResponse.json({
      newSuggestion,
      feedback: 'recorded'
    })

  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Feedback processing failed' },
      { status: 500 }
    )
  }
}