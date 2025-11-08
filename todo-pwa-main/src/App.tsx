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
          <h1 className="hero-title">Organiza tus tareas, Organiza tu vida.</h1>
          <p className="hero-subtitle">
            To-Do Gestionar tareas de forma simple,
            rápida y accesible desde cualquier dispositivo.
          </p>
          <Link to="/login" className="btn btn-primary">
            Comenzar Ahora
          </Link>
        </div>
      </main>

      <footer className="footer">
        <p>&copy; 2025 To-Do</p>
      </footer>
    </div>
  );
}

export default App;
