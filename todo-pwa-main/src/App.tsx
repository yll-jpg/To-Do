import { Link } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <div className="landing-page container">
      <header className="navbar">
        <div className="logo">To-Do</div>
        <nav>
          <Link to="/login" className="btn btn-secondary">
            Iniciar Sesión
          </Link>
        </nav>
      </header>

      <main className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Empieza hoy, organiza tu mañana.</h1>
          <p className="hero-subtitle">
            ¡Planifica y completa tus tareas fácilmente, desde cualquier lugar y en cualquier momento!
          </p>
          <Link to="/login" className="btn btn-primary">
            Comenzar Ahora
          </Link>
        </div>
      </main>

      <footer className="footer">
        <p>&copy; 2025 To-Do </p>
      </footer>
    </div>
  );
}

export default App;
