'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlusCircle, Target, Activity } from 'lucide-react'

interface Project {
  id: string
  name: string
  created_at: string
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setProjects(data)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim()) return

    setIsCreating(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: newProjectName })
      .select()
      .single()

    if (data && !error) {
      setProjects([data, ...projects])
      setNewProjectName('')
    }
    setIsCreating(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-gray-800" />
            <h1 className="text-3xl font-bold text-[#202123]">Bug Bounty AGI</h1>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-500">MVP v1.0</span>
          </div>
        </div>

        <div className="mb-8 bg-[#F7F7F8] rounded-lg p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nom du nouveau projet..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createProject()}
              className="bg-white border-gray-200"
            />
            <Button
              onClick={createProject}
              disabled={isCreating || !newProjectName.trim()}
              className="bg-[#202123] hover:bg-gray-800 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Créer
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Aucun projet</h2>
            <p className="text-gray-500">Créez votre premier projet pour commencer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-[#202123]">{project.name}</CardTitle>
                    <CardDescription>
                      Créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>0 requêtes</span>
                      <span className="text-green-600">Actif</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
