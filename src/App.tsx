import { useEffect } from 'react'
import { useRoute } from './hooks/useRoute'
import { routePath } from './lib/router'
import Home from './pages/Home'
import ModuleRead from './pages/ModuleRead'
import ModuleQuiz from './pages/ModuleQuiz'
import Exam from './pages/Exam'
import ExamResults from './pages/ExamResults'
import ProgressPage from './pages/ProgressPage'
import NotFound from './pages/NotFound'

export default function App() {
  const route = useRoute()
  const path = routePath(route)
  useEffect(() => { if (route.name !== 'module') window.scrollTo(0, 0) }, [path]) // eslint-disable-line react-hooks/exhaustive-deps
  switch (route.name) {
    case 'home': return <Home />
    case 'module': return <ModuleRead id={route.id} />
    case 'quiz': return <ModuleQuiz id={route.id} />
    case 'exam': return <Exam />
    case 'examResults': return <ExamResults />
    case 'progress': return <ProgressPage />
    default: return <NotFound />
  }
}
