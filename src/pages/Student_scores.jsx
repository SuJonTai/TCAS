import { useState, useEffect } from "react"
import { Save, BookOpen, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function StudentScores() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [userId, setUserId] = useState(null)

  const [subjects, setSubjects] = useState([]) // Stores the list of subjects from DB
  const [scores, setScores] = useState({})     // Stores the input values { subject_id: score_value }

  // 1. Fetch Subjects and User Scores on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // 1. Get the numeric ID from localStorage instead of Supabase Auth
        const storedUserId = localStorage.getItem("user_id")
        
        if (!storedUserId) {
          console.error("Not logged in or missing user_id")
          setLoading(false)
          return
        }

        // Convert it to a number just to be safe
        const numericUserId = parseInt(storedUserId, 10)
        setUserId(numericUserId)

        // A. Fetch all available subjects
        const { data: subjectsData, error: subError } = await supabase
          .from('SUBJECTS')
          .select('id, subject_name')
          .order('id')

        if (subError) throw subError
        setSubjects(subjectsData || [])

        // B. Fetch existing scores using the NUMERIC ID
        const { data: userScoresData, error: scoreError } = await supabase
          .from('USER_SCORES')
          .select('subject_id, score_value')
          .eq('user_id', numericUserId) // This is now a standard number!

        if (scoreError) throw scoreError

        // C. Map the existing scores into our state object: { "1": "85.50", "2": "90" }
        const currentScores = {}
        if (userScoresData) {
          userScoresData.forEach(item => {
            currentScores[item.subject_id] = item.score_value.toString()
          })
        }
        setScores(currentScores)

      } catch (err) {
        console.error("Error fetching data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 2. Handle Input Changes dynamically using subject_id
  const handleChange = (subjectId, value) => {
    // Only allow numbers and decimals
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setScores(prev => ({ ...prev, [subjectId]: value }))
    }
  }

  // 3. Save to Supabase (Delete old -> Insert new)
  const handleSaveScores = async (e) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    setShowSuccess(false)

    try {
      // Create an array of valid scores to insert
      // We filter out any empty strings so we don't save blank rows
      const currentYear = new Date().getFullYear() // You can adjust exam_year logic if needed
      
      const scoresToInsert = Object.entries(scores)
        .filter(([_, value]) => value !== "" && value !== null)
        .map(([subjectId, value]) => ({
          user_id: userId,
          subject_id: parseInt(subjectId),
          score_value: parseFloat(value),
          exam_year: currentYear
        }))

      // Step A: Clear out all old scores for this user to prevent duplicates
      const { error: deleteError } = await supabase
        .from('USER_SCORES')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      // Step B: Insert the new updated scores (if they filled any out)
      if (scoresToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('USER_SCORES')
          .insert(scoresToInsert)

        if (insertError) throw insertError
      }

      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

    } catch (err) {
      console.error(err)
      alert("เกิดข้อผิดพลาดในการบันทึกคะแนน: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" /> 
        กำลังโหลดข้อมูลวิชา...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          จัดการคะแนน TCAS
        </h1>
        <p className="text-muted-foreground mt-2">
          กรอกคะแนนสอบของคุณเพื่อใช้ประกอบการพิจารณาในการสมัครเข้าศึกษาต่อ
        </p>
      </div>

      <form onSubmit={handleSaveScores} className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        
        {/* DYNAMIC FORM GENERATION */}
        <div className="grid gap-6 sm:grid-cols-2">
          {subjects.length > 0 ? (
            subjects.map(subject => (
              <div key={subject.id} className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">
                  {subject.subject_name}
                </label>
                <input
                  type="text"
                  value={scores[subject.id] || ""}
                  onChange={(e) => handleChange(subject.id, e.target.value)}
                  placeholder="0.00"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center text-sm text-muted-foreground py-4">
              ไม่พบรายวิชาในระบบ กรุณาติดต่อผู้ดูแลระบบ
            </div>
          )}
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3 border border-blue-100">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            กรุณาตรวจสอบความถูกต้องของคะแนนให้ตรงกับระบบ ทปอ. (myTCAS) 
            หากพบว่ามีการกรอกข้อมูลเท็จ ทางมหาวิทยาลัยขอสงวนสิทธิ์ในการตัดสิทธิ์การเข้าศึกษา
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="h-6">
            {showSuccess && (
              <span className="flex items-center text-sm font-medium text-emerald-600 animate-in fade-in slide-in-from-left-2">
                <CheckCircle className="mr-2 h-4 w-4" />
                บันทึกข้อมูลคะแนนเรียบร้อยแล้ว
              </span>
            )}
          </div>
          
          <button
            type="submit"
            disabled={saving || subjects.length === 0}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "กำลังบันทึก..." : "บันทึกคะแนน"}
          </button>
        </div>
      </form>
    </div>
  )
}