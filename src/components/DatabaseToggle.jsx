import { useDatabase } from '@/context/DatabaseContext';

export function DatabaseToggle() {
  const { dbType, setDbType } = useDatabase();
  console.log("Current DB Type:", dbType); // Debugging line to check current value

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="db-select" className="text-sm font-medium text-muted-foreground">
        Database:
      </label>
      <select
        id="db-select"
        value={dbType}
        onChange={(e) => setDbType(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
      >
        <option value="supabase">Supabase (BaaS)</option>
        <option value="sqlserver">SQL Server (Cloud)</option>
      </select>
    </div>
  );
}