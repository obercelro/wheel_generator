const supabaseUrl = 'https://epxtpexfozbwdfmokdrp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVweHRwZXhmb3pid2RmbW9rZHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMTUzNDIsImV4cCI6MjA2OTU5MTM0Mn0.Hv-RmjrWhO1a8lE_AkVzYnPZ6IXYBrJSOGoFjQg7HJQ';
export let supabase = null;

export function initSupabase() {
  try {
    if (window.supabase) {
      supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
      console.log('Supabase initialized successfully');
    } else {
      console.error('Supabase library not loaded');
    }
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
}

export async function saveWheelToSupabase(wheelData, name) {
  if (!supabase) throw new Error('Supabase not initialized.');
  try {
    const { data, error } = await supabase.from('wheels').insert([
      { name, wheel_data: wheelData, created_at: new Date().toISOString() },
    ]);
    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Failed to save wheel: ${error.message}`);
  }
}

export async function loadWheelsFromSupabase() {
  if (!supabase) throw new Error('Supabase not initialized.');
  try {
    const { data, error } = await supabase
      .from('wheels')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((wheel) => ({ id: wheel.id, name: wheel.name, data: wheel.wheel_data }));
  } catch (error) {
    throw new Error(`Failed to load wheels: ${error.message}`);
  }
}
