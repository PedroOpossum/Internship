import React, { useState } from 'react'
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, Dimensions } from 'react-native'
import { supabase } from '../lib/Supabase'
 
const { width } = Dimensions.get('window')
 
export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
 
  async function signInWithEmail() {
    setLoading(true)
    await supabase.auth.signOut()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert(error.message)
    setLoading(false)
  }
 
  async function signUpWithEmail() {
    setLoading(true)
    const { data: { session }, error } = await supabase.auth.signUp({ email, password })
    if (error) Alert.alert(error.message)
    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }
 
  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Email</Text>
        <TextInput onChangeText={setEmail} value={email} placeholder="email@address.com" autoCapitalize="none" style={styles.input} />
      </View>
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Password</Text>
        <TextInput onChangeText={setPassword} value={password} secureTextEntry placeholder="Password" autoCapitalize="none" style={styles.input} />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={signInWithEmail} disabled={loading}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.verticallySpaced}>
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={signUpWithEmail} disabled={loading}>
          <Text style={styles.buttonText}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
 
const inputWidth = width > 600 ? 550 : width * 0.9
 
const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  verticallySpaced: { paddingTop: 12, paddingBottom: 12 },
  mt20: { marginTop: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#86939e', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#86939e', borderRadius: 4, padding: 12, fontSize: 16, width: inputWidth },
  button: { backgroundColor: '#2089dc', borderRadius: 4, padding: 12, alignItems: 'center', justifyContent: 'center', width: inputWidth },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 20, fontWeight: '500', color: 'white' },
})