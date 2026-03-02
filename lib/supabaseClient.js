import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ldpeyabqatzhgvcrhvmo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcGV5YWJxYXR6aGd2Y3Jodm1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTg2NzYsImV4cCI6MjA4NzQ3NDY3Nn0.ovAUzVfoOmJ_6idb9Ni-r_Z7nA7N8wDL0VIar4_ab1Y'

export const supabase = createClient(supabaseUrl, supabaseKey)