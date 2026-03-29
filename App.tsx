import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { supabase } from './lib/Supabase'
import { Session } from '@supabase/supabase-js'
import Auth from './Components/Auth'
import Dashboard from "./Components/Dashboard";
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import "./global.css"

export default function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <View style={{ padding: 20 }}>
      <Auth />
    
      {session ? (
        <Text className="text-lg font-bold text-cyan-600">User ID: {session.user.id}</Text>
      ) : (
        <Text>Not logged in</Text>
      )}
    </View>
  )
}