'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Target, Lock, Mail, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setError('Vérifiez votre email pour confirmer votre inscription!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="container max-w-md px-4">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Target className="h-10 w-10 text-gray-800" />
          <h1 className="text-4xl font-bold text-[#202123]">Bug Bounty AGI</h1>
        </div>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-2xl text-[#202123]">
              {isSignUp ? 'Créer un compte' : 'Se connecter'}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? 'Créez votre compte pour accéder à Bug Bounty AGI'
                : 'Connectez-vous pour accéder à vos projets'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white border-gray-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white border-gray-200"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#202123] hover:bg-gray-800 text-white"
              >
                {isLoading
                  ? 'Chargement...'
                  : isSignUp ? 'Créer le compte' : 'Se connecter'
                }
              </Button>

              <div className="text-center text-sm text-gray-500">
                {isSignUp ? 'Déjà un compte ?' : "Pas encore de compte ?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError('')
                  }}
                  className="ml-1 text-[#202123] hover:underline"
                >
                  {isSignUp ? 'Se connecter' : "S'inscrire"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-8">
          © 2025 Bug Bounty AGI - MVP v1.0
        </p>
      </div>
    </div>
  )
}