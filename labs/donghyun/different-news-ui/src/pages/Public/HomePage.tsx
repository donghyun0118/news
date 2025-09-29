import "../../App.css";
import TopicList from "../../components/TopicList";
import { useUserAuth } from "../../context/UserAuthContext";
import { Link } from "react-router-dom";

function HomePage() {
  const { user, logout } = useUserAuth();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Different News</h1>
        <p>Isn't wrong, just different</p>
        <div className="auth-links">
          {user ? (
            <>
              <div className="welcome-message">Welcome, {user.username}!</div>
              <button onClick={logout} className="auth-btn">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="auth-btn">Login</Link>
              <Link to="/signup" className="auth-btn">Signup</Link>
            </>
          )}
        </div>
      </header>
      <TopicList />
    </div>
  );
}

export default HomePage;
