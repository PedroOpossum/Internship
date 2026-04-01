import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { View } from 'react-native'
import { supabase } from './lib/Supabase'
import { Session } from '@supabase/supabase-js'
import Auth from './Components/Auth'
import Dashboard from "./Components/Dashboard"
import "./global.css"

export default function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <View className = "flex flex-col min-h-screen w-full justify-center">
      {session ? <Dashboard /> : <Auth />}
    </View>
  )
}