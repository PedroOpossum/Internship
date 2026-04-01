import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Text, View, Pressable, TextInput, ScrollView, Modal, Dimensions, Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { DndProvider, Draggable, Droppable, DndProviderProps } from '@mgcrea/react-native-dnd'
import { Picker } from '@react-native-picker/picker' 
import { supabase } from '../lib/Supabase'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const COL_WIDTH = (SCREEN_WIDTH - 48 - 20) / 3

type Priority = 'low' | 'medium' | 'high'
type Status = 'todo' | 'in_progress' | 'done'

interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  due_date?: string
  status: Status
  created_at: string
  user_id: string
}

const COLUMNS = [
  { id: 'todo', label: 'To Do', topBorder: 'border-t-violet-500', countColor: 'text-violet-400' },
  { id: 'in_progress', label: 'In Progress', topBorder: 'border-t-amber-400', countColor: 'text-amber-400' },
  { id: 'done', label: 'Done', topBorder: 'border-t-emerald-400', countColor: 'text-emerald-400' },
] as const

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  high: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
}

/* ---------------- Task Card ---------------- */
const TaskCard = React.memo(({ task }: { task: Task }) => (
  <View className="bg-gray-800 rounded-lg p-4 border border-white/5 mb-3">
    <Text className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${PRIORITY_STYLES[task.priority]}`}>
      {task.priority}
    </Text>

    <Text className="text-sm font-semibold text-gray-100 mb-1">
      {task.title}
    </Text>

    {task.description && (
      <Text className="text-xs text-gray-500 mb-2">
        {task.description}
      </Text>
    )}

    {task.due_date && (
      <Text className="text-xs text-gray-600">
        ◷ {new Date(task.due_date).toLocaleDateString()}
      </Text>
    )}
  </View>
))

/* ---------------- Column ---------------- */
const Column = React.memo(({ col, tasks }: any) => {
  return (
    <View
      style={{ width: COL_WIDTH, minHeight: 400 }}
      className={`bg-gray-900 rounded-xl border border-white/5 border-t-2 ${col.topBorder} p-4`}
    >
      {/* Header */}
      <View className="flex flex-row items-center mb-4 pb-3 border-b border-white/5">
        <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex-1">
          {col.label}
        </Text>
        <Text className={`text-sm font-bold ${col.countColor}`}>
          {tasks.length}
        </Text>
      </View>

      <Droppable id={col.id} style={{ flex: 1 }}>
        <View style={{ flex: 1, minHeight: 300 }}>

          {tasks.length === 0 && (
            <View className="py-10 border-2 border-dashed border-white/5 rounded-lg items-center">
              <Text className="text-gray-700 text-sm italic">Drop tasks here</Text>
            </View>
          )}

          {tasks.map((task: Task) => (
            <Draggable key={task.id} id={task.id}>
              <TaskCard task={task} />
            </Draggable>
          ))}

        </View>
      </Droppable>
    </View>
  )
})


/* ---------------- Main ---------------- */
export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    due_date: '',
  })
  const [formError, setFormError] = useState('')
  const titleRef = useRef<TextInput>(null)

  useEffect(() => { fetchTasks() }, [])
  useEffect(() => { if (showForm) titleRef.current?.focus() }, [showForm])

  /* -------- Fetch -------- */
  async function fetchTasks() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setTasks(data || [])
    setLoading(false)
  }

  /* -------- Create -------- */
  async function createTask() {
    if (!form.title.trim()) {
      setFormError('Title required')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...form,
        status: 'todo',
        user_id: user.id,
      })
      .select()
      .single()

    if (error) setFormError(error.message)
    else {
      setTasks(prev => [data, ...prev])
      setShowForm(false)
      setForm({ title: '', description: '', priority: 'medium', due_date: '' })
    }

    setSaving(false)
  }

  /* -------- Update -------- */
  async function updateTaskStatus(taskId: string, newStatus: Status, oldStatus: Status) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) {
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, status: oldStatus } : t
        )
      )
      setError('Update failed')
    }
  }

  /* -------- Drag -------- */
  const handleDragEnd: DndProviderProps['onDragEnd'] = ({ active, over }) => {
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as Status

    setTasks(prev => {
      const task = prev.find(t => t.id === taskId)
      if (!task || task.status === newStatus) return prev

      updateTaskStatus(taskId, newStatus, task.status)

      return prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    })
  }

  
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }
  
  /* -------- Group Tasks -------- */
  const groupedTasks = useMemo(() => {
    const grouped = { todo: [], in_progress: [], done: [] } as Record<Status, Task[]>
    tasks.forEach(t => grouped[t.status].push(t))
    return grouped
  }, [tasks])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DndProvider onDragEnd={handleDragEnd}>

        <View className="flex-1">

          {/* Header */}
          <View className="items-center py-4">
            <Text className="text-3xl font-bold">Dashboard</Text>

              <Pressable onPress={handleLogout} className="bg-red-600 px-6 py-2 mt-3 rounded top-0 right-0 mr-20 absolute">
              <Text className="text-white text-lg">Logout</Text>
            </Pressable>
       

            <Pressable onPress={() => setShowForm(true)} className="bg-violet-600 px-6 py-2 mt-3 rounded">
              <Text className="text-white">+ New Task</Text>
            </Pressable>
          </View>

          {/* Board */}
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {loading ? (
              <Text>Loading...</Text>
            ) : (
              <View style={{ flexDirection: Platform.OS !== 'web' ? 'column' : 'row', gap:10}}>
                {COLUMNS.map(col => (
                  <Column key={col.id} col={col} tasks={groupedTasks[col.id]} />
                ))}
              </View>
            )}
          </ScrollView>

  {/* Modal */}
  <Modal visible={showForm} transparent animationType="fade">
  <View className="flex-1 bg-black/60 items-center justify-center px-4">
    <View className="bg-gray-900 border border-white/10 rounded-2xl p-7 w-full max-w-md">
      
      {/* Header */}
      <View className="flex flex-row items-center justify-between mb-6">
        <Text className="text-lg font-bold text-white">New Task</Text>
        <Pressable onPress={() => setShowForm(false)}>
          <Text className="text-gray-500 text-xl">✕</Text>
        </Pressable>
      </View>

      {/* Title */}
      <Text className="text-gray-500 mb-1">Title *</Text>
      <TextInput
        ref={titleRef}
        className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white mb-4"
        placeholder="What needs to be done?"
        placeholderTextColor="#666"
        value={form.title}
        onChangeText={text => setForm(f => ({ ...f, title: text }))}
      />

      {/* Description */}
      <Text className="text-gray-500 mb-1">Description</Text>
      <TextInput
        multiline
        numberOfLines={3}
        className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white mb-4"
        placeholder="Add some details…"
        placeholderTextColor="#666"
        value={form.description}
        onChangeText={text => setForm(f => ({ ...f, description: text }))}
      />

      {/* Priority & Due Date */}
      <View className="flex flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className="text-gray-500 mb-1">Priority</Text>
          <View className="bg-gray-800 border border-white/10 rounded-lg">
            <Picker
              selectedValue={form.priority}
              onValueChange={value => setForm(f => ({ ...f, priority: value }))}
              dropdownIconColor="#fff"
            >
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="High" value="high" />
            </Picker>
          </View>
        </View>

        <View className="flex-1">
          <Text className="text-gray-500 mb-1">Due Date</Text>
          <TextInput
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white"
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
            value={form.due_date}
            onChangeText={text => setForm(f => ({ ...f, due_date: text }))}
          />
        </View>
      </View>

      {/* Error */}
      {formError && <Text className="text-red-400 text-xs mb-3">{formError}</Text>}

      {/* Buttons */}
      <View className="flex flex-row gap-3 justify-end">
        <Pressable onPress={() => setShowForm(false)}>
          <Text className="text-gray-400 text-sm px-5 py-2">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={createTask}
          disabled={saving}
          className={`bg-violet-600 px-5 py-2 rounded-lg ${saving ? 'opacity-50' : ''}`}
        >
          <Text className="text-white text-sm">{saving ? 'Creating…' : 'Create Task'}</Text>
        </Pressable>
      </View>

    </View>
  </View>
</Modal>

          </View>

      </DndProvider>
    </GestureHandlerRootView>
  )
}