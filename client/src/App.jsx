import { lazy, Suspense, useLayoutEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { SiteLayout } from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { Loading } from "./components/Feedback.jsx";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage.jsx"));
const TopicPage = lazy(() => import("./pages/TopicPage.jsx"));
const LessonPage = lazy(() => import("./pages/LessonPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const AdminContentPage = lazy(() => import("./pages/AdminPage.jsx").then(module => ({ default: module.AdminContentPage })));
const AdminUsersPage = lazy(() => import("./pages/AdminPage.jsx").then(module => ({ default: module.AdminUsersPage })));

function Private({ children, admin = false, studentOnly = false }) {
  return <ProtectedRoute admin={admin} studentOnly={studentOnly}>{children}</ProtectedRoute>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return <div className="min-h-screen"><ScrollToTop/><SiteLayout><Suspense fallback={<main className="page-shell"><Loading/></main>}><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/:roadmapSlug" element={<RoadmapPage/>}/>
    <Route path="/:roadmapSlug/:topicSlug" element={<TopicPage/>}/>
    <Route path="/:roadmapSlug/:topicSlug/:itemSlug" element={<LessonPage/>}/>
    <Route path="/login" element={<AuthPage mode="login"/>}/>
    <Route path="/signup" element={<AuthPage mode="signup"/>}/>
    <Route path="/dashboard" element={<Private studentOnly><DashboardPage/></Private>}/>
    <Route path="/profile" element={<Private><ProfilePage/></Private>}/>
    <Route path="/admin" element={<Private admin><AdminPage/></Private>}/>
    <Route path="/admin/content/:type" element={<Private admin><AdminContentPage/></Private>}/>
    <Route path="/admin/users" element={<Private admin><AdminUsersPage/></Private>}/>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes></Suspense></SiteLayout></div>;
}
