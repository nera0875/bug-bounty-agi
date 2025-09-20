import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test de récupération des projets
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5)

    if (projectsError) {
      return NextResponse.json({
        success: false,
        error: 'Projects fetch error',
        details: projectsError
      }, { status: 500 })
    }

    // Test de création d'un projet
    const testProject = {
      name: `Test API ${new Date().toISOString()}`,
      description: 'Test depuis l\'API'
    }

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert([testProject])
      .select()
      .single()

    if (createError) {
      return NextResponse.json({
        success: false,
        error: 'Project creation error',
        details: createError,
        existingProjects: projects
      }, { status: 500 })
    }

    // Suppression du projet test
    if (newProject) {
      await supabase
        .from('projects')
        .delete()
        .eq('id', newProject.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      projectsCount: projects?.length || 0,
      testProjectCreated: !!newProject,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      keyUsed: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'from env' : 'from fallback'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : error
    }, { status: 500 })
  }
}