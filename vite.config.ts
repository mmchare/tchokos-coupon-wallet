import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://xzilbjhrqbpedekuwghu.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6aWxiamhycWJwZWRla3V3Z2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjQ4ODAsImV4cCI6MjA4MDAwMDg4MH0.ZfnWBzl0WAyYbbEhW51tn6qJ7uaidfkMgt7zXUGNJ7I'),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify('xzilbjhrqbpedekuwghu'),
  },
}));
